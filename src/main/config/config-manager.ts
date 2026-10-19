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
  lastSyncTimestamp: 0,
  aiProvider: 'gemini',
  openaiApiKey: '',
  openaiModel: 'gpt-4o',
  geminiApiKey: '',
  geminiModel: 'gemini-3.6-flash',
  claudeApiKey: '',
  claudeModel: 'claude-sonnet-4-20250514',
  openrouterApiKey: '',
  openrouterModel: 'google/gemini-2.0-flash-lite-preview-02-05:free',
  groqApiKey: '',
  groqModel: 'llama3-8b-8192',
  aiFeatureUsage: {},
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.1',
  lmstudioUrl: 'http://localhost:1234',
  lmstudioModel: 'local-model',
  rawgApiKey: '',
  igdbClientId: '',
  igdbClientSecret: '',
  theme: 'dark',
  accentColor: 'violet',
  language: 'ru',
  autoSync: true,
  syncInterval: 30,
  cacheEnabled: true,
  cacheTtl: 24,
  chatOverlayEnabled: true,
  analyticsEnabled: true,
  launchOnStartup: true,
  autoLaunchInitialized: false,
  hasCompletedOnboarding: false
}

const ENV_MAPPING: Partial<Record<SettingsKey, string>> = {
  steamApiKey: 'STEAM_API_KEY',
  steamId: 'STEAM_ID',
  openaiApiKey: 'OPENAI_API_KEY',
  openaiModel: 'OPENAI_MODEL',
  geminiApiKey: 'GEMINI_API_KEY',
  geminiModel: 'GEMINI_MODEL',
  claudeApiKey: 'CLAUDE_API_KEY',
  claudeModel: 'CLAUDE_MODEL',
  openrouterApiKey: 'OPENROUTER_API_KEY',
  openrouterModel: 'OPENROUTER_MODEL',
  groqApiKey: 'GROQ_API_KEY',
  groqModel: 'GROQ_MODEL',
  rawgApiKey: 'RAWG_API_KEY',
  igdbClientId: 'IGDB_CLIENT_ID',
  igdbClientSecret: 'IGDB_CLIENT_SECRET',
  ollamaUrl: 'OLLAMA_URL',
  ollamaModel: 'OLLAMA_MODEL',
  lmstudioUrl: 'LMSTUDIO_URL',
  lmstudioModel: 'LMSTUDIO_MODEL',
  aiProvider: 'AI_PROVIDER'
}

class ConfigManager {
  private store: Store

  constructor() {
    this.store = new Store({
      name: 'gamemind-config',
      defaults: DEFAULT_SETTINGS as unknown as Record<string, unknown>
    })

    // Migrate away from built-in providers
    const provider = this.store.get('aiProvider')
    if (provider === 'gemini-builtin' || provider === 'groq-builtin') {
      this.store.set('aiProvider', 'gemini')
    }

    // Migrate outdated or demand-spiked Gemini models to stable 3.6-flash
    const gModel = this.store.get('geminiModel') as string | undefined
    if (!gModel || gModel.includes('3.7') || gModel.includes('3.5') || gModel.includes('2.5') || gModel.includes('2.0') || gModel.includes('1.5') || gModel.includes('latest')) {
      this.store.set('geminiModel', 'gemini-3.6-flash')
    }
  }

  get<K extends SettingsKey>(key: K): AppSettings[K] {
    const raw = this.store.get(key) as string | undefined
    let val: any = raw

    if (SENSITIVE_KEYS.includes(key) && raw && typeof raw === 'string' && raw.startsWith('enc:')) {
      val = this.decrypt(raw.slice(4))
    }

    if (val !== undefined && val !== null && val !== '') {
      return val as AppSettings[K]
    }

    const envKey = ENV_MAPPING[key]
    if (envKey && process.env[envKey]) {
      return process.env[envKey] as AppSettings[K]
    }

    return DEFAULT_SETTINGS[key]
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
    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(value).toString('base64')
    }
    // Fallback: base64 encoding (not truly secure, but better than plaintext)
    return Buffer.from(value).toString('base64')
  }

  private decrypt(encrypted: string): string {
    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
    }
    return Buffer.from(encrypted, 'base64').toString('utf-8')
  }
}

export const configManager = new ConfigManager()
