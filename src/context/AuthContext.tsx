import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { isSupabaseEnabled, supabase } from '@/lib/supabase'
import { enableAdminAlerts } from '@/lib/orderAlert'

const KEY = 'js-agro-shop-admin'
const demoEmail = import.meta.env.VITE_ADMIN_EMAIL || 'jsagroshop63@gmail.com'
const demoPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'

type AuthContextValue = {
  isAdmin: boolean
  ready: boolean
  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>
  changePassword: (currentPassword: string, nextPassword: string) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function isDemoLogin(email: string, password: string) {
  if (import.meta.env.PROD || isSupabaseEnabled) return false
  return email.trim().toLowerCase() === demoEmail.toLowerCase() && password === demoPassword
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [ready, setReady] = useState(!isSupabaseEnabled)

  useEffect(() => {
    if (!supabase) {
      setIsAdmin(localStorage.getItem(KEY) === '1')
      setReady(true)
      return
    }
    let cancelled = false
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      const ok = Boolean(data.session)
      setIsAdmin(ok)
      if (ok) localStorage.setItem(KEY, '1')
      else localStorage.removeItem(KEY)
      setReady(true)
    })
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        localStorage.setItem(KEY, '1')
        setIsAdmin(true)
        return
      }
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem(KEY)
        setIsAdmin(false)
      }
    })
    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const user = email.trim()
    const pass = password.trim()
    if (!user || !pass) return 'Enter email and password.'
    if (supabase) {
      const { error } = await supabase.auth.signInWithPassword({ email: user, password: pass })
      if (error) {
        return error.message.includes('Invalid login')
          ? 'Incorrect email or password. Use the Supabase admin user, not the old demo password.'
          : error.message
      }
      localStorage.setItem(KEY, '1')
      setIsAdmin(true)
      void enableAdminAlerts(true)
      return null
    }
    if (!isDemoLogin(user, pass)) return 'Incorrect email or password'
    localStorage.setItem(KEY, '1')
    setIsAdmin(true)
    void enableAdminAlerts(true)
    return null
  }, [])

  const changePassword = useCallback(async (currentPassword: string, nextPassword: string) => {
    if (!supabase) return 'Cloud login is not connected, so the password cannot be changed here.'
    const { data } = await supabase.auth.getUser()
    const email = data.user?.email
    if (!email) return 'Log in again with your admin email, then change the password.'
    const { error: checkError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (checkError) return 'Current password is incorrect.'
    const { error } = await supabase.auth.updateUser({ password: nextPassword })
    return error?.message ?? null
  }, [])

  const logout = useCallback(async () => {
    localStorage.removeItem(KEY)
    setIsAdmin(false)
    await supabase?.auth.signOut()
  }, [])

  const value = useMemo(
    () => ({ isAdmin, ready, login, logout, changePassword }),
    [isAdmin, ready, login, logout, changePassword],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
