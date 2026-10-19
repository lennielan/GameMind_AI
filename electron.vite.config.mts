import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // Загружаем .env файлы
  const env = loadEnv(mode, process.cwd(), '')
  
  const defineEnv = {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || ''),
    'import.meta.env.VITE_ADMIN_STEAM_ID': JSON.stringify(env.VITE_ADMIN_STEAM_ID || process.env.VITE_ADMIN_STEAM_ID || env.ADMIN_STEAM_ID || process.env.ADMIN_STEAM_ID || ''),
    'import.meta.env.VITE_ADMIN_USERNAME': JSON.stringify(env.VITE_ADMIN_USERNAME || process.env.VITE_ADMIN_USERNAME || ''),
    'import.meta.env.VITE_ADMIN_NUMERIC_ID': JSON.stringify(env.VITE_ADMIN_NUMERIC_ID || process.env.VITE_ADMIN_NUMERIC_ID || '')
  }
  
  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      resolve: {
        alias: {
          '@shared': resolve('src/shared')
        }
      },
      define: defineEnv
    },
    preload: {
      plugins: [externalizeDepsPlugin({ exclude: ['zod'] })],
      resolve: {
        alias: {
          '@shared': resolve('src/shared')
        }
      },
      define: defineEnv
    },
    renderer: {
      resolve: {
        alias: {
          '@': resolve('src/renderer/src'),
          '@shared': resolve('src/shared')
        }
      },
      define: defineEnv,
      css: {
        modules: {
          localsConvention: 'camelCase'
        }
      },
      server: {
        host: '127.0.0.1',
        port: 5173
      },
      plugins: [react()]
    }
  }
})
