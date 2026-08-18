import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'

const USERS_URL = 'https://supabase.com/dashboard/project/btwsstaroldoghokfqtm/auth/users'

export function AdminAccountPage() {
  const { changePassword } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!saving) return
    const timer = window.setTimeout(() => {
      setSaving(false)
      setError('Save timed out. Click Save again.')
    }, 20000)
    return () => window.clearTimeout(timer)
  }, [saving])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setNotice('')
    setError('')
    if (nextPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (nextPassword !== confirmPassword) {
      setError('New password and confirm password do not match.')
      return
    }
    setSaving(true)
    try {
      const message = await changePassword(currentPassword, nextPassword)
      if (message) {
        setError(message)
        return
      }
      setCurrentPassword('')
      setNextPassword('')
      setConfirmPassword('')
      setNotice('Password changed. Use the new password next time you log in.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-3xl text-gold">Admin account</h1>
      <p className="text-sm text-zinc-300">Change the login password for the admin you are using now.</p>

      <form onSubmit={onSubmit} className="rounded-2xl border border-gold/30 bg-gold/10 p-5 space-y-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Change password</p>
        {notice ? <p className="text-sm font-semibold text-emerald-400">{notice}</p> : null}
        {error ? <p className="text-sm font-semibold text-red-400">{error}</p> : null}
        <label className="block text-sm text-zinc-300">
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-xl bg-black/30 px-3 py-3 text-zinc-100"
            autoComplete="current-password"
            required
          />
        </label>
        <label className="block text-sm text-zinc-300">
          New password
          <input
            type="password"
            value={nextPassword}
            onChange={(e) => setNextPassword(e.target.value)}
            className="mt-1 w-full rounded-xl bg-black/30 px-3 py-3 text-zinc-100"
            autoComplete="new-password"
            required
          />
        </label>
        <label className="block text-sm text-zinc-300">
          Confirm new password
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full rounded-xl bg-black/30 px-3 py-3 text-zinc-100"
            autoComplete="new-password"
            required
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-gold px-5 py-3 text-sm font-bold text-leaf-deep disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save password'}
        </button>
      </form>

      <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 space-y-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-zinc-400 uppercase">Or change it in Supabase</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-200">
          <li>Open Authentication → Users.</li>
          <li>Click the admin email.</li>
          <li>Send password recovery, or delete and recreate the user with a new password.</li>
        </ol>
        <a
          href={USERS_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-cream hover:bg-white/5"
        >
          Open Supabase users
        </a>
      </section>
    </div>
  )
}
