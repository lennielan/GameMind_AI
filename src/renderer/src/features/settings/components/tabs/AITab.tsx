import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Bot, Check, Eye, EyeOff, Shield, HelpCircle, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ApiKeyTutorialModal } from '../ApiKeyTutorialModal'
import styles from '../../SettingsPage.module.css'

interface AITabProps {
  aiProvider: string
  setAiProvider: (val: string) => void
  openaiKey: string
  setOpenaiKey: (val: string) => void
  geminiKey: string
  setGeminiKey: (val: string) => void
  claudeKey: string
  setClaudeKey: (val: string) => void
  openrouterKey: string
  setOpenrouterKey: (val: string) => void
  groqKey: string
  setGroqKey: (val: string) => void
  ollamaUrl: string
  setOllamaUrl: (val: string) => void
  lmstudioUrl: string
  setLmstudioUrl: (val: string) => void
  showKeys: Record<string, boolean>
  toggleKeyVisibility: (key: string) => void
  fadeUp: any
}

export function AITab({
  aiProvider, setAiProvider,
  openaiKey, setOpenaiKey,
  geminiKey, setGeminiKey,
  claudeKey, setClaudeKey,
  openrouterKey, setOpenrouterKey,
  groqKey, setGroqKey,
  ollamaUrl, setOllamaUrl,
  lmstudioUrl, setLmstudioUrl,
  showKeys, toggleKeyVisibility, fadeUp
}: AITabProps) {
  const { t } = useTranslation()
  const [tutorialProvider, setTutorialProvider] = useState<string | null>(null)

  return (
    <motion.section className={styles.settingsSection} variants={fadeUp}>
      <div className={styles.settingsSectionHeader}>
        <Bot size={20} />
        <h2>{t('settings.ai.title')}</h2>
      </div>

      <div className={styles.settingsField}>
        <label className={styles.settingsLabel}>{t('settings.ai.providerLabel')}</label>
        <div className={styles.settingsRadioGroup}>
          {[
            { value: 'gemini', label: 'Gemini 3.7 Flash', desc: t('settings.ai.providers.geminiPersonalDesc', 'Gemini 3.7 Flash (Свой ключ, бесплатно)'), hasTutorial: true },
            { value: 'openai', label: 'OpenAI', desc: t('settings.ai.providers.openaiDesc'), hasTutorial: true },
            { value: 'claude', label: 'Claude', desc: t('settings.ai.providers.claudeDesc'), hasTutorial: true },
            { value: 'openrouter', label: 'OpenRouter', desc: t('settings.ai.providers.openrouterDesc'), hasTutorial: true },
            { value: 'ollama', label: 'Ollama', desc: t('settings.ai.providers.localDesc'), hasTutorial: true },
            { value: 'lmstudio', label: 'LM Studio', desc: t('settings.ai.providers.localDesc'), hasTutorial: true }
          ].map((opt) => (
            <div
              key={opt.value}
              role="button"
              tabIndex={0}
              className={`${styles.settingsRadio} ${aiProvider === opt.value ? styles.settingsRadioActive : ''}`}
              onClick={() => setAiProvider(opt.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setAiProvider(opt.value)
                }
              }}
            >
              <div className={styles.settingsRadioHeader}>
                <span className={styles.settingsRadioLabel}>{opt.label}</span>
                {opt.hasTutorial && (
                  <button
                    type="button"
                    className={styles.settingsTutorialBadgeBtn}
                    onClick={(e) => {
                      e.stopPropagation()
                      setTutorialProvider(opt.value)
                    }}
                    title={t('settings.ai.tutorial.btnTitle', 'Пошаговая инструкция по созданию ключа')}
                  >
                    <HelpCircle size={12} />
                    <span>{t('settings.ai.tutorial.btnLabel', 'Инструкция')}</span>
                  </button>
                )}
              </div>
              <span className={styles.settingsRadioDesc}>{opt.desc}</span>
            </div>
          ))}
        </div>
      </div>



      {['gemini'].includes(aiProvider) && (
        <div className={styles.settingsField}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className={styles.settingsLabel}>{t('settings.ai.apiKeyLabel')}</label>
            <button
              type="button"
              className={styles.settingsInlineHelpBtn}
              onClick={() => setTutorialProvider('gemini')}
            >
              <BookOpen size={13} />
              <span>{t('settings.ai.tutorial.linkText', 'Как бесплатно получить ключ Gemini?')}</span>
            </button>
          </div>
          <div className={styles.settingsInputGroup}>
            <input
              type={showKeys[`${aiProvider}Key`] ? 'text' : 'password'}
              className={styles.settingsInput}
              value={aiProvider === 'gemini' ? geminiKey : groqKey}
              onChange={(e) => aiProvider === 'gemini' ? setGeminiKey(e.target.value) : setGroqKey(e.target.value)}
              placeholder={t('settings.ai.apiKeyPlaceholder', { provider: aiProvider === 'gemini' ? 'Gemini' : 'Groq' })}
              id={`input-${aiProvider}-key`}
            />
            <button className={styles.settingsInputToggle} onClick={() => toggleKeyVisibility(`${aiProvider}Key`)} aria-label={t('settings.ai.toggleKeyVisibility', 'Показать или скрыть ключ')}>
              {showKeys[`${aiProvider}Key`] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
            <Shield size={14} />
            <span>{t('settings.ai.personalKeyInfo', 'Личный ключ хранится только на этом ПК и снимает ограничения GameMind для ИИ-функций.')}</span>
          </div>
        </div>
      )}

      {['openai', 'claude', 'openrouter'].includes(aiProvider) && (
        <div className={styles.settingsField}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className={styles.settingsLabel}>{t('settings.ai.apiKeyLabel')}</label>
            {aiProvider === 'openai' && (
              <button
                type="button"
                className={styles.settingsInlineHelpBtn}
                onClick={() => setTutorialProvider('openai')}
              >
                <BookOpen size={13} />
                <span>{t('settings.ai.tutorial.openaiLinkText', 'Как создать API-ключ OpenAI?')}</span>
              </button>
            )}
            {aiProvider === 'claude' && (
              <button
                type="button"
                className={styles.settingsInlineHelpBtn}
                onClick={() => setTutorialProvider('claude')}
              >
                <BookOpen size={13} />
                <span>{t('settings.ai.tutorial.claudeLinkText', 'Как создать API-ключ Claude?')}</span>
              </button>
            )}
            {aiProvider === 'openrouter' && (
              <button
                type="button"
                className={styles.settingsInlineHelpBtn}
                onClick={() => setTutorialProvider('openrouter')}
              >
                <BookOpen size={13} />
                <span>{t('settings.ai.tutorial.openrouterLinkText', 'Как создать API-ключ OpenRouter?')}</span>
              </button>
            )}
          </div>
          <div className={styles.settingsInputGroup}>
            <input
              type={showKeys[`${aiProvider}Key`] ? 'text' : 'password'}
              className={styles.settingsInput}
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
              className={styles.settingsInputToggle}
              onClick={() => toggleKeyVisibility(`${aiProvider}Key`)}
            >
              {showKeys[`${aiProvider}Key`] ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
            <Shield size={14} />
            <span>{t('settings.steam.apiKeyLocalInfo', 'API-ключ используется только локально на вашем ПК. Мы его никуда не отправляем.')}</span>
          </div>
        </div>
      )}

      {['ollama', 'lmstudio'].includes(aiProvider) && (
        <div className={styles.settingsField}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label className={styles.settingsLabel}>{t('settings.ai.localUrlLabel')}</label>
            {aiProvider === 'ollama' && (
              <button
                type="button"
                className={styles.settingsInlineHelpBtn}
                onClick={() => setTutorialProvider('ollama')}
              >
                <BookOpen size={13} />
                <span>{t('settings.ai.tutorial.ollamaLinkText', 'Как настроить Ollama?')}</span>
              </button>
            )}
            {aiProvider === 'lmstudio' && (
              <button
                type="button"
                className={styles.settingsInlineHelpBtn}
                onClick={() => setTutorialProvider('lmstudio')}
              >
                <BookOpen size={13} />
                <span>{t('settings.ai.tutorial.lmstudioLinkText', 'Как настроить LM Studio?')}</span>
              </button>
            )}
          </div>
          <input
            type="text"
            className={styles.settingsInput}
            value={aiProvider === 'ollama' ? ollamaUrl : lmstudioUrl}
            onChange={(e) => {
              if (aiProvider === 'ollama') setOllamaUrl(e.target.value)
              if (aiProvider === 'lmstudio') setLmstudioUrl(e.target.value)
            }}
            placeholder={`http://localhost:${aiProvider === 'ollama' ? '11434' : '1234'}`}
          />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
            <Shield size={14} />
            <span>{t('settings.ai.tutorial.localPrivacyInfo', 'Локальные модели работают полностью на вашем ПК. Данные не отправляются в интернет.')}</span>
          </div>
        </div>
      )}

      <ApiKeyTutorialModal
        isOpen={!!tutorialProvider}
        provider={tutorialProvider || 'gemini'}
        onClose={() => setTutorialProvider(null)}
      />
    </motion.section>
  )
}
