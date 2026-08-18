import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { seedLanding } from '../src/lib/seed.ts'

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
const email = env.VITE_ADMIN_EMAIL || 'jsagroshop63@gmail.com'
const password = env.VITE_ADMIN_PASSWORD || 'admin123'
if (!url || !anon) {
  console.error('missing_url_or_anon')
  process.exit(1)
}

const supabase = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
let login = await supabase.auth.signInWithPassword({ email, password })
if (login.error || !login.data.session) {
  const created = await supabase.auth.signUp({ email, password })
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    console.error(`signup_failed: ${created.error.message}`)
    process.exit(1)
  }
  login = await supabase.auth.signInWithPassword({ email, password })
}
if (login.error || !login.data.session) {
  console.error(`login_failed: ${login.error?.message || 'no session'}`)
  process.exit(1)
}

const landing = await supabase.from('landing_content').upsert({
  id: 1,
  hero_title: seedLanding.heroTitle,
  hero_subtitle: seedLanding.heroSubtitle,
  package_title: seedLanding.packageTitle,
  package_items: seedLanding.packageItems,
  story_title: seedLanding.storyTitle,
  story_body: seedLanding.storyBody,
  why_title: seedLanding.whyTitle,
  why_items: seedLanding.whyItems,
  payment_title: seedLanding.paymentTitle,
  payment_number: seedLanding.paymentNumber,
  payment_note: seedLanding.paymentNote,
  offer_product_id: seedLanding.offerProductId,
  offer_title: seedLanding.offerTitle,
  offer_price: seedLanding.offerPrice,
  offer_compare_price: seedLanding.offerComparePrice,
  offer_media_ids: [],
  meta_pixel_id: seedLanding.metaPixelId,
  cta_label: seedLanding.ctaLabel,
  checkout_title: seedLanding.checkoutTitle,
  help_title: seedLanding.helpTitle,
  help_subtitle: seedLanding.helpSubtitle,
  checkout_billing_title: seedLanding.checkoutBillingTitle,
  checkout_order_title: seedLanding.checkoutOrderTitle,
  checkout_submit_label: seedLanding.checkoutSubmitLabel,
  checkout_cod_note: seedLanding.checkoutCodNote,
  updated_at: new Date().toISOString(),
})
if (landing.error) {
  console.error(`landing: ${landing.error.message}`)
  process.exit(1)
}

const media = await supabase.from('landing_media').select('id')
if (media.error) {
  console.error(`media_list: ${media.error.message}`)
  process.exit(1)
}
const ids = (media.data ?? []).map((row) => row.id)
if (ids.length) {
  const deleted = await supabase.from('landing_media').delete().in('id', ids)
  if (deleted.error) {
    console.error(`media_delete: ${deleted.error.message}`)
    process.exit(1)
  }
}

const check = await supabase
  .from('landing_content')
  .select('offer_title,offer_price')
  .eq('id', 1)
  .maybeSingle()
console.log(`offer: ${check.data?.offer_title} / ${check.data?.offer_price}`)
console.log('restored_live_offer')
