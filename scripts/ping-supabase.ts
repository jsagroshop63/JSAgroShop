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
const anon = env.VITE_SUPABASE_ANON_KEY
if (!url || !anon) {
  console.error('missing_url_or_anon')
  process.exit(1)
}

const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
const landing = await supabase.from('landing_content').select('id').limit(1)
const media = await supabase.from('landing_media').select('id').limit(1)
const products = await supabase.from('products').select('id').limit(1)
const settings = await supabase.from('site_settings').select('id').limit(1)
const listed = await supabase.storage.from('media').list('', { limit: 1 })
const landingRow = await supabase
  .from('landing_content')
  .select('hero_title,offer_title,offer_price,offer_media_ids,package_title,story_title,updated_at')
  .eq('id', 1)
  .maybeSingle()
const mediaCount = await supabase.from('landing_media').select('id', { count: 'exact', head: true })
const mediaRows = await supabase.from('landing_media').select('id,type,title,url,sort_order').order('sort_order')
console.log(`url_host=${new URL(url).host}`)
console.log(landing.error ? `landing: ${landing.error.message}` : 'landing: ok')
console.log(media.error ? `media: ${media.error.message}` : 'media: ok')
console.log(products.error ? `products: ${products.error.message}` : 'products: ok')
console.log(settings.error ? `settings: ${settings.error.message}` : 'settings: ok')
console.log(listed.error ? `storage_list: ${listed.error.message}` : `storage_list: ok (${listed.data?.length ?? 0})`)
console.log(`landing_row: ${landingRow.data ? JSON.stringify(landingRow.data) : 'none'}`)
console.log(`media_count: ${mediaCount.count ?? 0}`)
console.log(
  `media_items: ${JSON.stringify(
    (mediaRows.data ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      local: String(row.url ?? '').startsWith('/images/'),
    })),
  )}`,
)
