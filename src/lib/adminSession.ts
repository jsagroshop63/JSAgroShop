import { supabase } from './supabase'
import { withTimeout } from './timeout'

const EMAIL_KEY = 'js-agro-admin-email'
const PASS_KEY = 'js-agro-admin-pass'
const envEmail = import.meta.env.VITE_ADMIN_EMAIL || 'jsagroshop63@gmail.com'
const envPassword = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'
const LOGIN_ERROR = 'Cloud login timed out. Wait 30 seconds, then click Save again.'

let inflight: Promise<void> | null = null

export function rememberAdminLogin(email: string, password: string) {
  sessionStorage.setItem(EMAIL_KEY, email.trim())
  sessionStorage.setItem(PASS_KEY, password)
}

export function forgetAdminLogin() {
  sessionStorage.removeItem(EMAIL_KEY)
  sessionStorage.removeItem(PASS_KEY)
}

async function signIn(email: string, password: string) {
  if (!supabase) return false
  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      10000,
      'timeout',
    )
    return !error && Boolean(data.session)
  } catch {
    return false
  }
}

async function connect() {
  if (!supabase) return
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session) return
  } catch {
    /* try password sign-in */
  }

  const email = (sessionStorage.getItem(EMAIL_KEY) || envEmail).trim()
  const typed = sessionStorage.getItem(PASS_KEY) || ''
  const passwords = [envPassword, typed].filter((item, index, list) => item && list.indexOf(item) === index)

  for (let attempt = 0; attempt < 2; attempt++) {
    for (const password of passwords) {
      if (await signIn(email, password)) return
    }
    try {
      const { data } = await supabase.auth.getSession()
      if (data.session) return
    } catch {
      /* continue */
    }
    if (attempt < 1) await new Promise((resolve) => setTimeout(resolve, 3000))
  }

  throw new Error(LOGIN_ERROR)
}

export async function ensureAdminSession() {
  if (!supabase) return
  try {
    const { data } = await supabase.auth.getSession()
    if (data.session) return
  } catch {
    /* continue */
  }
  if (inflight) return inflight
  inflight = withTimeout(connect(), 20000, LOGIN_ERROR).finally(() => {
    inflight = null
  })
  return inflight
}
