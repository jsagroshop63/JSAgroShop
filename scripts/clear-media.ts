import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

function loadEnvLocal() {
  const text = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  const env: Record<string, string> = {}
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index === -1) continue
    env[trimmed.slice(0, index)] = trimmed.slice(index + 1)
  }
  return env
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function retry<T>(label: string, times: number, task: () => Promise<T>): Promise<T> {
  let last: unknown
  for (let i = 1; i <= times; i++) {
    try {
      const value = await task()
      console.log(`${label}: ok`)
      return value
    } catch (error) {
      last = error
      const message = error instanceof Error ? error.message : String(error)
      console.log(`${label}: try ${i}/${times} — ${message}`)
      if (i < times) await sleep(8000)
    }
  }
  throw last
}

const env = loadEnvLocal()
const url = env.VITE_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
const adminEmail = env.VITE_ADMIN_EMAIL || 'jsagroshop63@gmail.com'
const adminPassword = env.VITE_ADMIN_PASSWORD || 'admin123'

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

async function listPaths(prefix = ''): Promise<string[]> {
  const { data, error } = await supabase.storage.from('media').list(prefix, { limit: 1000, offset: 0 })
  if (error) throw new Error(error.message)
  const paths: string[] = []
  for (const item of data ?? []) {
    const full = prefix ? `${prefix}/${item.name}` : item.name
    if (!item.name) continue
    if (item.id === null) {
      paths.push(...(await listPaths(full)))
      continue
    }
    paths.push(full)
  }
  return paths
}

async function emptyMediaBucket() {
  const paths = await listPaths()
  if (!paths.length) {
    console.log('storage: already empty')
    return
  }
  for (let i = 0; i < paths.length; i += 100) {
    const chunk = paths.slice(i, i + 100)
    const { error } = await supabase.storage.from('media').remove(chunk)
    if (error) throw new Error(error.message)
  }
  console.log(`storage: deleted ${paths.length} files`)
}

async function clearTables() {
  const media = await supabase.from('landing_media').delete().neq('id', '')
  if (media.error) throw new Error(media.error.message)
  const landing = await supabase.from('landing_content').update({ offer_media_ids: [] }).eq('id', 1)
  if (landing.error) throw new Error(landing.error.message)
}

async function ensureAdmin() {
  const users = await supabase.auth.admin.listUsers({ perPage: 200 })
  if (users.error) throw new Error(users.error.message)
  const existing = users.data.users.find((user) => user.email?.toLowerCase() === adminEmail.toLowerCase())
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: adminPassword,
      email_confirm: true,
    })
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
  })
  if (error) throw new Error(error.message)
}

try {
  await retry('tables', 6, clearTables)
  await retry('storage', 6, emptyMediaBucket)
  await retry('admin-login', 4, ensureAdmin)
  console.log('cleared_like_new')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  console.log('still_busy_try_when_supabase_is_green')
  process.exit(1)
}
