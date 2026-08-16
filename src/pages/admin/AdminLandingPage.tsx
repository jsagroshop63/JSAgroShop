import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Copy, Check, ChevronDown } from 'lucide-react'
import { useConfirm } from '@/components/admin/ConfirmDialog'
import { AdminUploadField } from '@/components/admin/AdminUploadField'
import { ShopSettingsFields } from '@/components/admin/ShopSettingsFields'
import { useStore } from '@/context/StoreContext'
import { normalizeLanding, normalizeSite } from '@/lib/seed'
import type { LandingMedia } from '@/lib/types'
import { cn, uid } from '@/lib/utils'

function publicOrigin() {
  if (typeof window === 'undefined') return ''
  const { hostname, origin } = window.location
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return (import.meta.env.VITE_SITE_URL || 'https://sayeed2.vercel.app').replace(/\/$/, '')
  }
  return origin
}

function adsUrl() {
  return `${publicOrigin()}/landing?utm_source=facebook&utm_medium=cpc&utm_campaign=offer`
}

function youtubeId(url: string) {
  const embed = url.match(/embed\/([a-zA-Z0-9_-]+)/)
  if (embed) return embed[1]
  const watch = url.match(/[?&]v=([a-zA-Z0-9_-]+)/)
  if (watch) return watch[1]
  const short = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
  if (short) return short[1]
  return null
}

const emptyMedia = {
  type: 'image' as LandingMedia['type'],
  url: '',
  title: '',
  caption: '',
  sortOrder: 1,
  active: true,
}

export function AdminLandingPage() {
  const { landing, saveLanding, saveSite, site, media, saveMedia, deleteMedia, syncError } = useStore()
  const confirm = useConfirm()
  const [form, setForm] = useState(() => normalizeLanding(landing))
  const [siteForm, setSiteForm] = useState(() => normalizeSite(site))
  const [upload, setUpload] = useState(emptyMedia)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingFile, setSavingFile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [copied, setCopied] = useState(false)
  const [landingUrl, setLandingUrl] = useState('')
  const sortedMedia = media.slice().sort((a, b) => a.sortOrder - b.sortOrder)
  const pickedMedia = sortedMedia.filter((item) => form.offerMediaIds.includes(item.id))
  const landingChoices = pickedMedia.length ? pickedMedia : sortedMedia
  const landingCoverId = form.offerMediaIds[0] || landingChoices[0]?.id || ''
  const landingCover = sortedMedia.find((item) => item.id === landingCoverId)
  const landingPriceLabel = `৳ ${(form.offerPrice || 0).toLocaleString('en-BD')}`
  const landingKey = JSON.stringify(landing)
  const siteKey = JSON.stringify(site)

  useEffect(() => {
    setForm(normalizeLanding(landing))
    // Sync only when landing *content* changes, not on every order poll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landingKey])

  useEffect(() => {
    setSiteForm(normalizeSite(site))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey])

  useEffect(() => {
    setLandingUrl(adsUrl())
  }, [])

  const lastSavedPackage = useRef(
    JSON.stringify({ title: form.packageTitle, items: form.packageItems }),
  )
  useEffect(() => {
    const payload = JSON.stringify({ title: form.packageTitle, items: form.packageItems })
    if (payload === lastSavedPackage.current) return
    const timer = window.setTimeout(() => {
      lastSavedPackage.current = payload
      const next = normalizeLanding({ ...form, offerProductId: 'prod_landing_offer' })
      void saveLanding(next)
        .then(() => setNotice('Package list saved. It now shows on the landing page.'))
        .catch((error) => setNotice(error instanceof Error ? error.message : 'Save failed'))
    }, 800)
    return () => window.clearTimeout(timer)
  }, [form, saveLanding])

  function resetUpload() {
    setUpload({ ...emptyMedia, sortOrder: media.length + 1 })
    setEditingId(null)
  }

  function toggleMedia(id: string) {
    setForm((prev) => ({
      ...prev,
      offerMediaIds: prev.offerMediaIds.includes(id)
        ? prev.offerMediaIds.filter((item) => item !== id)
        : [...prev.offerMediaIds, id],
    }))
  }

  function selectLandingCover(id: string) {
    if (!id) return
    setForm((prev) => ({
      ...prev,
      offerMediaIds: prev.offerMediaIds.includes(id)
        ? [id, ...prev.offerMediaIds.filter((item) => item !== id)]
        : [id, ...prev.offerMediaIds],
    }))
  }

  async function onSaveFile(event: FormEvent) {
    event.preventDefault()
    if (!upload.url.trim()) {
      setNotice('Upload a file or paste a URL first, then click Save file.')
      return
    }
    setSavingFile(true)
    setNotice('')
    try {
      const item: LandingMedia = { id: editingId ?? uid('media'), ...upload }
      await saveMedia(item)
      const nextIds = form.offerMediaIds.includes(item.id) ? form.offerMediaIds : [...form.offerMediaIds, item.id]
      const nextForm = normalizeLanding({ ...form, offerMediaIds: nextIds, offerProductId: 'prod_landing_offer' })
      setForm(nextForm)
      await saveLanding(nextForm)
      setNotice(editingId ? 'File updated. It is listed below — tick it to show on the landing page.' : 'File saved. Tick it below to show on the landing page.')
      resetUpload()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSavingFile(false)
    }
  }

  async function onSaveLanding(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    try {
      await saveLanding(normalizeLanding({ ...form, offerProductId: 'prod_landing_offer' }))
      await saveSite(normalizeSite(siteForm))
      setNotice('Saved. Open the landing page to see every change.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(item: LandingMedia) {
    if (!(await confirm(`Delete ${item.title || 'this file'}? This cannot be undone.`))) return
    try {
      await deleteMedia(item.id)
      const nextForm = normalizeLanding({
        ...form,
        offerMediaIds: form.offerMediaIds.filter((id) => id !== item.id),
        offerProductId: 'prod_landing_offer',
      })
      setForm(nextForm)
      await saveLanding(nextForm)
      if (editingId === item.id) resetUpload()
      setNotice('File deleted.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Delete failed')
    }
  }

  async function copyLandingUrl() {
    try {
      await navigator.clipboard.writeText(landingUrl || adsUrl())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setNotice('Copy failed — select the URL and copy it yourself.')
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-3xl text-gold">Landing page</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Every heading, photo, price, button and checkout text on /offer is edited here. Leave a field empty to hide it.
        </p>
        <a
          href="/offer"
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-semibold text-gold hover:underline"
        >
          Open landing page →
        </a>
        {notice ? (
          <p className={`mt-2 text-sm font-semibold ${notice.toLowerCase().includes('fail') || notice.toLowerCase().includes('error') ? 'text-red-400' : 'text-emerald-400'}`}>
            {notice}
          </p>
        ) : null}
        {syncError ? (
          <p className="mt-2 text-sm font-semibold text-amber-300">Cloud: {syncError}. Changes are still saved on this device.</p>
        ) : null}
      </div>

      <form id="upload-file" onSubmit={onSaveFile} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <p className="text-sm font-semibold text-zinc-200">{editingId ? 'Edit photo or video' : 'Upload photo or video'}</p>
        <select
          value={upload.type}
          onChange={(e) => setUpload({ ...upload, type: e.target.value === 'video' ? 'video' : 'image' })}
          className="w-full rounded-xl bg-black/30 px-3 py-3 text-zinc-100"
        >
          <option value="image">Image</option>
          <option value="video">Video</option>
        </select>
        <AdminUploadField
          label="File"
          value={upload.url}
          onChange={(url) => {
            const isVideo =
              url.includes('youtube') ||
              url.includes('youtu.be') ||
              url.includes('.mp4') ||
              url.startsWith('data:video')
            setUpload({ ...upload, url, type: isVideo ? 'video' : upload.type })
          }}
          accept="image/*,video/*"
          urlPlaceholder="Or paste image/video URL or YouTube embed"
          required
        />
        <input
          placeholder="Title"
          value={upload.title}
          onChange={(e) => setUpload({ ...upload, title: e.target.value })}
          className="w-full rounded-xl bg-black/30 px-3 py-3 text-zinc-100"
        />
        <input
          placeholder="Caption"
          value={upload.caption}
          onChange={(e) => setUpload({ ...upload, caption: e.target.value })}
          className="w-full rounded-xl bg-black/30 px-3 py-3 text-zinc-100"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={savingFile}
            className="rounded-xl bg-gold px-6 py-3 font-bold text-leaf-deep disabled:opacity-60"
          >
            {savingFile ? 'Saving...' : editingId ? 'Update file' : 'Save file'}
          </button>
          {editingId ? (
            <button type="button" onClick={resetUpload} className="rounded-xl bg-white/10 px-4 py-3 text-zinc-100">
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <form onSubmit={onSaveLanding} className="space-y-4">
        <section id="landing-product" className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-zinc-200">Landing product — title, price, photos</p>
          <p className="text-xs text-zinc-500">
            Tick the files to show on /offer. Orders use this title, price and the first ticked photo — not a Home product.
          </p>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zinc-400">Saved photos & videos</p>
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="text-gold"
                  onClick={() => setForm((prev) => ({ ...prev, offerMediaIds: sortedMedia.map((item) => item.id) }))}
                >
                  Select all
                </button>
                <button
                  type="button"
                  className="text-zinc-400"
                  onClick={() => setForm((prev) => ({ ...prev, offerMediaIds: [] }))}
                >
                  Clear
                </button>
              </div>
            </div>
            {sortedMedia.length === 0 ? (
              <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-zinc-500">
                Save a photo or video above. It will appear here.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {sortedMedia.map((item) => {
                  const selected = form.offerMediaIds.includes(item.id)
                  return (
                    <article
                      key={item.id}
                      className={cn(
                        'overflow-hidden rounded-2xl border',
                        selected ? 'border-gold ring-2 ring-gold/40' : 'border-white/10',
                      )}
                    >
                      <button type="button" className="block w-full text-left" onClick={() => toggleMedia(item.id)}>
                        {item.type === 'video' ? (
                          <div className="aspect-video bg-black">
                            {youtubeId(item.url) ? (
                              <iframe
                                className="size-full"
                                src={`https://www.youtube.com/embed/${youtubeId(item.url)}`}
                                title={item.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            ) : (
                              <video src={item.url} className="size-full object-cover" muted />
                            )}
                          </div>
                        ) : (
                          <img src={item.url} alt={item.title} className="aspect-video w-full object-cover" />
                        )}
                        <div className="flex items-start gap-2 p-3">
                          <input type="checkbox" readOnly checked={selected} className="mt-1" />
                          <div>
                            <p className="text-sm font-semibold text-zinc-100">{item.title || 'Untitled'}</p>
                            {item.caption ? <p className="text-xs text-zinc-400">{item.caption}</p> : null}
                          </div>
                        </div>
                      </button>
                      <div className="flex flex-wrap gap-3 px-3 pb-3 text-sm">
                        <button
                          type="button"
                          className="text-gold"
                          onClick={() => {
                            setNotice('')
                            setEditingId(item.id)
                            setUpload({
                              type: item.type,
                              url: item.url,
                              title: item.title,
                              caption: item.caption,
                              sortOrder: item.sortOrder,
                              active: item.active,
                            })
                            document.getElementById('upload-file')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" className="text-red-400" onClick={() => void onDelete(item)}>
                          Delete
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
          </div>

          <label className="block text-sm text-zinc-400">
            Product title
            <input
              value={form.offerTitle}
              onChange={(e) => setForm({ ...form, offerTitle: e.target.value })}
              placeholder="মিয়াজাকি আম (সূর্য ডিম)"
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-zinc-400">
              Landing price (৳)
              <input
                type="number"
                min={0}
                value={form.offerPrice || ''}
                onChange={(e) => setForm({ ...form, offerPrice: Number(e.target.value) })}
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
                required
              />
            </label>
            <label className="block text-sm text-zinc-400">
              Compare price (৳) — optional
              <input
                type="number"
                min={0}
                value={form.offerComparePrice ?? ''}
                onChange={(e) =>
                  setForm({ ...form, offerComparePrice: e.target.value === '' ? null : Number(e.target.value) })
                }
                className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
              />
            </label>
          </div>
          <label className="block text-sm text-zinc-400">
            Landing product
            <div className="mt-1 flex items-center gap-3 rounded-xl bg-[#0b1210] px-3 py-2">
              {landingCover?.url && landingCover.type === 'image' ? (
                <img src={landingCover.url} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-white/10 text-[10px] text-zinc-500">
                  Photo
                </span>
              )}
              <div className="relative min-w-0 flex-1">
                <select
                  value={landingCoverId}
                  onChange={(e) => selectLandingCover(e.target.value)}
                  className="admin-select w-full appearance-none rounded-xl bg-transparent py-2 pr-8 text-zinc-100"
                >
                  {landingChoices.length ? (
                    landingChoices.map((item) => (
                      <option key={item.id} value={item.id}>
                        {(form.offerTitle || item.title || 'Untitled').trim()} — {landingPriceLabel}
                      </option>
                    ))
                  ) : (
                    <option value="">
                      {(form.offerTitle || 'Set title and photos above').trim()} — {landingPriceLabel}
                    </option>
                  )}
                </select>
                <ChevronDown className="pointer-events-none absolute right-1 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gold px-6 py-3 font-bold text-leaf-deep disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-zinc-200">1. Hero — top green block</p>
          <p className="text-xs text-zinc-500">Product title is the big heading. Hero title is the small gold line above it if they differ.</p>
          <label className="block text-sm text-zinc-400">
            Hero title (small gold line)
            <input
              value={form.heroTitle}
              onChange={(e) => setForm({ ...form, heroTitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Hero subtitle
            <input
              value={form.heroSubtitle}
              onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Order button text
            <input
              value={form.ctaLabel}
              onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
            <span className="mt-1 block text-xs text-zinc-500">Used on hero buttons and on each photo. Empty hides those buttons.</span>
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-zinc-200">2. Package list</p>
          <label className="block text-sm text-zinc-400">
            Package title (white box)
            <input
              value={form.packageTitle}
              onChange={(e) => setForm({ ...form, packageTitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Package items (one per line)
            <textarea
              value={form.packageItems.join('\n')}
              onChange={(e) => setForm({ ...form, packageItems: e.target.value.split('\n') })}
              className="mt-1 min-h-40 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
            <span className="mt-1 block text-xs text-zinc-500">
              Number a line yourself with 1. 2. 3. Lines without a number show as headings. Use Title: details to split heading and description. Save after edit — deleted lines leave the landing page, changed lines update it.
            </span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-gold px-6 py-3 font-bold text-leaf-deep disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-zinc-200">3. Story + photos</p>
          <label className="block text-sm text-zinc-400">
            Story title
            <input
              value={form.storyTitle}
              onChange={(e) => setForm({ ...form, storyTitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Story body
            <textarea
              value={form.storyBody}
              onChange={(e) => setForm({ ...form, storyBody: e.target.value })}
              className="mt-1 min-h-28 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-zinc-200">4. Why us</p>
          <label className="block text-sm text-zinc-400">
            Why title
            <input
              value={form.whyTitle}
              onChange={(e) => setForm({ ...form, whyTitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Why items (one per line)
            <textarea
              value={form.whyItems.join('\n')}
              onChange={(e) => setForm({ ...form, whyItems: e.target.value.split('\n') })}
              className="mt-1 min-h-28 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-zinc-200">5. Gold help / phone block</p>
          <label className="block text-sm text-zinc-400">
            Help title
            <input
              value={form.helpTitle}
              onChange={(e) => setForm({ ...form, helpTitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Help subtitle
            <input
              value={form.helpSubtitle}
              onChange={(e) => setForm({ ...form, helpSubtitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Payment / WhatsApp title
            <input
              value={form.paymentTitle}
              onChange={(e) => setForm({ ...form, paymentTitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Help / order phones
            <input
              value={form.paymentNumber}
              onChange={(e) => setForm({ ...form, paymentNumber: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Payment note
            <textarea
              value={form.paymentNote}
              onChange={(e) => setForm({ ...form, paymentNote: e.target.value })}
              className="mt-1 min-h-20 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
        </section>

        <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold text-zinc-200">6. Checkout form</p>
          <label className="block text-sm text-zinc-400">
            Checkout title
            <input
              value={form.checkoutTitle}
              onChange={(e) => setForm({ ...form, checkoutTitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Billing box title
            <input
              value={form.checkoutBillingTitle}
              onChange={(e) => setForm({ ...form, checkoutBillingTitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Order box title
            <input
              value={form.checkoutOrderTitle}
              onChange={(e) => setForm({ ...form, checkoutOrderTitle: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Place order button
            <input
              value={form.checkoutSubmitLabel}
              onChange={(e) => setForm({ ...form, checkoutSubmitLabel: e.target.value })}
              className="mt-1 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
          <label className="block text-sm text-zinc-400">
            Cash on delivery note
            <textarea
              value={form.checkoutCodNote}
              onChange={(e) => setForm({ ...form, checkoutCodNote: e.target.value })}
              className="mt-1 min-h-20 w-full rounded-xl bg-white/5 px-3 py-3 text-zinc-100"
            />
          </label>
        </section>

        <section className="space-y-3 rounded-2xl border border-gold/30 bg-gold/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Facebook ads</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={landingUrl}
              className="w-full rounded-xl bg-black/30 px-3 py-3 text-sm text-zinc-100"
            />
            <button
              type="button"
              onClick={() => void copyLandingUrl()}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-leaf-deep"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? 'Copied' : 'Copy URL'}
            </button>
          </div>
          <label className="block text-sm text-zinc-300">
            Meta Pixel ID
            <input
              value={form.metaPixelId}
              onChange={(e) => setForm({ ...form, metaPixelId: e.target.value.replace(/\s/g, '') })}
              placeholder="Paste from Meta Events Manager"
              className="mt-1 w-full rounded-xl bg-black/30 px-3 py-3 text-zinc-100"
            />
          </label>
        </section>

        <ShopSettingsFields form={siteForm} onChange={setSiteForm} />

        <button type="submit" disabled={saving} className="rounded-xl bg-gold px-6 py-3 font-bold text-leaf-deep disabled:opacity-60">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}
