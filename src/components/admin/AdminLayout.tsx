import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Package,
  ShoppingBag,
  UserCog,
  Users,
  PanelsTopLeft,
  X,
} from 'lucide-react'
import { ConfirmProvider } from '@/components/admin/ConfirmDialog'
import { LogoMark } from '@/components/brand/LogoMark'
import { useAuth } from '@/context/AuthContext'
import { useStore } from '@/context/StoreContext'
import { normalizeSite } from '@/lib/seed'
import { cn } from '@/lib/utils'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/messages', label: 'Messages', icon: Mail },
  { to: '/admin/landing', label: 'Landing page', icon: Megaphone },
  { to: '/admin/carousel', label: 'Carousel', icon: PanelsTopLeft },
  { to: '/admin/account', label: 'Admin account', icon: UserCog },
]

export function AdminLayout() {
  const { isAdmin, ready, logout } = useAuth()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const current = links.find((link) =>
    link.end ? pathname === link.to : pathname.startsWith(link.to),
  )

  if (!ready) {
    return (
      <div className="grid min-h-svh place-items-center bg-[#0b1310] text-gold">
        Checking login...
      </div>
    )
  }

  if (!isAdmin) return <Navigate to="/admin/login" replace />

  return (
    <ConfirmProvider>
      <AdminShell
        current={current}
        logout={logout}
        open={open}
        setOpen={setOpen}
      />
    </ConfirmProvider>
  )
}

function AdminShell({
  current,
  logout,
  open,
  setOpen,
}: {
  current: (typeof links)[number] | undefined
  logout: () => Promise<void>
  open: boolean
  setOpen: (value: boolean | ((prev: boolean) => boolean)) => void
}) {
  const { syncError, messages, orders, site: rawSite, loading } = useStore()
  const site = normalizeSite(rawSite)
  const unread = (messages ?? []).filter((item) => !item.read).length
  const pendingOrders = orders.filter((order) => order.status === 'pending').length

  return (
    <div className="relative min-h-svh overflow-x-hidden bg-[#0b1310] text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(240,196,25,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(21,122,75,0.18),transparent_40%)]" />
      <div className="relative mx-auto flex max-w-7xl gap-0 md:gap-6">
        <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col border-r border-gold/10 bg-[#101a16]/80 p-5 backdrop-blur md:flex">
          <div className="mb-8 flex items-center gap-3">
            <LogoMark className="size-12" />
            <div>
              <p className="font-display text-xl leading-none text-gold">{site.name}</p>
              <p className="mt-1 text-[11px] tracking-[0.18em] text-zinc-500 uppercase">Admin panel</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition',
                    isActive
                      ? 'bg-gold text-leaf-deep shadow-lg shadow-gold/10'
                      : 'text-zinc-300 hover:bg-white/5 hover:text-white',
                  )
                }
              >
                <link.icon className="size-4" />
                <span className="flex-1">{link.label}</span>
                {link.to === '/admin/messages' && unread > 0 ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-leaf-deep px-1.5 text-[10px] font-bold text-gold">
                    {unread}
                  </span>
                ) : null}
                {link.to === '/admin/orders' && pendingOrders > 0 ? (
                  <span className="grid min-w-5 place-items-center rounded-full bg-amber-400 px-1.5 text-[10px] font-bold text-leaf-deep">
                    {pendingOrders}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <a
            href="/"
            className="mb-2 rounded-2xl px-3 py-2 text-sm text-zinc-400 hover:bg-white/5 hover:text-gold"
          >
            ← Back to shop
          </a>
          <button
            type="button"
            onClick={() => void logout()}
            className="flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-red-300 hover:bg-red-400/10"
          >
            <LogOut className="size-4" />
            Logout
          </button>
        </aside>
        <div className="min-w-0 flex-1 p-4 md:p-8">
          <div className="relative mb-4 md:hidden">
            <div className="flex items-center justify-between rounded-2xl border border-gold/40 bg-leaf px-3 py-2 shadow-lg shadow-gold/10">
              <div className="flex min-w-0 items-center gap-2">
                <LogoMark className="size-9" />
                <p className="truncate font-semibold text-gold">{current?.label ?? 'Menu'}</p>
              </div>
              <button
                type="button"
                className="rounded-xl bg-gold/15 p-2 text-gold"
                onClick={() => setOpen((value) => !value)}
                aria-label="Admin menu"
              >
                {open ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
            {open && (
              <nav className="absolute inset-x-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-white/10 bg-[#121c18] p-2 shadow-xl">
                {links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 rounded-xl px-3 py-3 text-sm',
                        isActive ? 'bg-gold text-leaf-deep' : 'hover:bg-white/5',
                      )
                    }
                  >
                    <link.icon className="size-4" />
                    {link.label}
                    {link.to === '/admin/messages' && unread > 0 ? ` (${unread})` : ''}
                    {link.to === '/admin/orders' && pendingOrders > 0 ? ` (${pendingOrders})` : ''}
                  </NavLink>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    void logout()
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm text-red-300 hover:bg-white/5"
                >
                  <LogOut className="size-4" />
                  Logout
                </button>
              </nav>
            )}
          </div>
          {syncError ? (
            <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
              Saved on this device. Cloud sync: {syncError}
            </p>
          ) : null}
          {loading ? (
            <p className="mb-4 rounded-xl border border-gold/20 bg-black/20 px-3 py-2 text-sm text-gold">
              Loading live website data...
            </p>
          ) : null}
          <Outlet />
        </div>
      </div>
    </div>
  )
}
