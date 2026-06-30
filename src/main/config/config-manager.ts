// ============================================================
// Config Manager — Encrypted settings storage
// ============================================================

import Store from 'electron-store'
import { safeStorage } from 'electron'
import type { AppSettings, SettingsKey } from '@shared/types'

const SENSITIVE_KEYS: SettingsKey[] = [
  'steamApiKey',
  'openaiApiKey',
  'geminiApiKey',
  'claudeApiKey',
  'openrouterApiKey',
  'groqApiKey',
  'igdbClientSecret'
]

const DEFAULT_SETTINGS: AppSettings = {
  steamApiKey: '',
  steamId: '',
  aiProvider: 'gemini',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  geminiApiKey: '',
  geminiModel: 'gemini-2.0-flash',
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-20250514',
  openrouterApiKey: '',
  openrouterModel: 'google/gemini-2.0-flash-lite-preview-02-05:free',
  groqApiKey: '',
  groqModel: 'llama3-8b-8192',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1',
  lmstudioUrl: 'http://localhost:1234',
  lmstudioModel: 'local-model',
  rawgApiKey: '',
  igdbClientId: '',
  igdbClientSecret: '',
  theme: 'dark',
  language: 'en',
  autoSync: true,
  syncInterval: 30,
  cacheEnabled: true,
  cacheTtl: 24,
  analyticsEnabled: true
}

class ConfigManager {
  private store: Store

  constructor() {
    this.store = new Store({
      name: 'gamemind-config',
      defaults: DEFAULT_SETTINGS as unknown as Record<string, unknown>
    })
  }

  get<K extends SettingsKey>(key: K): AppSettings[K] {
    const raw = this.store.get(key) as string | undefined
    if (!raw) return DEFAULT_SETTINGS[key]

    if (SENSITIVE_KEYS.includes(key) && raw && typeof raw === 'string' && raw.startsWith('enc:')) {
      return this.decrypt(raw.slice(4)) as AppSettings[K]
    }

    return raw as AppSettings[K]
  }

  set<K extends SettingsKey>(key: K, value: AppSettings[K]): void {
    if (SENSITIVE_KEYS.includes(key) && typeof value === 'string' && value.length > 0) {
      this.store.set(key, 'enc:' + this.encrypt(value))
    } else {
      this.store.set(key, value)
    }
  }

  getAll(): AppSettings {
    const settings = {} as AppSettings
    for (const key of Object.keys(DEFAULT_SETTINGS) as SettingsKey[]) {
      settings[key] = this.get(key) as never
    }
    return settings
  }

  reset(): void {
    this.store.clear()
  }

  private encrypt(value: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(value).toString('base64')
    }
    // Fallback: base64 encoding (not truly secure, but better than plaintext)
    return Buffer.from(value).toString('base64')
  }

  private decrypt(encrypted: string): string {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    }
    return Buffer.from(encrypted, 'base64').toString('utf-8')
  }
}

export const configManager = new ConfigManager()
