// ============================================================
// Settings Page — Configuration
// ============================================================

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Key,
  Bot,
  Palette,
  RefreshCw,
  Save,
  Check,
  Eye,
  EyeOff,
  Globe
} from 'lucide-react'
import { CloudAuth } from './components/CloudAuth'
import { useThemeStore } from '@/stores/theme.store'
import './SettingsPage.css'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export function SettingsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { theme, setTheme } = useThemeStore()
  const [steamApiKey, setSteamApiKey] = useState('')
  const [steamId, setSteamId] = useState('')
  const [aiProvider, setAiProvider] = useState('gemini')
  
  // AI Keys & URLs
  const [openaiKey, setOpenaiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [lmstudioUrl, setLmstudioUrl] = useState('http://localhost:1234')

  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})

  const [syncStatus, setSyncStatus] = useState<any>(null)

  useEffect(() => {
    loadSettings()
    
    // Subscribe to sync progress
    const unsubscribe = window.api.onSyncStatus((status: any) => {
      setSyncStatus(status)
    })
    
    return () => unsubscribe()
  }, [])

  const loadSettings = async (): Promise<void> => {
    const result = await window.api.getAllSettings()
    if (result.success && result.data) {
      setSteamApiKey(result.data.steamApiKey || '')
      setSteamId(result.data.steamId || '')
      setAiProvider(result.data.aiProvider || 'gemini')
      
      setOpenaiKey(result.data.openaiApiKey || '')
      setGeminiKey(result.data.geminiApiKey || '')
      setClaudeKey(result.data.claudeApiKey || '')
      setOpenrouterKey(result.data.openrouterApiKey || '')
      setGroqKey(result.data.groqApiKey || '')
      setOllamaUrl(result.data.ollamaUrl || 'http://localhost:11434')
      setLmstudioUrl(result.data.lmstudioUrl || 'http://localhost:1234')
    }
  }

  const handleSave = async (): Promise<void> => {
    if (steamApiKey && !steamApiKey.includes('••••')) {
      await window.api.setSetting('steamApiKey', steamApiKey)
    }
    if (steamId) {
      await window.api.setSetting('steamId', steamId)
    }
    
    await window.api.setSetting('aiProvider', aiProvider)
    
    if (openaiKey && !openaiKey.includes('••••')) await window.api.setSetting('openaiApiKey', openaiKey)
    if (geminiKey && !geminiKey.includes('••••')) await window.api.setSetting('geminiApiKey', geminiKey)
    if (claudeKey && !claudeKey.includes('••••')) await window.api.setSetting('claudeApiKey', claudeKey)
    if (openrouterKey && !openrouterKey.includes('••••')) await window.api.setSetting('openrouterApiKey', openrouterKey)
    if (groqKey && !groqKey.includes('••••')) await window.api.setSetting('groqApiKey', groqKey)
    if (ollamaUrl) await window.api.setSetting('ollamaUrl', ollamaUrl)
    if (lmstudioUrl) await window.api.setSetting('lmstudioUrl', lmstudioUrl)

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSync = async (): Promise<void> => {
    await handleSave() // Ensure keys are saved first
    const res = await window.api.steamSync()
    if (!res.success) {
      console.error(res.error)
    }
  }



  const toggleKeyVisibility = (key: string): void => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng)
  }

  return (
    <motion.div
      className="settings"
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.08 } } }}
    >
      <motion.h1 className="settings__title" variants={fadeUp}>
        {t('settings.title')}
      </motion.h1>

      <motion.section className="settings__section" variants={fadeUp}>
        <div className="settings__section-header">
          <Globe size={20} />
          <h2>{t('settings.general.language')}</h2>
        </div>
        <div className="settings__form-group">
          <select 
            className="settings__select"
            value={i18n.language}
            onChange={(e) => changeLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="ru">Русский</option>
          </select>
        </div>
      </motion.section>

      {/* Steam Section */}
      <motion.section className="settings__section" variants={fadeUp}>
        <div className="settings__section-header">
          <Key size={20} />
          <h2>{t('settings.steam.title')}</h2>
        </div>

        <div className="settings__field">
          <label className="settings__label">{t('settings.steam.steamIdLabel')}</label>
          <div className="settings__steam-login">
            <button
              className="settings__btn settings__btn--steam"
              onClick={async () => {
                const res = await window.api.steamLogin()
                if (res.success && res.data) {
                  setSteamId(res.data)
                  setSaved(true)
                  setTimeout(() => setSaved(false), 2000)
                }
              }}
            >
              {t('settings.steam.loginBtn')}
            </button>
            <span className="settings__steam-login-text">
              {t('settings.steam.orManual')}
            </span>
          </div>
          <input
            type="text"
            className="settings__input"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder={t('settings.steam.steamIdPlaceholder')}
            id="input-steam-id"
          />
        </div>

        <div className="settings__field">
          <label className="settings__label">{t('settings.steam.apiKeyLabel')} <span style={{color: '#ef4444'}}>{t('settings.steam.apiKeyRequired')}</span></label>
          <p className="settings__hint">
            <strong>{t('settings.steam.apiKeyWarning').split(':')[0]}:</strong> {t('settings.steam.apiKeyWarning').split(':')[1] || t('settings.steam.apiKeyWarning')}
            <br />
            <a href="https://steamcommunity.com/dev/apikey" target="_blank" className="settings__link">
              {t('settings.steam.apiKeyLink')}
            </a> {t('settings.steam.apiKeyDomainHint')}
          </p>
          <div className="settings__input-group">
            <input
              type={showKeys['steamApiKey'] ? 'text' : 'password'}
              className="settings__input"
              value={steamApiKey}
              onChange={(e) => setSteamApiKey(e.target.value)}
              placeholder={t('settings.steam.apiKeyPlaceholder')}
              id="input-steam-api-key"
            />
            <button
              className="settings__input-toggle"
              onClick={() => toggleKeyVisibility('steamApiKey')}
            >
              {showKeys['steamApiKey'] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
      </motion.section>

      {/* AI Section */}
      <motion.section className="settings__section" variants={fadeUp}>
        <div className="settings__section-header">
          <Bot size={20} />
          <h2>{t('settings.ai.title')}</h2>
        </div>

        <div className="settings__field">
          <label className="settings__label">{t('settings.ai.providerLabel')}</label>
          <div className="settings__radio-group">
            {[
              { value: 'gemini', label: 'Gemini', desc: t('settings.ai.providers.geminiDesc') },
              { value: 'groq', label: 'Groq', desc: t('settings.ai.providers.groqDesc') },
              { value: 'openai', label: 'OpenAI', desc: t('settings.ai.providers.openaiDesc') },
              { value: 'claude', label: 'Claude', desc: t('settings.ai.providers.claudeDesc') },
              { value: 'openrouter', label: 'OpenRouter', desc: t('settings.ai.providers.openrouterDesc') },
              { value: 'ollama', label: 'Ollama', desc: t('settings.ai.providers.localDesc') },
              { value: 'lmstudio', label: 'LM Studio', desc: t('settings.ai.providers.localDesc') }
            ].map((opt) => (
              <button
                key={opt.value}
                className={`settings__radio ${aiProvider === opt.value ? 'settings__radio--active' : ''}`}
                onClick={() => setAiProvider(opt.value)}
              >
                <span className="settings__radio-label">{opt.label}</span>
                <span className="settings__radio-desc">{opt.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {['gemini', 'groq'].includes(aiProvider) && (
          <div className="settings__field">
            <div className="settings__success-badge">
              <Check size={16} />
              <span>{t('settings.ai.builtinReady')}</span>
            </div>
          </div>
        )}

        {['openai', 'claude', 'openrouter'].includes(aiProvider) && (
          <div className="settings__field">
            <label className="settings__label">{t('settings.ai.apiKeyLabel')}</label>
            <div className="settings__input-group">
              <input
                type={showKeys[`${aiProvider}Key`] ? 'text' : 'password'}
                className="settings__input"
                value={
                  aiProvider === 'openai' ? openaiKey :
                  aiProvider === 'claude' ? claudeKey :
                  openrouterKey
                }
                onChange={(e) => {
                  if (aiProvider === 'openai') setOpenaiKey(e.target.value)
                  if (aiProvider === 'claude') setClaudeKey(e.target.value)
                  if (aiProvider === 'openrouter') setOpenrouterKey(e.target.value)
                }}
                placeholder={t('settings.ai.apiKeyPlaceholder', { provider: aiProvider })}
                id={`input-${aiProvider}-key`}
              />
              <button
                className="settings__input-toggle"
                onClick={() => toggleKeyVisibility(`${aiProvider}Key`)}
              >
                {showKeys[`${aiProvider}Key`] ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        )}

        {['ollama', 'lmstudio'].includes(aiProvider) && (
          <div className="settings__field">
            <label className="settings__label">{t('settings.ai.localUrlLabel')}</label>
            <input
              type="text"
              className="settings__input"
              value={aiProvider === 'ollama' ? ollamaUrl : lmstudioUrl}
              onChange={(e) => {
                if (aiProvider === 'ollama') setOllamaUrl(e.target.value)
                if (aiProvider === 'lmstudio') setLmstudioUrl(e.target.value)
              }}
              placeholder={`http://localhost:${aiProvider === 'ollama' ? '11434' : '1234'}`}
            />
          </div>
        )}
      </motion.section>

      {/* Appearance */}
      <motion.section className="settings__section" variants={fadeUp}>
        <div className="settings__section-header">
          <Palette size={20} />
          <h2>{t('settings.appearance.title')}</h2>
        </div>

        <div className="settings__field">
          <label className="settings__label">{t('settings.appearance.theme')}</label>
          <div className="settings__radio-group settings__radio-group--inline">
            {[
              { value: 'dark' as const, label: t('settings.appearance.themes.dark') },
              { value: 'light' as const, label: t('settings.appearance.themes.light') },
              { value: 'system' as const, label: t('settings.appearance.themes.system') }
            ].map((opt) => (
              <button
                key={opt.value}
                className={`settings__radio ${theme === opt.value ? 'settings__radio--active' : ''}`}
                onClick={() => setTheme(opt.value)}
              >
                <span className="settings__radio-label">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Sync Section */}
      <motion.section className="settings__section" variants={fadeUp}>
        <div className="settings__section-header">
          <RefreshCw size={20} className={syncStatus?.isRunning ? 'animate-spin' : ''} />
          <h2>{t('settings.sync.title')}</h2>
        </div>

        <div className="settings__field">
          <button
            className="settings__btn settings__btn--secondary"
            id="btn-sync-now"
            onClick={handleSync}
            disabled={syncStatus?.isRunning}
          >
            <RefreshCw size={16} className={syncStatus?.isRunning ? 'animate-spin' : ''} />
            {syncStatus?.isRunning ? t('settings.actions.syncing') : t('settings.actions.syncNow')}
          </button>
          
          {syncStatus && (
            <div style={{ marginTop: '1rem', background: 'var(--surface)', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <span>{syncStatus.currentStep}</span>
                <span>{syncStatus.progress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'var(--surface-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${syncStatus.progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.3s ease' }} />
              </div>
              {syncStatus.error && (
                <div style={{ color: 'var(--danger)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                  {syncStatus.error}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.section>

      {/* Cloud Sync (Phase 2) */}
      <motion.section className="settings__section" variants={fadeUp}>
        <CloudAuth />
      </motion.section>

      {/* Save */}
      <motion.div className="settings__actions" variants={fadeUp}>
        <button
          className={`settings__btn settings__btn--primary ${saved ? 'settings__btn--saved' : ''}`}
          onClick={handleSave}
          id="btn-save-settings"
        >
          {saved ? (
            <>
              <Check size={16} />
              {t('settings.actions.save')}
            </>
          ) : (
            <>
              <Save size={16} />
              {t('settings.actions.save')}
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  )
}
