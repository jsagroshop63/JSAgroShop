import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { DISTRICTS, SHIPPING, type ShippingType } from '@/lib/districts'
import type { OrderItem, Product } from '@/lib/types'
import { formatTaka, isValidBdPhone, normalizeBdPhone } from '@/lib/utils'
import { SafeImage } from '@/components/ui/SafeImage'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { useStore } from '@/context/StoreContext'
import { DUPLICATE_PRODUCT_UNIT_MESSAGE, hasSameProductUnitOrder } from '@/lib/mergeOrder'
import { trackAddToCart, trackInitiateCheckout, trackOnce, trackPurchase } from '@/lib/metaPixel'

type Props = {
  products: { product: Product; quantity: number }[]
  catalog?: Product[]
  lockItems?: boolean
  onOrdered?: () => void
  alignCenter?: boolean
  productTitle?: string
  billingTitle?: string
  orderTitle?: string
  submitLabel?: string
  codNote?: string
}

export function CheckoutForm({
  products,
  catalog,
  lockItems,
  onOrdered,
  alignCenter,
  productTitle,
  billingTitle = 'বিলিং তথ্য',
  orderTitle = 'আপনার অর্ডার',
  submitLabel = 'অর্ডার করুন',
  codNote = 'Cash on delivery — পণ্য হাতে পেয়ে টাকা দিবেন।',
}: Props) {
  const { placeOrder, orders } = useStore()
  const navigate = useNavigate()
  const location = useLocation()
  const selectable = catalog?.length ? catalog : []
  const [selectedId, setSelectedId] = useState(products[0]?.product.id ?? selectable[0]?.id ?? '')
  const [qty, setQty] = useState(products[0]?.quantity ?? 1)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [district, setDistrict] = useState('Dhaka')
  const [shipping, setShipping] = useState<ShippingType>('district')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const firstProductId = products[0]?.product.id ?? ''
  const firstProductQty = products[0]?.quantity ?? 1

  useEffect(() => {
    if (lockItems || products.length !== 1) return
    setQty(firstProductQty)
    if (!selectable.length) setSelectedId(firstProductId)
  }, [firstProductId, firstProductQty, lockItems, products.length, selectable.length])

  const selectedProduct =
    selectable.find((item) => item.id === selectedId) ??
    products.find((line) => line.product.id === selectedId)?.product ??
    products[0]?.product
  const displayName = productTitle?.trim() || selectedProduct?.name || ''

  const lines = useMemo(() => {
    if (selectedProduct && (selectable.length || (products.length === 1 && !lockItems))) {
      return [{ product: selectedProduct, quantity: qty }]
    }
    return products
  }, [lockItems, products, qty, selectable.length, selectedProduct])

  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const shippingFee = SHIPPING[shipping].fee
  const total = subtotal + shippingFee

  const checkoutItems = lines.map((line) => ({
    id: line.product.id,
    name: line.product.name,
    price: line.product.price,
    quantity: line.quantity,
  }))

  function markCheckoutStarted() {
    if (!lines.length) return
    if (!lockItems) {
      const first = lines[0]
      trackOnce(`atc:${location.pathname}:${first.product.id}`, () =>
        trackAddToCart({
          id: first.product.id,
          name: first.product.name,
          value: first.product.price,
          quantity: first.quantity,
        }),
      )
    }
    trackOnce(`ico:${location.pathname}`, () =>
      trackInitiateCheckout({ value: total, items: checkoutItems }),
    )
  }

  useEffect(() => {
    if (lockItems && lines.length) markCheckoutStarted()
    // Cart page is already checkout — fire once when the form mounts with items.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intent should not re-fire on qty/shipping edits
  }, [lockItems])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (name.trim().length < 2) return setError('পুরো নাম লিখুন')
    if (!isValidBdPhone(phone)) {
      return setError('সঠিক ১১ ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)')
    }
    if (address.trim().length < 6) return setError('নিকটস্থ কুরিয়ারের ঠিকানা লিখুন')
    setSubmitting(true)
    try {
      const items: OrderItem[] = lines.map((line) => ({
        productId: line.product.id,
        name: productTitle?.trim() || line.product.name,
        image: line.product.image,
        price: line.product.price,
        quantity: line.quantity,
      }))
      const checkout = {
        items,
        customerName: name,
        phone: normalizeBdPhone(phone),
        address,
        district,
        shippingType: shipping,
      }
      if (hasSameProductUnitOrder(orders, checkout)) {
        setError(DUPLICATE_PRODUCT_UNIT_MESSAGE)
        setSubmitting(false)
        return
      }
      const order = await placeOrder(checkout)
      markCheckoutStarted()
      trackPurchase({
        id: order.id,
        value: order.total,
        items: order.items.map((item) => ({
          id: item.productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      })
      onOrdered?.()
      navigate(`/order-success/${order.id}`, { state: { order } })
    } catch (error) {
      setError(
        error instanceof Error && error.message === DUPLICATE_PRODUCT_UNIT_MESSAGE
          ? DUPLICATE_PRODUCT_UNIT_MESSAGE
          : error instanceof Error && error.message
            ? error.message
            : 'অর্ডার সম্পন্ন হয়নি, আবার চেষ্টা করুন',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      onFocusCapture={markCheckoutStarted}
      className={alignCenter ? 'mx-auto grid max-w-xl gap-8' : 'grid gap-8 lg:grid-cols-2'}
      id="order-form"
    >
      <section className={`overflow-visible rounded-3xl bg-white p-6 shadow-sm ${alignCenter ? 'text-center' : ''}`}>
        {billingTitle ? <h3 className="mb-5 text-2xl font-bold text-leaf">{billingTitle}</h3> : null}
        <div id="product-select">
          {selectable.length > 1 ? (
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-semibold">পণ্য নির্বাচন করুন *</span>
              <select
                value={selectedProduct?.id ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full rounded-xl border border-leaf/20 bg-white px-4 py-3 text-ink"
                required
              >
                {selectable.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — {formatTaka(item.price)}
                  </option>
                ))}
              </select>
            </label>
          ) : selectedProduct && !lockItems ? (
            <div className="mb-4">
              <span className="mb-1 block text-sm font-semibold">পণ্য নির্বাচন করুন *</span>
              <div className="flex items-center gap-3 rounded-xl border border-leaf/20 bg-cream px-3 py-3 text-ink">
                <SafeImage
                  src={selectedProduct.image}
                  alt={displayName}
                  className="size-16 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 text-left">
                  <p className="font-extrabold leading-snug">{displayName}</p>
                  <p className="mt-1 text-sm font-semibold text-leaf">{formatTaka(selectedProduct.price)}</p>
                </div>
              </div>
            </div>
          ) : null}
        </div>
        {((products.length === 1 && !lockItems) || selectable.length > 0) ? (
          <label className="mb-4 block">
            <span className="mb-1 block text-sm font-semibold">পরিমাণ</span>
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className={`w-28 rounded-xl border border-leaf/20 px-3 py-2 ${alignCenter ? 'mx-auto block text-center' : ''}`}
            />
          </label>
        ) : null}
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-semibold">পুরো নাম *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-leaf/20 px-4 py-3"
            placeholder="আপনার নাম"
            required
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-semibold">ফোন নাম্বার *</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-xl border border-leaf/20 px-4 py-3"
            placeholder="01XXXXXXXXX"
            required
          />
        </label>
        <label className="mb-4 block">
          <span className="mb-1 block text-sm font-semibold">নিকটস্থ কুরিয়ারের ঠিকানা *</span>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="min-h-24 w-full rounded-xl border border-leaf/20 px-4 py-3"
            placeholder="বাড়ি, রোড, এলাকা, উপজেলা"
            required
          />
        </label>
        <div className="block">
          <span className="mb-1 block text-sm font-semibold">জেলা *</span>
          <SearchableSelect value={district} options={DISTRICTS} onChange={setDistrict} />
        </div>
      </section>

      <section className={`rounded-3xl bg-white p-6 shadow-sm ${alignCenter ? 'text-center' : ''}`}>
        {orderTitle ? <h3 className="mb-5 text-2xl font-bold text-leaf">{orderTitle}</h3> : null}
        <div className="divide-y divide-leaf/10">
          {lines.map((line) => (
            <div
              key={line.product.id}
              className="flex items-center gap-3 py-3"
            >
              <SafeImage
                src={line.product.image}
                alt={productTitle?.trim() || line.product.name}
                className="size-16 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1 text-left">
                <p className="font-semibold">{productTitle?.trim() || line.product.name}</p>
                <p className="text-sm text-ink/60">
                  {formatTaka(line.product.price)} × {line.quantity}
                </p>
              </div>
              <p className="font-bold">{formatTaka(line.product.price * line.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2 text-sm">
          <div className={`flex ${alignCenter ? 'justify-center gap-3' : 'justify-between'}`}>
            <span>সাবটোটাল</span>
            <span>{formatTaka(subtotal)}</span>
          </div>
          <fieldset className="rounded-2xl bg-cream p-4">
            <legend className="px-1 font-bold text-leaf">Shipping</legend>
            {(Object.keys(SHIPPING) as ShippingType[]).map((key) => (
              <label
                key={key}
                className={`mb-2 flex cursor-pointer items-center gap-2 last:mb-0 ${alignCenter ? 'justify-center' : ''}`}
              >
                <input
                  type="radio"
                  name="shipping"
                  checked={shipping === key}
                  onChange={() => setShipping(key)}
                />
                <span>
                  {SHIPPING[key].label}: {formatTaka(SHIPPING[key].fee)}
                </span>
              </label>
            ))}
          </fieldset>
          <div className={`flex text-lg font-extrabold text-leaf ${alignCenter ? 'justify-center gap-3' : 'justify-between'}`}>
            <span>মোট</span>
            <span>{formatTaka(total)}</span>
          </div>
          {codNote ? <p className="rounded-xl bg-leaf-light px-3 py-2 text-leaf">{codNote}</p> : null}
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-6 mb-16 w-full rounded-xl bg-gold py-4 text-lg font-extrabold text-leaf-deep shadow hover:bg-gold-dark disabled:opacity-60 lg:mb-0"
        >
          {submitting ? 'অর্ডার হচ্ছে...' : `${submitLabel} ${formatTaka(total)}`}
        </button>
      </section>
    </form>
  )
}
