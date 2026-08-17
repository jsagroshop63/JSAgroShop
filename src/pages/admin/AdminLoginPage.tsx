import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { LogoMark } from '@/components/brand/LogoMark'
import { useAuth } from '@/context/AuthContext'
import { SITE } from '@/lib/seed'

export function AdminLoginPage() {
  const { isAdmin, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (isAdmin) return <Navigate to="/admin" replace />

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    const message = await login(email, password)
    setError(message ?? '')
    setLoading(false)
  }

  return (
    <div className="relative grid min-h-svh place-items-center overflow-hidden bg-leaf-deep px-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(240,196,25,0.16),transparent_36%)]" />
      <form
        onSubmit={onSubmit}
        className="relative w-full max-w-md rounded-3xl border border-gold/20 bg-white p-8 text-ink shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <LogoMark className="size-16" />
          <h1 className="font-display mt-4 text-3xl text-leaf">{SITE.name}</h1>
          <p className="mt-1 text-sm text-ink/60">Admin dashboard login</p>
        </div>
        <label className="mt-6 block text-sm font-semibold">
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border px-4 py-3"
          />
        </label>
        <label className="mt-4 block text-sm font-semibold">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border px-4 py-3"
          />
        </label>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-leaf py-3 font-bold text-gold"
        >
          {loading ? 'Checking...' : 'Login'}
        </button>
        <p className="mt-4 text-center text-xs text-ink/50">Use the admin email and password from Supabase.</p>
      </form>
    </div>
  )
}
