import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ensureAdminSession, forgetAdminLogin, rememberAdminLogin } from '@/lib/adminSession'
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

function matchesAdminEmail(email: string) {
  return email.trim().toLowerCase() === demoEmail.toLowerCase()
}

function matchesEnvAdmin(email: string, password: string) {
  return matchesAdminEmail(email) && password === demoPassword
}

function retryCloudLogin() {
  let tries = 0
  const tick = () => {
    tries += 1
    void ensureAdminSession().catch(() => {
      if (tries < 12) window.setTimeout(tick, 20000)
    })
  }
  window.setTimeout(tick, 2000)
}

async function withTimeout<T>(task: Promise<T>, ms: number, label: string) {
  let timer = 0
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => reject(new Error(label)), ms)
      }),
    ])
  } finally {
    window.clearTimeout(timer)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(KEY) === '1')
  const [ready, setReady] = useState(!isSupabaseEnabled)

  useEffect(() => {
    if (!supabase) {
      setIsAdmin(localStorage.getItem(KEY) === '1')
      setReady(true)
      return
    }
    let cancelled = false
    const timeout = window.setTimeout(() => {
      if (!cancelled) setReady(true)
    }, 8000)
    void supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return
      if (data.session) {
        localStorage.setItem(KEY, '1')
        setIsAdmin(true)
      } else {
        try {
          await ensureAdminSession()
          const { data: again } = await supabase.auth.getSession()
          if (again.session) {
            localStorage.setItem(KEY, '1')
            setIsAdmin(true)
          } else {
            localStorage.removeItem(KEY)
            setIsAdmin(false)
          }
        } catch {
          localStorage.removeItem(KEY)
          setIsAdmin(false)
        }
      }
      if (!cancelled) setReady(true)
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
      window.clearTimeout(timeout)
      data.subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const user = email.trim()
    const pass = password.trim()
    if (!user || !pass) return 'Enter email and password.'
    const enterLocal = () => {
      localStorage.setItem(KEY, '1')
      setIsAdmin(true)
      void enableAdminAlerts(true)
    }
    if (supabase) {
      try {
        const { error } = await withTimeout(
          supabase.auth.signInWithPassword({ email: user, password: pass }),
          12000,
          'HTTP 504',
        )
        if (!error) {
          rememberAdminLogin(user, pass)
          enterLocal()
          return null
        }
        if (/invalid login|invalid credentials/i.test(error.message)) {
          return 'This email is not in the current Supabase project. Add it under Authentication → Users, then log in again.'
        }
        return error.message
      } catch {
        if (matchesEnvAdmin(user, pass)) {
          rememberAdminLogin(user, pass)
          enterLocal()
          retryCloudLogin()
          return 'Cloud is slow. You are in the panel, but Save/upload needs a real Supabase user.'
        }
        return 'Cloud is slow. Try Login again in a minute.'
      }
    }
    if (!matchesEnvAdmin(user, pass)) return 'Incorrect email or password'
    enterLocal()
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
    forgetAdminLogin()
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
