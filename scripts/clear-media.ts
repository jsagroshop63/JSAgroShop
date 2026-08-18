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
  if (error) throw error
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
    if (error) throw error
  }
  console.log(`storage: deleted ${paths.length} files`)
}

const media = await supabase.from('landing_media').delete().neq('id', '')
console.log(media.error ? `landing_media: ${media.error.message}` : 'landing_media: cleared')

const landing = await supabase.from('landing_content').update({ offer_media_ids: [] }).eq('id', 1)
console.log(landing.error ? `landing_content: ${landing.error.message}` : 'landing_content: offer photos cleared')

try {
  await emptyMediaBucket()
} catch (error) {
  console.log(`storage: ${error instanceof Error ? error.message : 'clear failed'}`)
}

const users = await supabase.auth.admin.listUsers({ perPage: 200 })
if (users.error) {
  console.log(`auth: ${users.error.message}`)
} else {
  const existing = users.data.users.find((user) => user.email?.toLowerCase() === adminEmail.toLowerCase())
  if (existing) {
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: adminPassword,
      email_confirm: true,
    })
    console.log(error ? `auth: ${error.message}` : 'auth: admin password ready')
  } else {
    const { error } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    })
    console.log(error ? `auth: ${error.message}` : 'auth: admin user created')
  }
}

console.log('media_cleared')
