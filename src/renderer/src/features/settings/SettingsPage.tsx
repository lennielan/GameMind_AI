import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useBlocker, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { User, Key, Bot, Palette, EyeOff, Save, Check, Award, Cloud, Info } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../services/supabase.client'

import { useThemeStore } from '@/stores/theme.store'
import { SaveBottomBar } from '../../components/ui/SaveBottomBar'

import { SteamTab } from './components/tabs/SteamTab'
import { AITab } from './components/tabs/AITab'
import { AppearanceTab } from './components/tabs/AppearanceTab'
import { ProfileTab } from './components/tabs/ProfileTab'
import { BlacklistTab } from './components/tabs/BlacklistTab'
import { AboutTab } from './components/tabs/AboutTab'
import { BadgesSettings } from '../badges/components/BadgesSettings'
import { SettingsAuthPrompt } from './components/SettingsAuthPrompt'
import { AccountTab } from './components/tabs/AccountTab'
import type { CloudUserProfile } from '@shared/types/user.types'

import styles from './SettingsPage.module.css'

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
}

export function SettingsPage(): React.JSX.Element {
  const { t, i18n } = useTranslation()
  const { theme, setTheme, accentColor, setAccentColor } = useThemeStore()
  
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<string>(() => (location.state as any)?.activeTab || 'profile')

  const [steamApiKey, setSteamApiKey] = useState('')
  const [steamId, setSteamId] = useState('')
  const [aiProvider, setAiProvider] = useState('gemini')
  
  const [openaiKey, setOpenaiKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [claudeKey, setClaudeKey] = useState('')
  const [openrouterKey, setOpenrouterKey] = useState('')
  const [groqKey, setGroqKey] = useState('')
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434')
  const [lmstudioUrl, setLmstudioUrl] = useState('http://localhost:1234')
  const [chatOverlayEnabled, setChatOverlayEnabled] = useState(true)
  const [launchOnStartup, setLaunchOnStartup] = useState(true)

  const [saved, setSaved] = useState(false)
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({})
  const [blacklist, setBlacklist] = useState<{ appId: number, gameName: string, addedAt: number }[]>([])

  const [syncStatus, setSyncStatus] = useState<{ isRunning: boolean, currentStep: string, progress: number, error?: string } | null>(null)
  const [initialSettings, setInitialSettings] = useState<Record<string, any> | null>(null)

  const [session, setSession] = useState<any>(null) // supabase session
  const [profile, setProfile] = useState<CloudUserProfile | null>(null)
  const [initialProfile, setInitialProfile] = useState<CloudUserProfile | null>(null)

  useEffect(() => {
    if (location.state && (location.state as any).activeTab) {
      setActiveTab((location.state as any).activeTab)
    } else if (location.hash) {
      const hash = location.hash.replace('#', '').toLowerCase()
      if (hash.includes('steam')) setActiveTab('steam')
      else if (hash.includes('profile')) setActiveTab('profile')
      else if (hash.includes('ai')) setActiveTab('ai')
      else if (hash.includes('badges')) setActiveTab('badges')
      else if (hash.includes('appearance')) setActiveTab('appearance')
      else if (hash.includes('blacklist')) setActiveTab('blacklist')
      else if (hash.includes('about')) setActiveTab('about')
    }
  }, [location.state, location.hash])

  useEffect(() => {
    loadSettings()
    loadBlacklist()
    
    const unsubscribeSync = window.api.onSyncStatus((status: any) => {
      setSyncStatus(status)
    })
    
    let unsubscribeAuth: (() => void) | undefined
    if (supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        if (session) {
          loadProfile(session.user.id)
        }
      })
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        if (session) loadProfile(session.user.id)
        else setProfile(null)
      })
      unsubscribeAuth = () => subscription.unsubscribe()
    }
    
    return () => {
      unsubscribeSync()
      if (unsubscribeAuth) unsubscribeAuth()
    }
  }, [])

  const loadProfile = async (userId: string) => {
    if (!supabase) return
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).single()
    if (data) {
      setProfile(data)
      setInitialProfile(data)
      localStorage.setItem('cached_app_profile', JSON.stringify(data))
    } else if (error) {
      const cached = localStorage.getItem('cached_app_profile')
      if (cached) {
        setProfile(JSON.parse(cached))
        setInitialProfile(JSON.parse(cached))
      }
    }
  }

  const handleSaveProfile = async () => {
    if (!session || !profile || !supabase) return
    
    const username = profile.username?.trim()
    if (!username) {
      toast.error(t('settings.profile.errorEmptyUsername', 'Никнейм не может быть пустым'))
      return
    }
    if (username.length < 3 || username.length > 20) {
      toast.error(t('settings.profile.errorLength', 'Никнейм должен содержать от 3 до 20 символов'))
      return
    }
    if (!/^[a-zA-Z0-9_а-яА-ЯёЁ\s\-]+$/.test(username)) {
      toast.error(t('settings.profile.errorFormat', 'Никнейм может содержать только буквы, цифры, пробелы, дефисы и подчеркивания'))
      return
    }

    let avatarUrl = profile.avatar_url
    if (avatarUrl && avatarUrl.startsWith('data:image/')) {
      try {
        const response = await fetch(avatarUrl)
        const blob = await response.blob()
        const filePath = `${session.user.id}/avatar.webp`
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, blob, {
            contentType: 'image/webp',
            upsert: true
          })
          
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)
          avatarUrl = `${publicUrl}?t=${Date.now()}`
        }
      } catch (e) {}
    }

    const { error: updateError } = await supabase.from('users').update({
      username: username,
      avatar_url: avatarUrl,
      is_library_public: profile.is_library_public ?? true,
      is_dna_public: profile.is_dna_public ?? true,
      is_achievements_public: profile.is_achievements_public ?? true,
      is_online_public: profile.is_online_public ?? true,
      chat_privacy: profile.chat_privacy ?? 'everyone',
      message_retention: profile.message_retention ?? 'forever'
    }).eq('id', session.user.id)

    if (updateError) {
      toast.error(updateError.message)
    } else {
      toast.success(t('settings.profile.successSave', 'Настройки профиля и приватности успешно сохранены'))
      if (profile) {
        const updatedProfile = { ...profile, username, avatar_url: avatarUrl }
        setProfile(updatedProfile)
        setInitialProfile(updatedProfile)
        localStorage.setItem('cached_app_profile', JSON.stringify(updatedProfile))
      }
    }
  }

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
      setChatOverlayEnabled(result.data.chatOverlayEnabled ?? true)
      setLaunchOnStartup(result.data.launchOnStartup ?? true)
      
      if (result.data.language && result.data.language !== i18n.language) {
        i18n.changeLanguage(result.data.language)
      }
      if (result.data.theme) {
        setTheme(result.data.theme)
      }
      
      setInitialSettings({
        steamApiKey: result.data.steamApiKey || '',
        steamId: result.data.steamId || '',
        aiProvider: result.data.aiProvider || 'gemini',
        openaiKey: result.data.openaiApiKey || '',
        geminiKey: result.data.geminiApiKey || '',
        claudeKey: result.data.claudeApiKey || '',
        openrouterKey: result.data.openrouterApiKey || '',
        groqKey: result.data.groqApiKey || '',
        ollamaUrl: result.data.ollamaUrl || 'http://localhost:11434',
        lmstudioUrl: result.data.lmstudioUrl || 'http://localhost:1234',
        chatOverlayEnabled: result.data.chatOverlayEnabled ?? true,
        launchOnStartup: result.data.launchOnStartup ?? true
      })
    }
  }

  const loadBlacklist = async () => {
    try {
      const res = await window.api.getBlacklist()
      if (res.success && res.data) {
        setBlacklist(res.data)
      }
    } catch (err) {}
  }

  const handleRemoveFromBlacklist = async (appId: number) => {
    try {
      const res = await window.api.removeFromBlacklist(appId)
      if (res.success) {
        setBlacklist(prev => prev.filter(item => item.appId !== appId))
        toast.success(t('settings.blacklist.removedMsg', 'Игра удалена из черного списка'))
      } else {
        toast.error(res.error || 'Failed to remove from blacklist')
      }
    } catch (err) {}
  }

  const handleSave = async (): Promise<void> => {
    if (steamApiKey && !steamApiKey.includes('••••')) await window.api.setSetting('steamApiKey', steamApiKey)
    if (steamId) await window.api.setSetting('steamId', steamId)
    await window.api.setSetting('aiProvider', aiProvider)
    if (openaiKey && !openaiKey.includes('••••')) await window.api.setSetting('openaiApiKey', openaiKey)
    if (geminiKey && !geminiKey.includes('••••')) await window.api.setSetting('geminiApiKey', geminiKey)
    if (claudeKey && !claudeKey.includes('••••')) await window.api.setSetting('claudeApiKey', claudeKey)
    if (openrouterKey && !openrouterKey.includes('••••')) await window.api.setSetting('openrouterApiKey', openrouterKey)
    if (groqKey && !groqKey.includes('••••')) await window.api.setSetting('groqApiKey', groqKey)
    if (ollamaUrl) await window.api.setSetting('ollamaUrl', ollamaUrl)
    if (lmstudioUrl) await window.api.setSetting('lmstudioUrl', lmstudioUrl)
    await window.api.setSetting('chatOverlayEnabled', chatOverlayEnabled)
    await window.api.setSetting('launchOnStartup', launchOnStartup)
    
    let profileChanged = false
    if (profile && initialProfile) {
      profileChanged = (
        profile.username !== initialProfile.username ||
        profile.avatar_url !== initialProfile.avatar_url ||
        (profile.is_library_public ?? true) !== (initialProfile.is_library_public ?? true) ||
        (profile.is_dna_public ?? true) !== (initialProfile.is_dna_public ?? true) ||
        (profile.is_achievements_public ?? true) !== (initialProfile.is_achievements_public ?? true) ||
        (profile.is_online_public ?? true) !== (initialProfile.is_online_public ?? true) ||
        (profile.chat_privacy ?? 'everyone') !== (initialProfile.chat_privacy ?? 'everyone') ||
        (profile.message_retention ?? 'forever') !== (initialProfile.message_retention ?? 'forever')
      )
    }
    
    if (profileChanged) {
      await handleSaveProfile()
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    
    setInitialSettings({
      steamApiKey, steamId, aiProvider, openaiKey, geminiKey, claudeKey, openrouterKey, groqKey, ollamaUrl, lmstudioUrl, chatOverlayEnabled, launchOnStartup
    })
  }

  const handleSync = async (): Promise<void> => {
    await handleSave()
    const res = await window.api.steamSync()
    if (!res.success) {
      console.error(res.error)
    }
  }

  const toggleKeyVisibility = (key: string): void => {
    setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const changeLanguage = async (lng: string) => {
    i18n.changeLanguage(lng)
    await window.api.setSetting('language', lng)
  }


  const isDirty = useMemo(() => {
    if (!initialSettings) return false
    
    const settingsChanged = (
      steamApiKey !== initialSettings.steamApiKey ||
      steamId !== initialSettings.steamId ||
      aiProvider !== initialSettings.aiProvider ||
      openaiKey !== initialSettings.openaiKey ||
      geminiKey !== initialSettings.geminiKey ||
      claudeKey !== initialSettings.claudeKey ||
      openrouterKey !== initialSettings.openrouterKey ||
      groqKey !== initialSettings.groqKey ||
      ollamaUrl !== initialSettings.ollamaUrl ||
      lmstudioUrl !== initialSettings.lmstudioUrl ||
      chatOverlayEnabled !== initialSettings.chatOverlayEnabled ||
      launchOnStartup !== initialSettings.launchOnStartup
    )

    let profileChanged = false
    if (profile && initialProfile) {
      profileChanged = (
        profile.username !== initialProfile.username ||
        profile.avatar_url !== initialProfile.avatar_url ||
        (profile.is_library_public ?? true) !== (initialProfile.is_library_public ?? true) ||
        (profile.is_dna_public ?? true) !== (initialProfile.is_dna_public ?? true) ||
        (profile.is_achievements_public ?? true) !== (initialProfile.is_achievements_public ?? true) ||
        (profile.is_online_public ?? true) !== (initialProfile.is_online_public ?? true) ||
        (profile.chat_privacy ?? 'everyone') !== (initialProfile.chat_privacy ?? 'everyone') ||
        (profile.message_retention ?? 'forever') !== (initialProfile.message_retention ?? 'forever')
      )
    }

    return settingsChanged || profileChanged
  }, [
    initialSettings, steamApiKey, steamId, aiProvider, openaiKey, 
    geminiKey, claudeKey, openrouterKey, groqKey, ollamaUrl, lmstudioUrl, chatOverlayEnabled,
    launchOnStartup,
    profile, initialProfile
  ])

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && currentLocation.pathname !== nextLocation.pathname
  )

  const tabs = [
    { id: 'account', icon: <Cloud size={18} />, label: t('settings.account.title', 'Аккаунт') },
    { id: 'profile', icon: <User size={18} />, label: t('settings.profile.title', 'Профиль') },
    { id: 'badges', icon: <Award size={18} />, label: t('badges.settings.title', 'Значки') },
    { id: 'steam', icon: <Key size={18} />, label: t('settings.steam.title', 'Steam & Синхронизация') },
    { id: 'ai', icon: <Bot size={18} />, label: t('settings.ai.title', 'ИИ и Модели') },
    { id: 'appearance', icon: <Palette size={18} />, label: t('settings.appearance.title', 'Внешний вид') },
    { id: 'blacklist', icon: <EyeOff size={18} />, label: t('settings.blacklist.title', 'Черный список') },
    { id: 'about', icon: <Info size={18} />, label: t('settings.about.title', 'О проекте') }
  ]

  return (
    <div className={styles.settingsLayout}>
      <div className={styles.settingsSidebar}>
        <motion.h1 className={styles.settingsTitle} variants={fadeUp} initial="hidden" animate="show">
          {t('settings.title', 'Настройки')}
        </motion.h1>
        <motion.div className={styles.tabsList} variants={fadeUp} initial="hidden" animate="show">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </motion.div>
      </div>

      <div className={styles.settingsContent}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            style={{ paddingBottom: '100px' }}
          >
            {activeTab === 'account' && (
              <AccountTab 
                session={session} 
                profile={profile} 
                fadeUp={fadeUp} 
                onNavigateTab={(tab) => setActiveTab(tab)} 
              />
            )}

            {activeTab === 'profile' && (
              session && profile ? (
                <ProfileTab 
                  session={session} profile={profile} setProfile={setProfile}
                  handleSaveProfile={handleSaveProfile} fadeUp={fadeUp} 
                />
              ) : (
                <SettingsAuthPrompt variant="profile" />
              )
            )}
            
            {activeTab === 'badges' && (
              session && profile ? (
                <BadgesSettings userId={profile?.id} steamId={profile?.steam_id || steamId || (profile?.numeric_id ? String(profile.numeric_id) : '')} />
              ) : (
                <SettingsAuthPrompt variant="badges" />
              )
            )}
            
            {activeTab === 'steam' && (
              <SteamTab 
                steamId={steamId} setSteamId={setSteamId}
                steamApiKey={steamApiKey} setSteamApiKey={setSteamApiKey}
                showKeys={showKeys} toggleKeyVisibility={toggleKeyVisibility}
                syncStatus={syncStatus} handleSync={handleSync} setSaved={setSaved} fadeUp={fadeUp}
              />
            )}

            {activeTab === 'ai' && (
              <AITab 
                aiProvider={aiProvider} setAiProvider={setAiProvider}
                openaiKey={openaiKey} setOpenaiKey={setOpenaiKey}
                geminiKey={geminiKey} setGeminiKey={setGeminiKey}
                claudeKey={claudeKey} setClaudeKey={setClaudeKey}
                openrouterKey={openrouterKey} setOpenrouterKey={setOpenrouterKey}
                groqKey={groqKey} setGroqKey={setGroqKey}
                ollamaUrl={ollamaUrl} setOllamaUrl={setOllamaUrl}
                lmstudioUrl={lmstudioUrl} setLmstudioUrl={setLmstudioUrl}
                showKeys={showKeys} toggleKeyVisibility={toggleKeyVisibility} fadeUp={fadeUp}
              />
            )}

            {activeTab === 'appearance' && (
              <AppearanceTab 
                theme={theme} changeTheme={setTheme}
                accentColor={accentColor} changeAccentColor={setAccentColor}
                language={i18n.language} changeLanguage={changeLanguage}
                chatOverlayEnabled={chatOverlayEnabled} setChatOverlayEnabled={setChatOverlayEnabled}
                launchOnStartup={launchOnStartup} setLaunchOnStartup={setLaunchOnStartup}
                fadeUp={fadeUp}
              />
            )}

            {activeTab === 'blacklist' && (
              <BlacklistTab 
                blacklist={blacklist} handleRemoveFromBlacklist={handleRemoveFromBlacklist} fadeUp={fadeUp}
              />
            )}

            {activeTab === 'about' && (
              <AboutTab fadeUp={fadeUp} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <SaveBottomBar 
        isVisible={isDirty} 
        onSave={handleSave} 
        onCancel={() => {
          loadSettings()
          if (initialProfile) {
            setProfile(initialProfile)
          }
        }} 
      />

      {blocker.state === 'blocked' && (
        <div className={styles['settings-modal-overlay']}>
          <motion.div 
            className={styles['settings-modal']}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h3>{t('settings.unsavedChanges.warningTitle', 'Внимание')}</h3>
            <p>{t('settings.unsavedChanges.warningDesc', 'У вас есть несохраненные изменения. Вы уверены, что хотите покинуть страницу? Все изменения будут потеряны.')}</p>
            <div className={styles['settings-modal-actions']}>
              <button className={`${styles.settingsBtn} ${styles.settingsBtnSecondary}`} onClick={() => blocker.reset()}>
                {t('common.stay', 'Остаться')}
              </button>
              <button className={`${styles.settingsBtn} ${styles.settingsBtnDanger}`} onClick={() => blocker.proceed()}>
                {t('common.leave', 'Покинуть')}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
