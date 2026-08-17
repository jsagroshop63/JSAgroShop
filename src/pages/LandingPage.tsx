import { CheckoutForm } from '@/components/order/CheckoutForm'
import { SafeImage } from '@/components/ui/SafeImage'
import { useStore } from '@/context/StoreContext'
import { trackAddToCart, trackInitiateCheckout, trackOnce, trackViewContent } from '@/lib/metaPixel'
import { normalizeLanding, LANDING_OFFER_ID, isCatalogProductId } from '@/lib/seed'
import type { Product } from '@/lib/types'
import { formatTaka } from '@/lib/utils'
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
  document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
  const { landing, media, products } = useStore()
  const { pathname } = useLocation()
  const content = normalizeLanding(landing)
  const gallery = useMemo(() => {
    const list = media ?? []
    const byId = new Map(list.map((item) => [item.id, item]))
    if (content.offerMediaIds.length) {
      return content.offerMediaIds
        .map((id) => byId.get(id))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
    }
    return list.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder)
  }, [content.offerMediaIds, media])
  const coverImage =
    gallery.find((item) => item.type === 'image')?.url ||
    gallery[0]?.url ||
    ''
  const landingProduct = useMemo<Product>(() => {
    const linked = isCatalogProductId(content.offerProductId)
      ? products.find((item) => item.id === content.offerProductId)
      : undefined
    const name = content.offerTitle.trim() || linked?.name || content.heroTitle || 'অফার পণ্য'
    return {
      id: linked?.id ?? LANDING_OFFER_ID,
      name,
      headline: linked?.headline ?? '',
      description: linked?.description ?? '',
      price: content.offerPrice > 0 ? content.offerPrice : linked?.price ?? 0,
      comparePrice:
        content.offerComparePrice && content.offerComparePrice > 0
          ? content.offerComparePrice
          : linked?.comparePrice ?? null,
      image: coverImage || linked?.image || '',
      gallery: gallery.filter((item) => item.type === 'image').map((item) => item.url),
      category: linked?.category || 'offer',
      stock: linked?.stock ?? 99,
      featured: true,
      createdAt: linked?.createdAt ?? new Date().toISOString(),
    }
  }, [
    content.heroTitle,
    content.offerComparePrice,
    content.offerPrice,
    content.offerProductId,
    content.offerTitle,
    coverImage,
    gallery,
    products,
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
  const showHeroCta = Boolean(content.ctaLabel.trim())
  const showPackage = Boolean(content.packageTitle.trim() || packageLines.length)
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
        {showHeroCta ? (
          <a
            href="#order-form"
            onClick={(event) => {
              scrollToOrder(event)
              trackLandingCheckout(pathname, landingProduct)
            }}
            className="mt-8 inline-block rounded-md bg-gold px-10 py-4 text-2xl font-extrabold text-black shadow-lg"
          >
            {content.ctaLabel}
          </a>
        ) : null}
        {showPackage ? (
          <>
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
        {showHeroCta ? (
          <a
            href="#order-form"
            onClick={(event) => {
              scrollToOrder(event)
              trackLandingCheckout(pathname, landingProduct)
            }}
            className="mt-10 inline-block rounded-md bg-gold px-10 py-4 text-2xl font-extrabold text-black shadow-lg"
          >
            {content.ctaLabel}
          </a>
        ) : null}
      </section>

      {showStory ? (
        <section className="px-4 py-12">
          {content.storyTitle ? (
            <h2 className="mx-auto mb-6 max-w-4xl rounded-xl bg-leaf py-3 text-xl font-bold text-gold md:text-2xl">
              {content.storyTitle}
            </h2>
          ) : null}
          {content.storyBody ? <p className="mx-auto max-w-3xl leading-relaxed">{content.storyBody}</p> : null}
          {gallery.length ? (
            <div className="mx-auto mt-10 flex max-w-5xl flex-wrap justify-center gap-4">
              {gallery.map((item) => (
                <figure
                  key={item.id}
                  className="w-full max-w-sm overflow-hidden rounded-xl border-4 border-gold bg-leaf-deep sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.7rem)]"
                >
                  {item.type === 'video' ? (
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
                  ) : (
                    <a
                      href="#order-form"
                      onClick={(event) => {
                        scrollToOrder(event)
                        trackLandingCheckout(pathname, landingProduct)
                      }}
                      className="block"
                    >
                      <SafeImage src={item.url} alt={item.title} className="aspect-square w-full object-cover" />
                      {showHeroCta ? (
                        <span className="block bg-gold py-3 text-lg font-extrabold text-black">{content.ctaLabel}</span>
                      ) : null}
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
          ) : null}
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

      {showHelp ? (
        <section className="bg-gold px-4 py-10">
          {content.helpTitle ? (
            <p className="mx-auto max-w-3xl text-lg font-extrabold leading-snug text-leaf-deep md:text-2xl">
              {content.helpTitle}
            </p>
          ) : null}
          {content.helpSubtitle ? (
            <p className="mt-3 text-lg font-extrabold text-leaf-deep md:text-2xl">{content.helpSubtitle}</p>
          ) : null}
          {content.paymentTitle ? (
            <p className="mt-3 text-lg font-extrabold text-leaf-deep md:text-2xl">{content.paymentTitle}</p>
          ) : null}
          {phones.length ? (
            <p className="mt-3 space-y-1 text-2xl font-extrabold text-leaf-deep md:text-3xl">
              {phones.map((phone) => (
                <a key={phone} href={`tel:${phone.replace(/[\s-]/g, '')}`} className="block">
                  {phone}
                </a>
              ))}
            </p>
          ) : null}
          {content.paymentNote ? (
            <p className="mx-auto mt-4 max-w-3xl text-base font-semibold text-leaf-deep/80">{content.paymentNote}</p>
          ) : null}
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
