import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  CarouselSlide,
  CheckoutInput,
  ContactMessage,
  LandingContent,
  LandingMedia,
  Order,
  Product,
  SiteContent,
  StoreSnapshot,
} from '@/lib/types'
import { uid } from '@/lib/utils'
import { customersFromOrders, loadSnapshot, onLocalSnapshotChange, saveSnapshot } from '@/lib/localStore'
import {
  cloudDeleteMedia,
  cloudDeleteOrder,
  cloudDeleteProduct,
  cloudDeleteSlide,
  cloudSaveOrder,
  cloudSaveLanding,
  cloudSaveSite,
  cloudUpdateOrderStatus,
  cloudUpsertMedia,
  cloudUpsertProduct,
  cloudUpsertSlide,
  fetchCloudOrders,
  fetchCloudSnapshot,
  fetchCloudCms,
  subscribeToOrders,
  subscribeToCms,
} from '@/lib/cloud'
import { isSupabaseEnabled } from '@/lib/supabase'
import { applyIncomingOrder, DuplicateProductUnitError, hasSameProductUnitOrder } from '@/lib/mergeOrder'
import { readAttribution } from '@/lib/metaPixel'
import { normalizeLanding, normalizeSite } from '@/lib/seed'

type StoreContextValue = StoreSnapshot & {
  loading: boolean
  cloud: boolean
  syncError: string
  saveProduct: (product: Product) => Promise<void>
  deleteProduct: (id: string) => Promise<void>
  placeOrder: (input: CheckoutInput) => Promise<Order>
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>
  deleteOrder: (id: string) => Promise<void>
  saveSlide: (slide: CarouselSlide) => Promise<void>
  deleteSlide: (id: string) => Promise<void>
  saveMedia: (item: LandingMedia) => Promise<void>
  deleteMedia: (id: string) => Promise<void>
  saveLanding: (landing: LandingContent) => Promise<void>
  saveSite: (site: SiteContent) => Promise<void>
  addMessage: (input: Omit<ContactMessage, 'id' | 'read' | 'createdAt'>) => Promise<ContactMessage>
  markMessageRead: (id: string) => Promise<void>
  deleteMessage: (id: string) => Promise<void>
}

const StoreContext = createContext<StoreContextValue | null>(null)

let ignoreRemoteCmsUntil = 0
let publishedCmsAt = ''

function cmsTime(value?: string) {
  if (!value) return 0
  const n = Date.parse(value)
  return Number.isFinite(n) ? n : 0
}

function markLocalCmsWrite(at = '') {
  ignoreRemoteCmsUntil = Date.now() + 20000
  if (at) publishedCmsAt = at
}

function applyRemoteCms(
  prev: StoreSnapshot,
  cloud: Partial<StoreSnapshot> & { hasLanding?: boolean; hasMedia?: boolean },
): StoreSnapshot {
  const localTs = prev.cmsUpdatedAt || ''
  const cloudTs = cloud.cmsUpdatedAt || ''
  const keepLocal =
    Date.now() < ignoreRemoteCmsUntil || cmsTime(publishedCmsAt) > cmsTime(cloudTs)
  if (keepLocal) {
    return persist({
      ...prev,
      products: cloud.products ?? prev.products,
      orders: cloud.orders ?? prev.orders,
      slides: cloud.slides?.length ? cloud.slides : prev.slides,
      messages: cloud.messages?.length ? cloud.messages : prev.messages ?? [],
    })
  }
  if (cloud.hasLanding !== true) {
    return persist({
      ...prev,
      products: cloud.products ?? prev.products,
      orders: cloud.orders ?? prev.orders,
      slides: cloud.slides?.length ? cloud.slides : prev.slides,
      messages: cloud.messages?.length ? cloud.messages : prev.messages ?? [],
      media: cloud.hasMedia === false || !Array.isArray(cloud.media) ? prev.media : cloud.media,
      site: cloud.site ? normalizeSite(cloud.site) : prev.site,
    })
  }
  const nextLanding = normalizeLanding(cloud.landing)
  const nextSite = cloud.site ? normalizeSite(cloud.site) : prev.site
  const nextMedia = cloud.hasMedia === false || !Array.isArray(cloud.media) ? prev.media : cloud.media
  if (
    JSON.stringify(nextLanding) === JSON.stringify(normalizeLanding(prev.landing)) &&
    JSON.stringify(nextSite) === JSON.stringify(normalizeSite(prev.site)) &&
    JSON.stringify(nextMedia) === JSON.stringify(prev.media)
  ) {
    return persist({
      ...prev,
      products: cloud.products ?? prev.products,
      orders: cloud.orders ?? prev.orders,
      slides: cloud.slides?.length ? cloud.slides : prev.slides,
      messages: cloud.messages?.length ? cloud.messages : prev.messages ?? [],
      cmsUpdatedAt: cloudTs || localTs,
    })
  }
  return persist({
    ...prev,
    products: cloud.products ?? prev.products,
    orders: cloud.orders ?? prev.orders,
    slides: cloud.slides?.length ? cloud.slides : prev.slides,
    messages: cloud.messages?.length ? cloud.messages : prev.messages ?? [],
    landing: nextLanding,
    media: nextMedia,
    site: nextSite,
    cmsUpdatedAt: cloudTs || localTs,
  })
}

function persist(next: StoreSnapshot) {
  return saveSnapshot({
    ...next,
    landing: normalizeLanding(next.landing),
    site: normalizeSite(next.site),
    messages: next.messages ?? [],
    customers: customersFromOrders(next.orders),
  })
}

function ordersKey(orders: Order[]) {
  return orders
    .map((order) => `${order.id}:${order.status}:${order.items.map((item) => `${item.productId}x${item.quantity}`).join(',')}`)
    .join('|')
}

function uniqueOrders(orders: Order[]) {
  const map = new Map<string, Order>()
  for (const order of orders) map.set(order.id, order)
  return [...map.values()]
}

function mergeOrderLists(local: Order[], remote: Order[]) {
  const remoteIds = new Set(remote.map((order) => order.id))
  const cutoff = Date.now() - 90_000
  const inFlight = local.filter(
    (order) => !remoteIds.has(order.id) && new Date(order.createdAt).getTime() > cutoff,
  )
  return [...inFlight, ...remote]
}

function mergeRemoteOrders(prev: StoreSnapshot, remote: Order[]): StoreSnapshot {
  const orders = mergeOrderLists(prev.orders, remote)
  if (ordersKey(prev.orders) === ordersKey(orders)) return prev
  return persist({ ...prev, orders })
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<StoreSnapshot>(() => loadSnapshot())
  const [loading, setLoading] = useState(isSupabaseEnabled)
  const [syncError, setSyncError] = useState('')

  useEffect(() => {
    if (!isSupabaseEnabled) return
    let cancelled = false
    fetchCloudSnapshot()
      .then((cloud) => {
        if (cancelled || !cloud) return
        setSnapshot((prev) => applyRemoteCms(prev, cloud))
      })
      .catch((error: unknown) => {
        if (!cancelled) setSyncError(error instanceof Error ? error.message : 'Cloud load failed')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return onLocalSnapshotChange(() => {
      setSnapshot((prev) => {
        const next = loadSnapshot()
        if (!isSupabaseEnabled) return next
        return {
          ...next,
          landing: prev.landing,
          site: prev.site,
          media: prev.media,
          cmsUpdatedAt: prev.cmsUpdatedAt,
        }
      })
    })
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled) return
    const unsub = subscribeToOrders({
      onInsert: (order) => {
        setSnapshot((prev) => {
          if (prev.orders.some((item) => item.id === order.id)) return prev
          return persist({ ...prev, orders: [order, ...prev.orders] })
        })
      },
      onUpdate: (order) => {
        setSnapshot((prev) => {
          if (!prev.orders.some((item) => item.id === order.id)) {
            return persist({ ...prev, orders: [order, ...prev.orders] })
          }
          return persist({
            ...prev,
            orders: prev.orders.map((item) => (item.id === order.id ? order : item)),
          })
        })
      },
      onDelete: (id) => {
        setSnapshot((prev) => persist({ ...prev, orders: prev.orders.filter((item) => item.id !== id) }))
      },
    })
    const pull = () => {
      void fetchCloudOrders().then((remote) => {
        if (!remote) return
        setSnapshot((prev) => mergeRemoteOrders(prev, remote))
      })
    }
    pull()
    const poll = window.setInterval(pull, 8000)
    return () => {
      unsub()
      window.clearInterval(poll)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseEnabled) return
    const pullCms = () => {
      void fetchCloudCms().then((cloud) => {
        if (!cloud) return
        setSnapshot((prev) => applyRemoteCms(prev, cloud))
      })
    }
    pullCms()
    const poll = window.setInterval(pullCms, 10000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') pullCms()
    }
    document.addEventListener('visibilitychange', onVisible)
    const unsub = subscribeToCms(pullCms)
    return () => {
      unsub()
      window.clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const commit = useCallback((updater: (prev: StoreSnapshot) => StoreSnapshot) => {
    setSnapshot((prev) => persist(updater(prev)))
  }, [])

  const sync = useCallback(async (task: () => Promise<void>, rethrow = false) => {
    try {
      await task()
      setSyncError('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Cloud sync failed'
      setSyncError(message)
      if (rethrow) throw new Error(message)
    }
  }, [])

  const saveProduct = useCallback(
    async (product: Product) => {
      commit((prev) => ({
        ...prev,
        products: prev.products.some((item) => item.id === product.id)
          ? prev.products.map((item) => (item.id === product.id ? product : item))
          : [product, ...prev.products],
      }))
      await sync(() => cloudUpsertProduct(product))
    },
    [commit, sync],
  )

  const deleteProduct = useCallback(
    async (id: string) => {
      commit((prev) => ({ ...prev, products: prev.products.filter((item) => item.id !== id) }))
      await sync(() => cloudDeleteProduct(id))
    },
    [commit, sync],
  )

  const placeOrder = useCallback(
    async (input: CheckoutInput) => {
      const attr = readAttribution()
      let remote: Order[] | null = null
      try {
        remote = await fetchCloudOrders()
      } catch {
        remote = null
      }
      const payload = {
        ...input,
        source: input.source || attr.source,
        campaign: input.campaign || attr.campaign,
      }
      let outcome: ReturnType<typeof applyIncomingOrder> | null = null
      let duplicate = false
      commit((prev) => {
        const merged = remote ? mergeOrderLists(prev.orders, remote) : prev.orders
        const combined = uniqueOrders([...prev.orders, ...merged, ...(remote ?? [])])
        if (hasSameProductUnitOrder(combined, payload)) {
          duplicate = true
          return prev
        }
        outcome = applyIncomingOrder(merged, payload)
        return { ...prev, orders: outcome.orders }
      })
      if (duplicate) throw new DuplicateProductUnitError()
      if (!outcome) throw new Error('Order failed')
      const result = outcome as ReturnType<typeof applyIncomingOrder>
      await sync(() => cloudSaveOrder(result.saved))
      return result.saved
    },
    [commit, sync],
  )

  const updateOrderStatus = useCallback(
    async (id: string, status: Order['status']) => {
      commit((prev) => ({
        ...prev,
        orders: prev.orders.map((order) => (order.id === id ? { ...order, status } : order)),
      }))
      await sync(() => cloudUpdateOrderStatus(id, status))
    },
    [commit, sync],
  )

  const deleteOrder = useCallback(
    async (id: string) => {
      commit((prev) => ({ ...prev, orders: prev.orders.filter((order) => order.id !== id) }))
      await sync(() => cloudDeleteOrder(id))
    },
    [commit, sync],
  )

  const saveSlide = useCallback(
    async (slide: CarouselSlide) => {
      commit((prev) => ({
        ...prev,
        slides: prev.slides.some((item) => item.id === slide.id)
          ? prev.slides.map((item) => (item.id === slide.id ? slide : item))
          : [...prev.slides, slide],
      }))
      await sync(() => cloudUpsertSlide(slide))
    },
    [commit, sync],
  )

  const deleteSlide = useCallback(
    async (id: string) => {
      commit((prev) => ({ ...prev, slides: prev.slides.filter((item) => item.id !== id) }))
      await sync(() => cloudDeleteSlide(id))
    },
    [commit, sync],
  )

  const stamp = () => new Date().toISOString()

  const saveMedia = useCallback(
    async (item: LandingMedia) => {
      const cmsUpdatedAt = stamp()
      markLocalCmsWrite(cmsUpdatedAt)
      commit((prev) => ({
        ...prev,
        cmsUpdatedAt,
        media: prev.media.some((row) => row.id === item.id)
          ? prev.media.map((row) => (row.id === item.id ? item : row))
          : [...prev.media, item],
      }))
      await sync(() => cloudUpsertMedia(item), true)
    },
    [commit, sync],
  )

  const deleteMedia = useCallback(
    async (id: string) => {
      const cmsUpdatedAt = stamp()
      markLocalCmsWrite(cmsUpdatedAt)
      commit((prev) => ({
        ...prev,
        cmsUpdatedAt,
        media: prev.media.filter((item) => item.id !== id),
      }))
      await sync(() => cloudDeleteMedia(id), true)
    },
    [commit, sync],
  )

  const saveLanding = useCallback(
    async (landing: LandingContent) => {
      const cmsUpdatedAt = stamp()
      markLocalCmsWrite(cmsUpdatedAt)
      commit((prev) => ({ ...prev, landing, cmsUpdatedAt }))
      await sync(() => cloudSaveLanding(landing, cmsUpdatedAt), true)
    },
    [commit, sync],
  )

  const saveSite = useCallback(
    async (site: SiteContent) => {
      const cmsUpdatedAt = stamp()
      markLocalCmsWrite(cmsUpdatedAt)
      commit((prev) => ({ ...prev, site, cmsUpdatedAt }))
      await sync(() => cloudSaveSite(site), true)
    },
    [commit, sync],
  )

  const addMessage = useCallback(
    async (input: Omit<ContactMessage, 'id' | 'read' | 'createdAt'>) => {
      const message: ContactMessage = {
        id: uid('msg'),
        ...input,
        read: false,
        createdAt: new Date().toISOString(),
      }
      commit((prev) => ({ ...prev, messages: [message, ...(prev.messages ?? [])] }))
      return message
    },
    [commit, sync],
  )

  const markMessageRead = useCallback(
    async (id: string) => {
      commit((prev) => ({
        ...prev,
        messages: (prev.messages ?? []).map((item) => (item.id === id ? { ...item, read: true } : item)),
      }))
    },
    [commit, sync],
  )

  const deleteMessage = useCallback(
    async (id: string) => {
      commit((prev) => ({
        ...prev,
        messages: (prev.messages ?? []).filter((item) => item.id !== id),
      }))
    },
    [commit, sync],
  )

  const value = useMemo<StoreContextValue>(
    () => ({
      ...snapshot,
      landing: normalizeLanding(snapshot.landing),
      site: normalizeSite(snapshot.site),
      messages: snapshot.messages ?? [],
      loading,
      cloud: isSupabaseEnabled,
      syncError,
      saveProduct,
      deleteProduct,
      placeOrder,
      updateOrderStatus,
      deleteOrder,
      saveSlide,
      deleteSlide,
      saveMedia,
      deleteMedia,
      saveLanding,
      saveSite,
      addMessage,
      markMessageRead,
      deleteMessage,
    }),
    [
      snapshot,
      loading,
      syncError,
      saveProduct,
      deleteProduct,
      placeOrder,
      updateOrderStatus,
      deleteOrder,
      saveSlide,
      deleteSlide,
      saveMedia,
      deleteMedia,
      saveLanding,
      saveSite,
      addMessage,
      markMessageRead,
      deleteMessage,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}
