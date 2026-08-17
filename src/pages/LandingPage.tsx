import { CheckoutForm } from '@/components/order/CheckoutForm'
import { SafeImage } from '@/components/ui/SafeImage'
import { useStore } from '@/context/StoreContext'
import { trackAddToCart, trackInitiateCheckout, trackOnce, trackViewContent } from '@/lib/metaPixel'
import { normalizeLanding, LANDING_OFFER_ID, isDemoLandingMedia, seedMedia } from '@/lib/seed'
import type { Product } from '@/lib/types'
import { formatTaka, freshMediaUrl } from '@/lib/utils'
import { useEffect, useMemo, type MouseEvent } from 'react'
import { useLocation } from 'react-router-dom'

function youtubeId(url: string) {
  const embed = url.match(/embed\/([a-zA-Z0-9_-]+)/)
  if (embed) return embed[1]
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
  if (watch) return watch[1]
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  if (short) return short[1]
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url
  return null
}

const NUMBER_PREFIX = /^(\d+|[০-৯]+)[.\।)]\s*(.*)$/

type PackageLine =
  | { kind: 'heading'; text: string }
  | { kind: 'item'; number: string; title: string; body: string }

function parsePackageLine(line: string, autoNumber?: number): PackageLine {
  const match = line.match(NUMBER_PREFIX)
  const rest = match ? match[2] : line
  const number = match?.[1] ?? (autoNumber != null ? String(autoNumber) : '')
  if (!number) return { kind: 'heading', text: line }

  const colon = rest.split(/[:：]\s*/)
  if (colon.length >= 2 && colon[0].trim()) {
    return { kind: 'item', number, title: colon[0].trim(), body: colon.slice(1).join(': ').trim() }
  }
  return { kind: 'item', number, title: rest.trim(), body: '' }
}

function parsePackageItems(items: string[]): PackageLine[] {
  const lines = items.map((item) => item.trim()).filter(Boolean)
  const hasManualNumbers = lines.some((item) => NUMBER_PREFIX.test(item))
  return lines.map((item, index) => parsePackageLine(item, hasManualNumbers ? undefined : index + 1))
}

function scrollToOrder(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault()
  const target = document.getElementById('product-select') || document.getElementById('order-form')
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function OrderButton({
  label,
  className,
  onClick,
}: {
  label: string
  className?: string
  onClick: (event: MouseEvent<HTMLAnchorElement>) => void
}) {
  return (
    <a href="#product-select" onClick={onClick} className={className}>
      {label}
    </a>
  )
}

function trackLandingCheckout(
  pathname: string,
  offer: { id: string; name: string; price: number } | undefined,
) {
  if (!offer) return
  trackOnce(`atc:${pathname}:${offer.id}`, () =>
    trackAddToCart({ id: offer.id, name: offer.name, value: offer.price, quantity: 1 }),
  )
  trackOnce(`ico:${pathname}`, () =>
    trackInitiateCheckout({
      value: offer.price,
      items: [{ id: offer.id, name: offer.name, price: offer.price, quantity: 1 }],
    }),
  )
}

export function LandingPage() {
  const { landing, media, cmsUpdatedAt, reloadCms } = useStore()
  const { pathname } = useLocation()
  const content = normalizeLanding(landing)
  const mediaStamp = cmsUpdatedAt || 'live'

  useEffect(() => {
    void reloadCms(true)
    const poll = window.setInterval(() => void reloadCms(true), 4000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void reloadCms(true)
    }
    window.addEventListener('focus', onVisible)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(poll)
      window.removeEventListener('focus', onVisible)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reloadCms])
  const gallery = useMemo(() => {
    const live = (media ?? []).filter((item) => !isDemoLandingMedia(item) && item.active !== false)
    const byId = new Map(live.map((item) => [item.id, item]))
    const ticked = content.offerMediaIds
      .map((id) => byId.get(id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
    const rest = live
      .filter((item) => !content.offerMediaIds.includes(item.id))
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const uploaded = ticked.length ? [...ticked, ...rest] : rest
    const picked = uploaded.length ? uploaded : seedMedia.filter((item) => item.active)
    return picked.map((item) => ({ ...item, url: freshMediaUrl(item.url, mediaStamp) }))
  }, [content.offerMediaIds, media, mediaStamp])
  const coverImage =
    gallery.find((item) => item.type === 'image')?.url ||
    gallery[0]?.url ||
    ''
  const landingProduct = useMemo<Product>(() => {
    const name = content.offerTitle.trim() || content.heroTitle || 'অফার পণ্য'
    return {
      id: LANDING_OFFER_ID,
      name,
      headline: '',
      description: '',
      price: content.offerPrice > 0 ? content.offerPrice : 0,
      comparePrice:
        content.offerComparePrice && content.offerComparePrice > 0 ? content.offerComparePrice : null,
      image: coverImage,
      gallery: gallery.filter((item) => item.type === 'image').map((item) => item.url),
      category: 'offer',
      stock: 99,
      featured: true,
      createdAt: new Date().toISOString(),
    }
  }, [
    content.heroTitle,
    content.offerComparePrice,
    content.offerPrice,
    content.offerTitle,
    coverImage,
    gallery,
  ])

  useEffect(() => {
    if (!landingProduct) return
    trackViewContent({
      id: landingProduct.id,
      name: landingProduct.name,
      value: landingProduct.price,
      category: landingProduct.category,
    })
  }, [landingProduct])

  const checkoutProducts = useMemo(
    () => [{ product: landingProduct, quantity: 1 }],
    [landingProduct],
  )
  const packageLines = parsePackageItems(content.packageItems)
  const orderLabel = content.ctaLabel.trim() || 'অর্ডার করুন'
  const showPackage = Boolean(content.packageTitle.trim() || packageLines.length)
  const goToProductSelect = (event: MouseEvent<HTMLAnchorElement>) => {
    scrollToOrder(event)
    trackLandingCheckout(pathname, landingProduct)
  }
  const showStory = Boolean(content.storyTitle.trim() || content.storyBody.trim() || gallery.length)
  const showWhy = Boolean(content.whyTitle.trim() || content.whyItems.length)
  const phones = content.paymentNumber
    .split(/[·,|\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
  const showHelp = Boolean(
    content.paymentTitle.trim() ||
      content.helpTitle.trim() ||
      content.helpSubtitle.trim() ||
      phones.length ||
      content.paymentNote.trim(),
  )

  return (
    <div className="bg-white text-center">
      <section className="bg-leaf px-4 py-14 text-white">
        {content.heroTitle && content.heroTitle !== landingProduct.name ? (
          <p className="text-sm font-semibold text-gold">{content.heroTitle}</p>
        ) : null}
        <h1 className="mx-auto mt-3 max-w-4xl font-display text-3xl leading-snug md:text-5xl">
          {landingProduct.name || content.heroTitle}
        </h1>
        {content.heroSubtitle ? <p className="mx-auto mt-4 max-w-3xl text-gold">{content.heroSubtitle}</p> : null}
        {landingProduct.price > 0 ? (
          <div className="mt-6 flex items-end justify-center gap-3">
            <span className="text-4xl font-extrabold text-gold md:text-5xl">{formatTaka(landingProduct.price)}</span>
            {landingProduct.comparePrice && landingProduct.comparePrice > landingProduct.price ? (
              <span className="pb-1 text-lg text-white/50 line-through">{formatTaka(landingProduct.comparePrice)}</span>
            ) : null}
          </div>
        ) : null}
        {showPackage ? (
          <>
            <OrderButton
              label={orderLabel}
              onClick={goToProductSelect}
              className="mt-8 inline-block rounded-md bg-gold px-10 py-4 text-2xl font-extrabold text-black shadow-lg"
            />
            {content.packageTitle ? (
              <div className="mx-auto mt-8 max-w-3xl rounded-2xl bg-white px-6 py-4 text-leaf">
                <h2 className="text-xl font-extrabold md:text-2xl">{content.packageTitle}</h2>
              </div>
            ) : null}
            {packageLines.length ? (
              <div className="mx-auto mt-8 max-w-2xl space-y-3">
                {packageLines.map((item, i) =>
                  item.kind === 'heading' ? (
                    <p
                      key={`heading-${i}`}
                      className={`text-center font-extrabold leading-snug text-gold ${i === 0 ? 'text-2xl md:text-3xl' : 'text-lg text-cream md:text-xl'}`}
                    >
                      {item.text}
                    </p>
                  ) : (
                    <div key={`item-${i}`} className="flex gap-3 rounded-2xl bg-white/10 px-4 py-3 text-left">
                      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-gold text-sm font-extrabold text-leaf-deep">
                        {item.number}
                      </span>
                      <div>
                        <p className="font-extrabold leading-snug text-gold">{item.title}</p>
                        {item.body ? (
                          <p className="mt-1 text-sm font-medium leading-relaxed text-cream/90">{item.body}</p>
                        ) : null}
                      </div>
                    </div>
                  ),
                )}
              </div>
            ) : null}
          </>
        ) : null}
        {showPackage ? (
          <OrderButton
            label={orderLabel}
            onClick={goToProductSelect}
            className="mt-10 inline-block rounded-md bg-gold px-10 py-4 text-2xl font-extrabold text-black shadow-lg"
          />
        ) : (
          <OrderButton
            label={orderLabel}
            onClick={goToProductSelect}
            className="mt-8 inline-block rounded-md bg-gold px-10 py-4 text-2xl font-extrabold text-black shadow-lg"
          />
        )}
      </section>

      {showStory ? (
        <section className="px-4 py-12">
          {content.storyTitle ? (
            <h2 className="mx-auto mb-6 max-w-4xl rounded-xl bg-leaf py-3 text-xl font-bold text-gold md:text-2xl">
              {content.storyTitle}
            </h2>
          ) : null}
          {content.storyBody ? <p className="mx-auto max-w-3xl leading-relaxed">{content.storyBody}</p> : null}
        </section>
      ) : null}

      {showWhy ? (
        <section className="bg-leaf px-4 py-12 text-white">
          {content.whyTitle ? <h2 className="text-2xl font-extrabold text-gold">{content.whyTitle}</h2> : null}
          {content.whyItems.length ? (
            <ul className="mx-auto mt-6 max-w-2xl space-y-3 text-lg">
              {content.whyItems.map((item, i) => (
                <li key={`${item}-${i}`} className="rounded-xl bg-white/10 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {gallery.length ? (
        <section className="px-4 py-12">
          <div className="mx-auto flex max-w-5xl flex-wrap justify-center gap-4">
            {gallery.map((item) => (
              <figure
                key={item.id}
                className="w-full max-w-sm overflow-hidden rounded-xl border-4 border-gold bg-leaf-deep sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)]"
              >
                {item.type === 'video' ? (
                  <div>
                    <div className="aspect-video">
                      {youtubeId(item.url) ? (
                        <iframe
                          className="size-full"
                          src={`https://www.youtube.com/embed/${youtubeId(item.url)}`}
                          title={item.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <video src={item.url} controls className="size-full object-cover" />
                      )}
                    </div>
                    <OrderButton
                      label={orderLabel}
                      onClick={goToProductSelect}
                      className="block bg-gold py-3 text-lg font-extrabold text-black"
                    />
                  </div>
                ) : (
                  <a href="#product-select" onClick={goToProductSelect} className="block">
                    <SafeImage src={item.url} alt={item.title} fallback={null} className="aspect-square w-full object-cover" />
                    <span className="block bg-gold py-3 text-lg font-extrabold text-black">{orderLabel}</span>
                  </a>
                )}
                {(item.title || item.caption) && (
                  <figcaption className="bg-leaf px-3 py-2 text-center text-sm text-gold">
                    <p className="font-bold">{item.title}</p>
                    {item.caption ? <p className="text-cream/80">{item.caption}</p> : null}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      ) : null}

      {showHelp ? (
        <section className="bg-gold px-4 py-3">
          <div className="mx-auto w-[70%]">
          <p className="mx-auto max-w-3xl text-base font-extrabold leading-snug text-leaf-deep md:text-xl">
            {content.helpTitle.trim() || 'ওয়েবসাইটে অর্ডার করতে সমস্যা হলে বা অর্ডার করতে না পারলে'}
          </p>
          <p className="mt-1 text-base font-extrabold text-leaf-deep md:text-xl">
            {content.helpSubtitle.trim() || 'প্রয়োজনে কল করুন-'}
          </p>
          {content.paymentTitle ? (
            <p className="mt-1 text-base font-extrabold text-leaf-deep md:text-xl">{content.paymentTitle}</p>
          ) : (
            <p className="mt-1 text-base font-extrabold text-leaf-deep md:text-xl">WhatsApp / Imo</p>
          )}
          {phones.length ? (
            <p className="mt-1 space-y-0.5 text-xl font-extrabold text-leaf-deep md:text-2xl">
              {phones.map((phone) => (
                <a key={phone} href={`tel:${phone.replace(/[\s-]/g, '')}`} className="block">
                  {phone}
                </a>
              ))}
            </p>
          ) : (
            <p className="mt-1 space-y-0.5 text-xl font-extrabold text-leaf-deep md:text-2xl">
              <a href="tel:01813514791" className="block">01813-514791</a>
              <a href="tel:01725250188" className="block">01725-250188</a>
            </p>
          )}
          <p className="mx-auto mt-2 max-w-3xl text-sm font-semibold text-leaf-deep/80">
            {content.paymentNote.trim() ||
              'অর্ডার কনফার্ম করতে WhatsApp বা Imo-তে মেসেজ দিন। সারা দেশে কুরিয়ার/বাস ডেলিভারি।'}
          </p>
          </div>
        </section>
      ) : null}

      <section className="bg-cream px-4 py-12">
        <div className="mx-auto max-w-6xl">
          {content.checkoutTitle.trim() ? (
            <p className="mx-auto mb-6 max-w-xl text-base leading-relaxed text-leaf-deep/80">
              {content.checkoutTitle}
            </p>
          ) : null}
          <CheckoutForm
            alignCenter
            productTitle={landingProduct.name}
            billingTitle={content.checkoutBillingTitle}
            orderTitle={content.checkoutOrderTitle}
            submitLabel={content.checkoutSubmitLabel}
            codNote={content.checkoutCodNote}
            products={checkoutProducts}
          />
        </div>
      </section>
    </div>
  )
}
