/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_ADMIN_STEAM_ID?: string
  readonly VITE_ADMIN_USERNAME?: string
  readonly VITE_ADMIN_NUMERIC_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  api: import('../preload/index').GameMindAPI
}
