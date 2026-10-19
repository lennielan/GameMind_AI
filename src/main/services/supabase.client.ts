import { createClient } from '@supabase/supabase-js'
import WebSocket from 'ws'

import { logger } from '../logger/logger'

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn(
    'SupabaseClient',
    'Supabase credentials (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are not set. Cloud sync, social and multiplayer features are disabled.'
  )
}

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

export async function setSupabaseSession(accessToken: string, refreshToken: string) {
  if (supabase) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
  }
}
