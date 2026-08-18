import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cloudBusyMessage, isCloudCooling, noteCloudBusy } from './cmsSync'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

function abortAfter(ms: number, parent?: AbortSignal | null) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  if (parent) {
    if (parent.aborted) controller.abort()
    else parent.addEventListener('abort', () => controller.abort(), { once: true })
  }
  return {
    signal: controller.signal,
    stop() {
      clearTimeout(timer)
    },
  }
}

function busyStatus(status: number) {
  return status === 502 || status === 503 || status === 504
}

async function fetchWithRetry(input: RequestInfo | URL, init?: RequestInit) {
  const method = (init?.method || 'GET').toUpperCase()
  const href = String(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
  const storage = href.includes('/storage/v1/')
  const auth = href.includes('/auth/v1/')
  const timeoutMs = storage ? 90000 : auth ? 8000 : method === 'GET' || method === 'HEAD' ? 10000 : 15000
  const isRead = method === 'GET' || method === 'HEAD'
  if (isCloudCooling()) {
    throw new Error(cloudBusyMessage())
  }
  const retries = storage ? 2 : 1
  let lastError: unknown
  for (let i = 0; i <= retries; i++) {
    if (i > 0 && isCloudCooling() && isRead) throw new Error(cloudBusyMessage())
    const gate = abortAfter(timeoutMs, init?.signal)
    try {
      const response = await fetch(input, { ...init, signal: gate.signal })
      if (!busyStatus(response.status)) {
        return response
      }
      noteCloudBusy(30000)
      lastError = new Error(cloudBusyMessage())
    } catch (error) {
      lastError = error
      if (error instanceof Error && /503|502|504|timeout|timed out|abort/i.test(error.message)) {
        noteCloudBusy(30000)
      }
    } finally {
      gate.stop()
    }
    if (i < retries) await new Promise((resolve) => setTimeout(resolve, 3000))
  }
  if (lastError instanceof Error) {
    throw /503|502|504/.test(lastError.message) ? new Error(cloudBusyMessage()) : lastError
  }
  throw new Error(cloudBusyMessage())
}

export const isSupabaseEnabled = Boolean(url && key)

export const supabaseUrl = url || ''

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url!, key!, {
      global: { fetch: fetchWithRetry },
    })
  : null

if (typeof window !== 'undefined' && url) {
  const ref = new URL(url).hostname.split('.')[0]
  for (const keyName of Object.keys(localStorage)) {
    if (keyName.startsWith('sb-') && keyName.includes('-auth-token') && !keyName.includes(ref)) {
      localStorage.removeItem(keyName)
    }
  }
}
