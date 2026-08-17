import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isSupabaseEnabled = Boolean(url && key)

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(url!, key!, {
      global: {
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    })
  : null
