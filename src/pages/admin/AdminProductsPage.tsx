import { useState, type FormEvent } from 'react'
import { useConfirm } from '@/components/admin/ConfirmDialog'
import { AdminGalleryUpload, AdminUploadField } from '@/components/admin/AdminUploadField'
import { SafeImage } from '@/components/ui/SafeImage'
import { useStore } from '@/context/StoreContext'
import { catalogProducts } from '@/lib/seed'
import type { Product } from '@/lib/types'
import { formatTaka, uid } from '@/lib/utils'

const empty: Omit<Product, 'id' | 'createdAt'> = {
  name: '',
  headline: '',
  description: '',
  price: 0,
  comparePrice: null,
  image: '',
  gallery: [],
  category: '',
  stock: 0,
  featured: false,
}

export function AdminProductsPage() {
  const { products, saveProduct, deleteProduct } = useStore()
  const catalog = catalogProducts(products)
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState(empty)
  const [galleryText, setGalleryText] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  function startEdit(product?: Product) {
    setNotice('')
    setError('')
    if (product) {
      setEditing(product)
      setForm({
        name: product.name,
        headline: product.headline,
        description: product.description,
        price: product.price,
        comparePrice: product.comparePrice,
        image: product.image,
        gallery: product.gallery,
        category: product.category,
        stock: product.stock,
        featured: product.featured,
      })
      setGalleryText(product.gallery.join('\n'))
    } else {
      setEditing(null)
      setForm(empty)
      setGalleryText('')
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setNotice('')
    setError('')
    try {
      const product: Product = {
        id: editing?.id ?? uid('prod'),
        createdAt: editing?.createdAt ?? new Date().toISOString(),
        ...form,
        gallery: galleryText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
      }
      await saveProduct(product)
      const message = editing ? 'Product updated.' : 'Product saved.'
      setEditing(null)
      setForm(empty)
      setGalleryText('')
      setNotice(message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(product: Product) {
    if (!(await confirm(`Delete ${product.name}? This cannot be undone.`))) return
    await deleteProduct(product.id)
    if (editing?.id === product.id) startEdit()
    setNotice('Product deleted.')
    setError('')
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="font-display text-3xl text-gold">Products</h1>
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-zinc-400">
              <tr>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Stock</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((product) => (
                <tr key={product.id} className="border-t border-white/10">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <SafeImage src={product.image} alt="" className="size-12 rounded-lg object-cover" />
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-xs text-zinc-400">{product.headline}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{formatTaka(product.price)}</td>
                  <td className="px-3 py-2">{product.stock}</td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="mr-3 text-gold" onClick={() => startEdit(product)}>
                      Edit
                    </button>
                    <button type="button" className="text-red-400" onClick={() => void onDelete(product)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h2 className="font-semibold">{editing ? 'Edit product' : 'New product'}</h2>
        {notice ? <p className="text-sm font-semibold text-emerald-400">{notice}</p> : null}
        {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-xl bg-black/30 px-3 py-2"
          required
        />
        <input
          placeholder="Headline"
          value={form.headline}
          onChange={(e) => setForm({ ...form, headline: e.target.value })}
          className="w-full rounded-xl bg-black/30 px-3 py-2"
        />
        <textarea
          placeholder="Description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="min-h-24 w-full rounded-xl bg-black/30 px-3 py-2"
        />
        <input
          placeholder="Category"
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="w-full rounded-xl bg-black/30 px-3 py-2"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Price"
            value={form.price || ''}
            onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
            className="rounded-xl bg-black/30 px-3 py-2"
            required
          />
          <input
            type="number"
            placeholder="Compare price"
            value={form.comparePrice ?? ''}
            onChange={(e) => setForm({ ...form, comparePrice: e.target.value ? Number(e.target.value) : null })}
            className="rounded-xl bg-black/30 px-3 py-2"
          />
        </div>
        <input
          type="number"
          placeholder="Stock"
          value={form.stock || ''}
          onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          className="w-full rounded-xl bg-black/30 px-3 py-2"
        />

        <AdminUploadField
          label="Main image"
          value={form.image}
          onChange={(image) => setForm({ ...form, image })}
          required
        />
        <AdminGalleryUpload value={galleryText} onChange={setGalleryText} />

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          />
          Featured
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 rounded-xl bg-gold py-2 font-bold text-leaf-deep disabled:opacity-60"
          >
            {saving ? 'Saving...' : editing ? 'Update' : 'Save'}
          </button>
          {editing && (
            <button type="button" onClick={() => startEdit()} className="rounded-xl bg-white/10 px-3">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
