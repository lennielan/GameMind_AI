import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// In the main process, we might not always have these env vars immediately if they are missing.
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false // Main process doesn't need to persist it, renderer handles that
      },
      realtime: {
        transport: WebSocket as any
      }
    })
  : null

export function setSupabaseSession(accessToken: string, refreshToken: string) {
  if (supabase) {
    supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  }
}
