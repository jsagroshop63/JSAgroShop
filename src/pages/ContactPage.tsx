import { useState, type FormEvent } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import { useStore } from '@/context/StoreContext'
import { siteWhatsapp } from '@/lib/seed'
import { isValidBdPhone, normalizeBdPhone } from '@/lib/utils'

export function ContactPage() {
  const { addMessage, site } = useStore()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sending, setSending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (name.trim().length < 2) return setError('আপনার নাম লিখুন')
    if (!isValidBdPhone(phone)) return setError('সঠিক মোবাইল নম্বর দিন')
    if (message.trim().length < 5) return setError('মেসেজ লিখুন')
    setSending(true)
    await addMessage({
      name: name.trim(),
      phone: normalizeBdPhone(phone),
      email: email.trim(),
      message: message.trim(),
    })
    setSending(false)
    setDone(true)
    setName('')
    setPhone('')
    setEmail('')
    setMessage('')
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 text-center">
      <h1 className="font-display text-4xl text-leaf">যোগাযোগ</h1>
      <p className="mx-auto mt-2 max-w-2xl text-ink/70">
        গাছ, ডেলিভারি বা অর্ডার নিয়ে যেকোনো প্রশ্ন থাকলে কল/WhatsApp/Imo করুন। {site.slogan}।
      </p>
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4 rounded-3xl bg-white p-8 shadow-sm">
          <p className="flex items-start justify-center gap-3">
            <MapPin className="mt-1 shrink-0 text-leaf-mid" />
            {site.address}
          </p>
          <p className="flex items-start justify-center gap-3">
            <Phone className="mt-1 shrink-0 text-leaf-mid" />
            <span>
              <a href={`tel:${site.phone2.replace(/[\s-]/g, '')}`}>{site.phone2}</a> (WhatsApp / Imo)
              <br />
              <a href={`tel:${site.phone.replace(/[\s-]/g, '')}`}>{site.phone}</a> (WhatsApp / Imo)
            </span>
          </p>
          <p className="flex items-start justify-center gap-3">
            <Mail className="mt-1 shrink-0 text-leaf-mid" />
            {site.email}
          </p>
          <p className="text-sm text-ink/60">{site.hours}</p>
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://wa.me/${siteWhatsapp(site)}`}
              className="rounded-full bg-[#25D366] px-3 py-3 text-center text-sm font-bold text-white sm:px-5 sm:text-base"
            >
              WhatsApp / Imo
            </a>
            <a
              href={site.facebook}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-[#1877F2] px-3 py-3 text-center text-sm font-bold text-white sm:px-5 sm:text-base"
            >
              Facebook পেজ
            </a>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-3 border-t border-leaf/10 pt-6">
            <h2 className="text-xl font-bold text-leaf">মেসেজ পাঠান</h2>
            {done && (
              <p className="rounded-xl bg-leaf-light px-3 py-2 text-sm font-semibold text-leaf">
                মেসেজ পাঠানো হয়েছে। অ্যাডমিন প্যানেলে দেখা যাবে।
              </p>
            )}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="আপনার নাম *"
              className="w-full rounded-xl border border-leaf/20 px-4 py-3"
              required
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="মোবাইল নম্বর *"
              className="w-full rounded-xl border border-leaf/20 px-4 py-3"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ইমেইল (ঐচ্ছিক)"
              className="w-full rounded-xl border border-leaf/20 px-4 py-3"
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="আপনার মেসেজ *"
              className="min-h-28 w-full rounded-xl border border-leaf/20 px-4 py-3"
              required
            />
            {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={sending}
              className="w-full rounded-xl bg-leaf py-3 font-bold text-gold disabled:opacity-60"
            >
              {sending ? 'পাঠানো হচ্ছে...' : 'মেসেজ পাঠান'}
            </button>
          </form>
        </div>
        <div className="overflow-hidden rounded-3xl bg-leaf-light">
          <iframe
            title="map"
            className="h-[32rem] w-full border-0 lg:h-full"
            loading="lazy"
            src="https://maps.google.com/maps?q=Natore%20Sadar%20Bangladesh&t=&z=12&ie=UTF8&iwloc=&output=embed"
          />
        </div>
      </div>
    </div>
  )
}
