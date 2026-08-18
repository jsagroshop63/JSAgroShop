import type {
  CarouselSlide,
  LandingContent,
  LandingMedia,
  Order,
  Product,
  SiteContent,
  StoreSnapshot,
} from './types'
import { ensureAdminSession } from './adminSession'
import { pauseCmsPoll, resumeCmsPoll } from './cmsSync'
import { isSupabaseEnabled, supabase } from './supabase'
import { customersFromOrders } from './localStore'
import { normalizeLanding, normalizeSite, seedLanding, seedSite } from './seed'

function fail(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function missingColumn(message: string) {
  const match =
    message.match(/could not find the '([^']+)' column/i) ||
    message.match(/column "([^"]+)" of relation/i) ||
    message.match(/column "([^"]+)" does not exist/i)
  return match?.[1] ?? ''
}

async function upsertLandingRow(payload: Record<string, unknown>) {
  if (!supabase) return
  const body = { ...payload }
  for (let i = 0; i < 25; i++) {
    const { error } = await supabase.from('landing_content').upsert(body)
    if (!error) return
    const column = missingColumn(error.message)
    if (column && column in body) {
      delete body[column]
      continue
    }
    fail(error)
  }
}

async function requireAdminSession() {
  await ensureAdminSession()
}

function asStringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) return parsed.map((item) => String(item))
    } catch {
      return value.split('\n')
    }
  }
  return []
}

function asProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    headline: String(row.headline ?? ''),
    description: String(row.description ?? ''),
    price: Number(row.price),
    comparePrice: row.compare_price == null ? null : Number(row.compare_price),
    image: String(row.image),
    gallery: Array.isArray(row.gallery) ? (row.gallery as string[]) : [],
    category: String(row.category ?? ''),
    stock: Number(row.stock ?? 0),
    featured: Boolean(row.featured),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

export function asOrder(row: Record<string, unknown>): Order {
  const rawItems = Array.isArray(row.items) ? row.items : []
  return {
    id: String(row.id),
    items: rawItems.map((item) => {
      const rowItem = item as Record<string, unknown>
      return {
        productId: String(rowItem.productId ?? rowItem.product_id ?? ''),
        name: String(rowItem.name ?? ''),
        image: String(rowItem.image ?? ''),
        price: Number(rowItem.price ?? 0),
        quantity: Number(rowItem.quantity ?? 0),
      }
    }),
    customerName: String(row.customer_name),
    phone: String(row.phone),
    address: String(row.address),
    district: String(row.district),
    shippingType: row.shipping_type === 'upazila' ? 'upazila' : row.shipping_type === 'home' ? 'home' : 'district',
    shippingFee: Number(row.shipping_fee),
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    status: (row.status as Order['status']) ?? 'pending',
    notes: String(row.notes ?? ''),
    source: String(row.source ?? ''),
    campaign: String(row.campaign ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  }
}

function asSlide(row: Record<string, unknown>): CarouselSlide {
  return {
    id: String(row.id),
    image: String(row.image),
    title: String(row.title ?? ''),
    subtitle: String(row.subtitle ?? ''),
    ctaText: String(row.cta_text ?? ''),
    ctaLink: String(row.cta_link ?? '/'),
    sortOrder: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
  }
}

function asMedia(row: Record<string, unknown>): LandingMedia {
  return {
    id: String(row.id),
    type: row.type === 'video' ? 'video' : 'image',
    url: String(row.url),
    title: String(row.title ?? ''),
    caption: String(row.caption ?? ''),
    sortOrder: Number(row.sort_order ?? 0),
    active: row.active !== false && row.active !== 0 && String(row.active) !== 'false',
  }
}

function asLanding(row: Record<string, unknown>): LandingContent {
  const landing = normalizeLanding({
    heroTitle: String(row.hero_title ?? ''),
    heroSubtitle: String(row.hero_subtitle ?? ''),
    packageTitle: String(row.package_title ?? ''),
    packageItems: asStringList(row.package_items),
    storyTitle: String(row.story_title ?? ''),
    storyBody: String(row.story_body ?? ''),
    whyTitle: String(row.why_title ?? ''),
    whyItems: asStringList(row.why_items),
    paymentTitle: String(row.payment_title ?? ''),
    paymentNumber: String(row.payment_number ?? ''),
    paymentNote: String(row.payment_note ?? ''),
    offerProductId: String(row.offer_product_id ?? 'prod_landing_offer'),
    offerTitle: String(row.offer_title ?? ''),
    offerPrice: Number(row.offer_price ?? 0),
    offerComparePrice: row.offer_compare_price == null ? null : Number(row.offer_compare_price),
    offerMediaIds: asStringList(row.offer_media_ids),
    metaPixelId: String(row.meta_pixel_id ?? ''),
    ctaLabel: String(row.cta_label ?? ''),
    checkoutTitle: String(row.checkout_title ?? ''),
    helpTitle: String(row.help_title ?? ''),
    helpSubtitle: String(row.help_subtitle ?? ''),
    checkoutBillingTitle: String(row.checkout_billing_title ?? ''),
    checkoutOrderTitle: String(row.checkout_order_title ?? ''),
    checkoutSubmitLabel: String(row.checkout_submit_label ?? ''),
    checkoutCodNote: String(row.checkout_cod_note ?? ''),
  })
  if (!landing.offerTitle.trim() && !landing.heroTitle.trim() && !landing.packageItems.length) {
    return seedLanding
  }
  return landing
}

function asSite(row: Record<string, unknown>): SiteContent {
  return normalizeSite({
    name: String(row.name ?? ''),
    nameEn: String(row.name_en ?? ''),
    slogan: String(row.slogan ?? ''),
    tagline: String(row.tagline ?? ''),
    about: String(row.about ?? ''),
    phone: String(row.phone ?? ''),
    phone2: String(row.phone2 ?? ''),
    email: String(row.email ?? ''),
    address: String(row.address ?? ''),
    hours: String(row.hours ?? ''),
    facebook: String(row.facebook ?? ''),
    homeBannerTitle: String(row.home_banner_title ?? ''),
    homeBannerCta: String(row.home_banner_cta ?? ''),
    headerOfferLabel: String(row.header_offer_label ?? ''),
  })
}

export async function fetchCloudSnapshot(): Promise<
  (StoreSnapshot & { hasLanding: boolean; hasMedia: boolean }) | null
> {
  if (!isSupabaseEnabled || !supabase) return null
  const [products, orders, slides, media, landing, site] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('orders').select('*').order('created_at', { ascending: false }),
    supabase.from('carousel_slides').select('*').order('sort_order'),
    supabase.from('landing_media').select('*').order('sort_order'),
    supabase.from('landing_content').select('*').eq('id', 1).maybeSingle(),
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
  ])
  const orderList = orders.error ? [] : (orders.data ?? []).map((row) => asOrder(row as Record<string, unknown>))
  const hasLanding = Boolean(landing.data) && !landing.error
  return {
    products: products.error ? [] : (products.data ?? []).map((row) => asProduct(row as Record<string, unknown>)),
    orders: orderList,
    slides: (slides.data ?? []).map((row) => asSlide(row as Record<string, unknown>)),
    media: media.error ? [] : (media.data ?? []).map((row) => asMedia(row as Record<string, unknown>)),
    landing: hasLanding ? asLanding(landing.data as Record<string, unknown>) : seedLanding,
    site: site.data && !site.error ? asSite(site.data as Record<string, unknown>) : seedSite,
    customers: customersFromOrders(orderList),
    messages: [],
    cmsUpdatedAt: hasLanding
      ? String((landing.data as Record<string, unknown>).updated_at ?? '')
      : '',
    hasLanding,
    hasMedia: !media.error,
  }
}

export async function fetchCloudOrders(): Promise<Order[] | null> {
  if (!isSupabaseEnabled || !supabase) return null
  const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
  if (error) return null
  return (data ?? []).map((row) => asOrder(row as Record<string, unknown>))
}

export async function fetchCloudCms() {
  if (!isSupabaseEnabled || !supabase) return null
  const [media, landing, site, products, slides] = await Promise.all([
    supabase.from('landing_media').select('*').order('sort_order'),
    supabase.from('landing_content').select('*').eq('id', 1).maybeSingle(),
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('carousel_slides').select('*').order('sort_order'),
  ])
  const landingError = landing.error && landing.error.code !== 'PGRST116'
  const hasLanding = Boolean(landing.data) && !landingError
  const hasMedia = !media.error
  if (!hasLanding && !hasMedia && site.error) return null
  return {
    landing: hasLanding ? asLanding(landing.data as Record<string, unknown>) : undefined,
    media: hasMedia ? (media.data ?? []).map((row) => asMedia(row as Record<string, unknown>)) : undefined,
    site: site.data && !site.error ? asSite(site.data as Record<string, unknown>) : undefined,
    products: products.error
      ? undefined
      : (products.data ?? []).map((row) => asProduct(row as Record<string, unknown>)),
    slides: slides.error
      ? undefined
      : (slides.data ?? []).map((row) => asSlide(row as Record<string, unknown>)),
    cmsUpdatedAt: hasLanding
      ? String((landing.data as Record<string, unknown>).updated_at ?? '')
      : '',
    hasLanding,
    hasMedia,
  }
}

export function subscribeToCms(onChange: () => void) {
  if (!supabase) return () => {}
  const client = supabase
  const channel = client
    .channel('public-cms')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'landing_content' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'landing_media' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'site_settings' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'products' },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'carousel_slides' },
      onChange,
    )
    .subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}

export function subscribeToOrders(handlers: {
  onInsert: (order: Order) => void
  onUpdate?: (order: Order) => void
  onDelete?: (id: string) => void
}) {
  if (!supabase) return () => {}
  const client = supabase
  const channel = client
    .channel('admin-orders')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      (payload) => {
        handlers.onInsert(asOrder(payload.new as Record<string, unknown>))
      },
    )
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'orders' },
      (payload) => {
        handlers.onUpdate?.(asOrder(payload.new as Record<string, unknown>))
      },
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'orders' },
      (payload) => {
        const id = String((payload.old as { id?: string } | null)?.id ?? '')
        if (id) handlers.onDelete?.(id)
      },
    )
    .subscribe()
  return () => {
    void client.removeChannel(channel)
  }
}

export async function cloudUpsertProduct(product: Product) {
  if (!supabase) return
  await requireAdminSession()
  const { error } = await supabase.from('products').upsert({
    id: product.id,
    name: product.name,
    headline: product.headline,
    description: product.description,
    price: product.price,
    compare_price: product.comparePrice,
    image: product.image,
    gallery: product.gallery,
    category: product.category,
    stock: product.stock,
    featured: product.featured,
    created_at: product.createdAt,
  })
  fail(error)
}

export async function cloudDeleteProduct(id: string) {
  if (!supabase) return
  await requireAdminSession()
  const { error } = await supabase.from('products').delete().eq('id', id)
  fail(error)
}

function orderRow(order: Order) {
  return {
    id: order.id,
    items: order.items,
    customer_name: order.customerName,
    phone: order.phone,
    address: order.address,
    district: order.district,
    shipping_type: order.shippingType,
    shipping_fee: order.shippingFee,
    subtotal: order.subtotal,
    total: order.total,
    status: order.status,
    notes: order.notes,
    source: order.source ?? '',
    campaign: order.campaign ?? '',
    created_at: order.createdAt,
  }
}

export async function cloudSaveOrder(order: Order) {
  if (!supabase) return
  const payload = orderRow(order)
  const { error } = await supabase.from('orders').upsert(payload)
  if (error && /source|campaign|column/i.test(error.message)) {
    const rest = { ...payload } as Record<string, unknown>
    delete rest.source
    delete rest.campaign
    const retry = await supabase.from('orders').upsert(rest)
    fail(retry.error)
    return
  }
  fail(error)
}

export async function cloudInsertOrder(order: Order) {
  await cloudSaveOrder(order)
}

export async function cloudUpdateOrder(order: Order) {
  if (!supabase) return
  const { error } = await supabase
    .from('orders')
    .update({
      items: order.items,
      customer_name: order.customerName,
      phone: order.phone,
      address: order.address,
      district: order.district,
      shipping_type: order.shippingType,
      shipping_fee: order.shippingFee,
      subtotal: order.subtotal,
      total: order.total,
      status: order.status,
      notes: order.notes,
      source: order.source ?? '',
      campaign: order.campaign ?? '',
    })
    .eq('id', order.id)
  if (error && /source|campaign|column/i.test(error.message)) {
    const retry = await supabase
      .from('orders')
      .update({
        items: order.items,
        customer_name: order.customerName,
        phone: order.phone,
        address: order.address,
        district: order.district,
        shipping_type: order.shippingType,
        shipping_fee: order.shippingFee,
        subtotal: order.subtotal,
        total: order.total,
        status: order.status,
        notes: order.notes,
      })
      .eq('id', order.id)
    fail(retry.error)
    return
  }
  fail(error)
}

export async function cloudUpdateOrderStatus(id: string, status: Order['status']) {
  if (!supabase) return
  const { error } = await supabase.from('orders').update({ status }).eq('id', id)
  fail(error)
}

export async function cloudDeleteOrder(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('orders').delete().eq('id', id)
  fail(error)
}

export async function cloudUpsertSlide(slide: CarouselSlide) {
  if (!supabase) return
  await requireAdminSession()
  const { error } = await supabase.from('carousel_slides').upsert({
    id: slide.id,
    image: slide.image,
    title: slide.title,
    subtitle: slide.subtitle,
    cta_text: slide.ctaText,
    cta_link: slide.ctaLink,
    sort_order: slide.sortOrder,
    active: slide.active,
  })
  fail(error)
}

export async function cloudDeleteSlide(id: string) {
  if (!supabase) return
  await requireAdminSession()
  const { error } = await supabase.from('carousel_slides').delete().eq('id', id)
  fail(error)
}

export async function cloudUpsertMedia(item: LandingMedia) {
  if (!supabase) return
  await requireAdminSession()
  if (item.url.startsWith('data:') || item.url.startsWith('blob:')) {
    throw new Error('Photo stayed only in this browser. Upload the file again and wait for Uploading to finish.')
  }
  const { error } = await supabase.from('landing_media').upsert({
    id: item.id,
    type: item.type,
    url: item.url,
    title: item.title,
    caption: item.caption,
    sort_order: item.sortOrder,
    active: item.active,
  })
  fail(error)
  const check = await supabase.from('landing_media').select('id,url').eq('id', item.id).maybeSingle()
  if (check.error || !check.data?.url) {
    throw new Error('Cloud did not keep this photo. Log in again, then upload and Save file.')
  }
}

export async function cloudDeleteMedia(id: string) {
  if (!supabase) return
  await requireAdminSession()
  const { data } = await supabase.from('landing_media').select('url').eq('id', id).maybeSingle()
  const { error } = await supabase.from('landing_media').delete().eq('id', id)
  fail(error)
  const url = String(data?.url ?? '')
  const marker = '/storage/v1/object/public/media/'
  const index = url.indexOf(marker)
  if (index >= 0) {
    const path = decodeURIComponent(url.slice(index + marker.length).split('?')[0] ?? '')
    if (path) await supabase.storage.from('media').remove([path])
  }
}

export async function cloudSaveLanding(landing: LandingContent, updatedAt = new Date().toISOString()) {
  if (!supabase) return
  await requireAdminSession()
  await upsertLandingRow({
    id: 1,
    hero_title: landing.heroTitle,
    hero_subtitle: landing.heroSubtitle,
    package_title: landing.packageTitle,
    package_items: landing.packageItems,
    story_title: landing.storyTitle,
    story_body: landing.storyBody,
    why_title: landing.whyTitle,
    why_items: landing.whyItems,
    payment_title: landing.paymentTitle,
    payment_number: landing.paymentNumber,
    payment_note: landing.paymentNote,
    offer_product_id: landing.offerProductId,
    offer_title: landing.offerTitle ?? '',
    offer_price: landing.offerPrice ?? 0,
    offer_compare_price: landing.offerComparePrice,
    offer_media_ids: landing.offerMediaIds ?? [],
    meta_pixel_id: landing.metaPixelId ?? '',
    cta_label: landing.ctaLabel ?? '',
    checkout_title: landing.checkoutTitle ?? '',
    help_title: landing.helpTitle ?? '',
    help_subtitle: landing.helpSubtitle ?? '',
    checkout_billing_title: landing.checkoutBillingTitle ?? '',
    checkout_order_title: landing.checkoutOrderTitle ?? '',
    checkout_submit_label: landing.checkoutSubmitLabel ?? '',
    checkout_cod_note: landing.checkoutCodNote ?? '',
    updated_at: updatedAt,
  })
}

export async function cloudSaveSite(site: SiteContent) {
  if (!supabase) return
  await requireAdminSession()
  const payload = {
    id: 1,
    name: site.name,
    name_en: site.nameEn,
    slogan: site.slogan,
    tagline: site.tagline,
    about: site.about,
    phone: site.phone,
    phone2: site.phone2,
    email: site.email,
    address: site.address,
    hours: site.hours,
    facebook: site.facebook,
    home_banner_title: site.homeBannerTitle,
    home_banner_cta: site.homeBannerCta,
    header_offer_label: site.headerOfferLabel,
  }
  const { error } = await supabase.from('site_settings').upsert(payload)
  if (error && /relation|table|column/i.test(error.message)) return
  fail(error)
}

export async function uploadMediaFile(file: File): Promise<string> {
  if (supabase) {
    pauseCmsPoll()
    try {
      await requireAdminSession()
      const prepared = file.type.startsWith('image/') ? await compressImageForCloud(file) : file
      if (!prepared.type.startsWith('image/') && prepared.size > 8 * 1024 * 1024) {
        throw new Error('Video is too large for this cloud. Upload it to YouTube, then paste the link.')
      }
      const ext = prepared.type === 'image/jpeg' ? '.jpg' : prepared.name.includes('.') ? '' : ''
      const safeName = (prepared.name || file.name).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 80)
      const path = `${Date.now()}-${safeName || 'file'}${safeName.endsWith('.jpg') || !ext ? '' : ext}`
      let error: { message: string } | null = null
      for (let i = 0; i < 6; i++) {
        const uploaded = await supabase.storage.from('media').upload(path, prepared, {
          cacheControl: '3600',
          upsert: true,
          contentType: prepared.type || file.type || undefined,
        })
        error = uploaded.error
        if (!error) break
        if (/row-level security|policy/i.test(error.message)) break
        if (!/timeout|timed out|503|504|502|network|fetch/i.test(error.message) && i >= 2) break
        await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)))
      }
      if (error) {
        throw new Error(
          error.message.includes('row-level security') || error.message.includes('policy')
            ? 'Log in with your admin email, then upload again so every browser can see the file.'
            : /timeout|timed out/i.test(error.message)
              ? 'Cloud is busy (database timeout). Wait 30 seconds, then upload a smaller photo again.'
              : `Upload failed: ${error.message}`,
        )
      }
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      const publicUrl = data.publicUrl
      if (!publicUrl.includes('/storage/v1/object/public/media/')) {
        throw new Error('Upload did not reach cloud storage. Log in and try again.')
      }
      return publicUrl
    } finally {
      resumeCmsPoll()
    }
  }
  if (file.type.startsWith('image/')) return compressImageFile(file)
  return readAsDataUrl(file)
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

async function compressImageForCloud(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file)
    const max = 1200
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.72))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    return file
  }
}

async function compressImageFile(file: File): Promise<string> {
  try {
    const bitmap = await createImageBitmap(file)
    const max = 1400
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return readAsDataUrl(file)
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    return canvas.toDataURL('image/jpeg', 0.8)
  } catch {
    return readAsDataUrl(file)
  }
}
