import type { Customer, LandingContent, LandingMedia, Order, SiteContent, StoreSnapshot } from './types'
import { createSeedSnapshot, normalizeLanding, normalizeSite } from './seed'

const KEY = 'js-agro-shop-store-v5'
const CMS_KEY = 'js-agro-shop-cms-v1'

export function customersFromOrders(orders: Order[]): Customer[] {
  const map = new Map<string, Customer>()
  for (const order of orders) {
    const existing = map.get(order.phone)
    const spent = order.status === 'cancelled' ? 0 : order.total
    if (!existing) {
      map.set(order.phone, {
        id: `cust_${order.phone}`,
        name: order.customerName,
        phone: order.phone,
        address: order.address,
        district: order.district,
        orderCount: 1,
        totalSpent: spent,
        lastOrderAt: order.createdAt,
      })
      continue
    }
    existing.orderCount += 1
    existing.totalSpent += spent
    if (order.createdAt > existing.lastOrderAt) {
      existing.lastOrderAt = order.createdAt
      existing.name = order.customerName
      existing.address = order.address
      existing.district = order.district
    }
  }
  return [...map.values()].sort((a, b) => b.lastOrderAt.localeCompare(a.lastOrderAt))
}

export function loadSnapshot(): StoreSnapshot {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const seed = createSeedSnapshot()
      return saveSnapshot(seed)
    }
    const parsed = JSON.parse(raw) as Partial<StoreSnapshot>
    const seed = createSeedSnapshot()
    const snapshot: StoreSnapshot = {
      products: parsed.products?.length ? parsed.products : seed.products,
      orders: parsed.orders ?? seed.orders,
      slides: parsed.slides?.length ? parsed.slides : seed.slides,
      media: parsed.media?.length ? parsed.media : seed.media,
      landing: normalizeLanding(parsed.landing),
      site: normalizeSite(parsed.site),
      customers: [],
      messages: parsed.messages ?? seed.messages,
      cmsUpdatedAt: parsed.cmsUpdatedAt,
    }
    snapshot.customers = customersFromOrders(snapshot.orders)
    snapshot.slides = snapshot.slides.map((slide) => ({
      ...slide,
      subtitle: slide.subtitle.replaceAll('৯.৮ হাজার', '২০ হাজার'),
    }))
    snapshot.landing = normalizeLanding({
      ...snapshot.landing,
      heroSubtitle: snapshot.landing.heroSubtitle.replaceAll('৯.৮ হাজার', '২০ হাজার'),
    })
    const cms = loadCmsBundle()
    if (cms && (!snapshot.cmsUpdatedAt || cms.cmsUpdatedAt >= snapshot.cmsUpdatedAt)) {
      snapshot.landing = normalizeLanding(cms.landing)
      snapshot.site = normalizeSite(cms.site)
      snapshot.cmsUpdatedAt = cms.cmsUpdatedAt
      if (cms.media?.length) snapshot.media = cms.media
    }
    return snapshot
  } catch {
    return createSeedSnapshot()
  }
}

export function saveSnapshot(snapshot: StoreSnapshot) {
  const next = {
    ...snapshot,
    landing: normalizeLanding(snapshot.landing),
    site: normalizeSite(snapshot.site),
    messages: snapshot.messages ?? [],
    customers: customersFromOrders(snapshot.orders),
    cmsUpdatedAt: snapshot.cmsUpdatedAt,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Keep in-memory changes working even if storage is full.
  }
  saveCmsBundle(next.landing, next.site, next.media, next.cmsUpdatedAt)
  return next
}

type CmsBundle = {
  landing: LandingContent
  site: SiteContent
  media?: LandingMedia[]
  cmsUpdatedAt: string
}

function loadCmsBundle(): CmsBundle | null {
  try {
    const raw = localStorage.getItem(CMS_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CmsBundle>
    if (!parsed.landing || !parsed.cmsUpdatedAt) return null
    return {
      landing: parsed.landing,
      site: parsed.site as SiteContent,
      media: parsed.media,
      cmsUpdatedAt: parsed.cmsUpdatedAt,
    }
  } catch {
    return null
  }
}

function saveCmsBundle(
  landing: LandingContent,
  site: SiteContent,
  media: LandingMedia[],
  cmsUpdatedAt?: string,
) {
  if (!cmsUpdatedAt) return
  const bundle: CmsBundle = { landing, site, media, cmsUpdatedAt }
  try {
    localStorage.setItem(CMS_KEY, JSON.stringify(bundle))
  } catch {
    try {
      localStorage.setItem(CMS_KEY, JSON.stringify({ landing, site, cmsUpdatedAt }))
    } catch {
      // Ignore quota errors; in-memory snapshot still holds the save.
    }
  }
}

export function resetSnapshot() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(CMS_KEY)
  return loadSnapshot()
}

export function onLocalSnapshotChange(callback: () => void) {
  const handler = (event: StorageEvent) => {
    if (event.key === KEY || event.key === CMS_KEY) callback()
  }
  window.addEventListener('storage', handler)
  return () => window.removeEventListener('storage', handler)
}
