import { useState } from 'react'
import { uploadMediaFile } from '@/lib/cloud'

type FieldProps = {
  label: string
  value: string
  onChange: (url: string) => void
  onBusy?: (busy: boolean) => void
  accept?: string
  urlPlaceholder?: string
  required?: boolean
}

export function AdminUploadField({
  label,
  value,
  onChange,
  onBusy,
  accept = 'image/*',
  urlPlaceholder = 'Or paste image URL',
  required,
}: FieldProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const looksLikeVideo =
    accept.includes('video') &&
    (value.includes('youtube') || value.includes('youtu.be') || value.includes('.mp4') || value.startsWith('data:video'))

  async function onFile(file: File | undefined) {
    if (!file) return
    setError('')
    setUploading(true)
    onBusy?.(true)
    try {
      onChange(await uploadMediaFile(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Try a smaller file or paste a URL.')
    } finally {
      setUploading(false)
      onBusy?.(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-sm font-semibold text-gold">{label}</p>
      {value && !looksLikeVideo ? (
        <img src={value} alt="" className="h-32 w-full rounded-xl object-cover" />
      ) : null}
      {value && looksLikeVideo ? (
        <p className="rounded-xl bg-black/40 px-3 py-6 text-center text-sm text-zinc-400">Video selected</p>
      ) : null}
      <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-gold/50 bg-leaf/40 px-3 py-3 text-sm font-semibold text-gold">
        {uploading ? 'Uploading...' : 'Upload'}
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            void onFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
      </label>
      <input
        placeholder={urlPlaceholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl bg-black/30 px-3 py-2"
        required={required}
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}

export function AdminGalleryUpload({
  label = 'Gallery',
  value,
  onChange,
}: {
  label?: string
  value: string
  onChange: (text: string) => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const urls = value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  async function onFiles(files: FileList | null) {
    if (!files?.length) return
    setError('')
    setUploading(true)
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        uploaded.push(await uploadMediaFile(file))
      }
      onChange([...urls, ...uploaded].join('\n'))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Try a smaller image or paste URLs.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/10 bg-black/20 p-3">
      <p className="text-sm font-semibold text-gold">{label}</p>
      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {urls.map((url) => (
            <img key={url} src={url} alt="" className="aspect-square rounded-lg object-cover" />
          ))}
        </div>
      )}
      <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-gold/50 bg-leaf/40 px-3 py-3 text-sm font-semibold text-gold">
        {uploading ? 'Uploading...' : 'Upload'}
        <input
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(event) => {
            void onFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </label>
      <textarea
        placeholder="Or paste gallery URLs (one per line)"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-20 w-full rounded-xl bg-black/30 px-3 py-2"
      />
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  )
}
