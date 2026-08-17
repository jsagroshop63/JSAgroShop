import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { LogoMark } from '@/components/brand/LogoMark'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { useCart } from '@/context/CartContext'
import { useStore } from '@/context/StoreContext'
import { normalizeSite, siteWhatsapp } from '@/lib/seed'
import { cn } from '@/lib/utils'

const links = [
  { to: '/', label: 'HOME' },
  { to: '/contact', label: 'CONTACT' },
  { to: '/cart', label: 'CART' },
]

function telHref(phone: string) {
  return `tel:${phone.replace(/[\s-]/g, '')}`
}

export function Layout({ children }: { children: ReactNode }) {
  const { count } = useCart()
  const { site: rawSite } = useStore()
  const site = normalizeSite(rawSite)
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-svh bg-cream pb-[calc(80px+env(safe-area-inset-bottom,0px))] text-ink lg:pb-0">
      <header className="border-b border-leaf/10 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 sm:gap-3">
            <LogoMark className="h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem] lg:h-20 lg:w-20" />
            <span className="block truncate text-xl font-extrabold leading-none tracking-tight text-leaf sm:text-3xl">{site.name}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'rounded-full px-4 py-2 text-sm font-bold tracking-wider',
                    isActive ? 'bg-leaf text-gold' : 'text-leaf hover:bg-leaf-light',
                  )
                }
              >
                {link.label}
                {link.to === '/cart' && count > 0 ? ` (${count})` : ''}
              </NavLink>
            ))}
            <Link
              to="/offer"
              className="ml-2 rounded-full bg-gold px-4 py-2 text-sm font-bold text-leaf-deep shadow-sm hover:bg-gold-dark"
            >
              {site.headerOfferLabel}
            </Link>
          </nav>

          <button
            type="button"
            className="rounded-full border border-leaf/20 p-2 text-leaf lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="মেনু"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && (
          <div className="border-t border-leaf/10 bg-white px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-3 font-bold text-leaf"
                >
                  {link.label}
                </NavLink>
              ))}
              <Link
                to="/offer"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-gold px-3 py-3 text-center font-bold text-leaf-deep"
              >
                {site.headerOfferLabel}
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="mt-16 bg-leaf-deep text-cream">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 text-center lg:grid-cols-4 lg:gap-10 lg:py-14">
          <div className="col-span-2">
            <p className="font-display text-2xl text-gold lg:text-3xl">{site.name}</p>
            <p className="mx-auto mt-3 max-w-md text-cream/80">{site.tagline}</p>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-cream/70">
              {site.slogan}. {site.about}
            </p>
          </div>
          <div>
            <p className="mb-3 font-bold text-gold">লিংক</p>
            <div className="flex flex-col items-center gap-0.5 text-sm leading-tight">
              <Link to="/">হোম</Link>
              <Link to="/offer">ল্যান্ডিং অফার</Link>
              <Link to="/contact">যোগাযোগ</Link>
              <a
                href={site.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-gold underline underline-offset-2"
              >
                Facebook পেজ
              </a>
            </div>
          </div>
          <div>
            <p className="mb-3 font-bold text-gold">যোগাযোগ</p>
            <p className="text-sm">{site.address}</p>
            <p className="text-sm">
              <a href={telHref(site.phone2)}>{site.phone2}</a> (WhatsApp)
            </p>
            <p className="text-sm">
              <a href={telHref(site.phone)}>{site.phone}</a> (WhatsApp)
            </p>
          </div>
        </div>
        <div className="border-t border-white/10 py-4 text-center text-xs text-cream/60">
          © {new Date().getFullYear()} {site.nameEn}. All rights reserved.
        </div>
      </footer>

      <MobileBottomNav />

      <a
        href={`https://wa.me/${siteWhatsapp(site)}`}
        target="_blank"
        rel="noreferrer"
        className="fixed right-3 z-[1002] grid size-14 place-items-center rounded-full bg-[#25D366] text-white shadow-xl animate-wa-bounce bottom-[calc(72px+env(safe-area-inset-bottom,0px))] lg:bottom-5 lg:right-5"
        aria-label="WhatsApp"
      >
        <svg viewBox="0 0 24 24" className="size-8 fill-current" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
        </svg>
      </a>
    </div>
  )
}
