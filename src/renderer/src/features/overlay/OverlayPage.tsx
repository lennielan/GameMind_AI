import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageSquare, Cpu } from 'lucide-react'
import { supabase } from '../../services/supabase.client'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '../../stores/theme.store'
import './OverlayPage.css'

interface OverlayMessage {
  id: string
  sender_id: string
  content: string
  created_at: string
}

interface SenderProfile {
  username: string
  avatar_url: string
}

/**
 * Bespoke geometric AI Companion emblem (no generic stars or sparkles)
 */
function AiCompanionIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overlay-ai-icon-svg"
    >
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <path d="M12 2V3.5M12 20.5V22M2 12H3.5M20.5 12H22" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function OverlayPage() {
  const { t } = useTranslation()
  const [message, setMessage] = useState<OverlayMessage | null>(null)
  const [sender, setSender] = useState<SenderProfile | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [avatarError, setAvatarError] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Initialize theme state in overlay window
    useThemeStore.getState().initialize()

    // Transparent body background
    document.body.style.backgroundColor = 'transparent'
    document.documentElement.style.backgroundColor = 'transparent'

    const cleanup = window.api.overlay.onShowMessage(async (payload: any) => {
      console.log('Received overlay message:', payload)
      
      // Instantly sync theme and accent color from payload or storage
      if (payload.theme) {
        const resolved = payload.theme === 'system' 
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : payload.theme
        document.documentElement.setAttribute('data-theme', resolved)
      } else {
        await useThemeStore.getState().initialize()
      }

      if (payload.accentColor) {
        document.documentElement.setAttribute('data-accent', payload.accentColor)
      }

      const newMsg = payload as OverlayMessage & { sender?: SenderProfile }
      setMessage(newMsg)
      setAvatarError(false)

      if (newMsg.sender) {
        setSender(newMsg.sender)
      } else if (newMsg.sender_id?.startsWith('SYSTEM')) {
        setSender({ username: 'GameMind AI', avatar_url: '' })
      } else if (supabase && newMsg.sender_id) {
        try {
          const { data } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', newMsg.sender_id)
            .single()

          if (data) {
            setSender(data)
          } else {
            setSender({ username: t('friends.status.unnamed', 'Без имени'), avatar_url: '' })
          }
        } catch {
          setSender({ username: t('friends.status.unnamed', 'Без имени'), avatar_url: '' })
        }
      } else {
        setSender({ username: t('friends.status.unnamed', 'Без имени'), avatar_url: '' })
      }

      setIsVisible(true)

      // Auto hide after 14 seconds (increased from 6s for comfortable reading)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false)
        setTimeout(() => window.api.overlay.close(), 500) // Give time for exit animation
      }, 14000)
    })

    return () => {
      cleanup()
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [t])

  const handleClose = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation()
    setIsVisible(false)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setTimeout(() => window.api.overlay.close(), 300)
  }

  const handleClick = () => {
    if (!message) return
    window.api.overlay.click(message.sender_id)
  }

  const isSystem = message?.sender_id?.startsWith('SYSTEM')

  return (
    <div className="overlay-container">
      <AnimatePresence>
        {isVisible && message && sender && (
          <motion.div
            className={`overlay-card ${isSystem ? 'overlay-card--system' : ''}`}
            initial={{ opacity: 0, y: 35, scale: 0.92, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 16, scale: 0.95, filter: 'blur(6px)', transition: { duration: 0.22, ease: 'easeInOut' } }}
            transition={{ type: 'spring', damping: 25, stiffness: 340, mass: 0.85 }}
            onClick={handleClick}
          >
            <div className="overlay-top-glow" />
            <div className="overlay-accent-bar" />

            <div className="overlay-avatar-wrapper">
              <div className={`overlay-avatar-container ${isSystem ? 'overlay-avatar-container--system' : ''}`}>
                {isSystem ? (
                  <div className="overlay-avatar-system">
                    <AiCompanionIcon size={20} />
                  </div>
                ) : sender.avatar_url && !avatarError ? (
                  <img
                    src={sender.avatar_url}
                    alt={sender.username}
                    className="overlay-avatar"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <div className="overlay-avatar-fallback">
                    {sender.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="overlay-content">
              <div className="overlay-header">
                <span className="overlay-title-badge">
                  {isSystem ? (
                    <>
                      <Cpu size={12} className="overlay-title-icon" />
                      <span>{t('overlay.systemNotification', 'Готово!')}</span>
                    </>
                  ) : (
                    <>
                      <MessageSquare size={12} className="overlay-title-icon" />
                      <span>
                        {t('overlay.messageFromPrefix', 'Сообщение от ')}
                        <strong className="overlay-username-highlight">{sender.username}</strong>
                      </span>
                    </>
                  )}
                </span>
              </div>

              <p className="overlay-text">
                {message.content || t('notifications.attachment', 'Вложение')}
              </p>
            </div>

            <button
              className="overlay-close-btn"
              onPointerDown={handleClose}
              onClick={(e) => e.stopPropagation()}
              title={t('common.close', 'Закрыть')}
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
