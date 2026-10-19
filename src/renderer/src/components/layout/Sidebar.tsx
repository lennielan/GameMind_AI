// ============================================================
// Sidebar — Neo-Terminal Navigation Console
// ============================================================

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../../stores/app.store'
import { Badge } from '../ui'
import { APP_VERSION } from '@shared/constants'
import {
  LayoutDashboard,
  Library,
  Dna,
  Settings,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Users,
  Brain,
  History,
  BookOpen,
  User,
  MessageSquare,
  Github,
  Send,
  Star
} from 'lucide-react'
import './Sidebar.css'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  path: string
  badge?: string
}

/**
 * Animated Technical AI Game Discovery Compass icon for sidebar navigation
 */
function RecommendationsNavIcon({ size = 18, className = '' }: { size?: number; className?: string }): React.JSX.Element {
  const isGeneratingRecs = useAppStore((s) => s.isGeneratingRecs)
  const [animState, setAnimState] = useState<'idle' | 'generating' | 'completed'>('idle')
  const prevGeneratingRef = useRef(isGeneratingRecs)

  useEffect(() => {
    if (isGeneratingRecs) {
      setAnimState('generating')
    } else if (prevGeneratingRef.current && !isGeneratingRecs) {
      setAnimState('completed')
      prevGeneratingRef.current = isGeneratingRecs
      const timer = setTimeout(() => {
        setAnimState('idle')
      }, 2500)
      return () => clearTimeout(timer)
    }
    prevGeneratingRef.current = isGeneratingRecs
  }, [isGeneratingRecs])

  return (
    <div className={`recs-nav-icon-wrapper ${className}`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`recs-nav-svg recs-nav-svg--${animState}`}
      >
        <AnimatePresence mode="wait">
          {animState === 'generating' ? (
            <motion.g
              key="generating-icon"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2 }}
            >
              {/* Outer static ring guide */}
              <circle
                cx="12"
                cy="12"
                r="8.5"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeOpacity="0.25"
              />

              {/* 4 Cardinal Locator Ticks */}
              <path
                d="M12 2.5V4M12 20V21.5M2.5 12H4M20 12H21.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeOpacity="0.6"
              />

              {/* Rotating Radar Laser Beam Ring */}
              <motion.circle
                cx="12"
                cy="12"
                r="8.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="18 36"
                strokeLinecap="round"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                style={{ transformOrigin: '12px 12px' }}
              />

              {/* Scanning Crosshair Diamond */}
              <motion.polygon
                points="12,6 15,12 12,18 9,12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                fill="currentColor"
                fillOpacity="0.25"
                animate={{ rotate: [0, 90, 180, 270, 360], scale: [0.85, 1.05, 0.85] }}
                transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                style={{ transformOrigin: '12px 12px' }}
              />

              {/* Central Pulsing Node */}
              <motion.circle
                cx="12"
                cy="12"
                r="2"
                fill="currentColor"
                animate={{ scale: [0.8, 1.3, 0.8], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut' }}
                style={{ transformOrigin: '12px 12px' }}
              />
            </motion.g>
          ) : animState === 'completed' ? (
            <motion.g
              key="completed-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              {/* Outer Success Ring */}
              <motion.circle
                cx="12"
                cy="12"
                r="8.5"
                stroke="currentColor"
                strokeWidth="1.8"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />

              {/* Animated Ready Checkmark */}
              <motion.path
                d="M8 12.2L10.8 15L16 9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.35, delay: 0.1, ease: 'easeOut' }}
              />
            </motion.g>
          ) : (
            <motion.g
              key="idle-icon"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
            >
              {/* Outer Discovery Radar Ring */}
              <circle
                cx="12"
                cy="12"
                r="8.5"
                stroke="currentColor"
                strokeWidth="1.6"
                className="recs-nav-ring"
              />

              {/* 4 Cardinal Locator Ticks */}
              <path
                d="M12 2.5V4M12 20V21.5M2.5 12H4M20 12H21.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="recs-nav-ticks"
              />

              {/* AI Compass Needle Diamond */}
              <g className="recs-nav-needle">
                <polygon
                  points="12,5.5 15.5,12 12,18.5 8.5,12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                  className="recs-nav-diamond"
                />
                <circle cx="12" cy="12" r="1.8" fill="currentColor" className="recs-nav-core" />
              </g>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  )
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'sidebar.dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'library', label: 'sidebar.library', icon: Library, path: '/library' },
  { id: 'player-dna', label: 'sidebar.playerDna', icon: Dna, path: '/player-dna' },
  { id: 'recommendations', label: 'sidebar.recommendations', icon: RecommendationsNavIcon, path: '/recommendations' },
  { id: 'search', label: 'sidebar.aiSearch', icon: Brain, path: '/search' },
  { id: 'timeline', label: 'sidebar.timeline', icon: History, path: '/timeline' },
  { id: 'journal', label: 'sidebar.journal', icon: BookOpen, path: '/journal' },
  { id: 'profile', label: 'sidebar.profile', icon: User, path: '/profile/me' },
  { id: 'friends', label: 'sidebar.friends', icon: Users, path: '/friends' },
  { id: 'chats', label: 'sidebar.chats', icon: MessageSquare, path: '/chats' }
]

export function Sidebar(): React.JSX.Element {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const { hasUnreadChats, hasNewJournal } = useAppStore()
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <motion.aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      animate={{ width: collapsed ? 64 : 252 }}
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Brand Header */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <Gamepad2 size={17} />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              className="sidebar__logo-text"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
            >
              <span className="sidebar__logo-name">GAMEMIND</span>
              <Badge variant="muted" size="xs" bracketed className="sidebar__version-badge">
                v{APP_VERSION}
              </Badge>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Collapse Toggle */}
      <div className="sidebar__toggle-wrapper">
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand [Ctrl+B]' : 'Collapse [Ctrl+B]'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="sidebar__nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)

          return (
            <button
              key={item.id}
              className={`sidebar__nav-item ${active ? 'sidebar__nav-item--active' : ''}`}
              onClick={() => navigate(item.path)}
              title={collapsed ? t(item.label) : undefined}
            >
              {active && <div className="sidebar__nav-active-marker" aria-hidden="true" />}
              <div className="sidebar__nav-icon-wrapper">
                <Icon size={18} className="sidebar__nav-icon" />
                {item.id === 'chats' && hasUnreadChats && (
                  <span className="sidebar__nav-badge" />
                )}
                {item.id === 'journal' && hasNewJournal && (
                  <span className="sidebar__nav-badge" />
                )}
              </div>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    className="sidebar__nav-label"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {t(item.label)}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* Console Footer */}
      <div className="sidebar__footer">
        {/* Creator Info Block */}
        {!collapsed ? (
          <div className="sidebar__author">
            <div className="sidebar__author-header">
              <span className="sidebar__author-tag font-mono">[ BY LENNIELAN ]</span>
            </div>
            <div className="sidebar__author-links">
              <button
                type="button"
                className="sidebar__author-pill"
                onClick={() => window.api.openExternal('https://github.com/lennielan')}
                title={t('sidebar.author.githubTooltip', 'GitHub автора: github.com/lennielan')}
                aria-label="GitHub @lennielan"
              >
                <Github size={12} />
                <span>{t('sidebar.author.github', 'GitHub')}</span>
              </button>
              <button
                type="button"
                className="sidebar__author-pill"
                onClick={() => window.api.openExternal('https://t.me/lkwwxd')}
                title={t('sidebar.author.telegramTooltip', 'Telegram автора: @lkwwxd')}
                aria-label="Telegram @lkwwxd"
              >
                <Send size={12} />
                <span>{t('sidebar.author.telegram', 'Telegram')}</span>
              </button>
              <button
                type="button"
                className="sidebar__author-pill sidebar__author-pill--repo"
                onClick={() => window.api.openExternal('https://github.com/lennielan/GameMind_AI')}
                title={t('sidebar.author.repoTooltip', 'Репозиторий проекта: github.com/lennielan/GameMind_AI')}
                aria-label="GameMind AI GitHub Repository"
              >
                <Star size={11} className="sidebar__star-icon" />
                <span>{t('sidebar.author.repo', 'Repo')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="sidebar__author-collapsed">
            <button
              type="button"
              className="sidebar__author-icon-btn"
              onClick={() => window.api.openExternal('https://github.com/lennielan/GameMind_AI')}
              title={t('sidebar.author.collapsedTooltip', '[ BY LENNIELAN ] // GitHub & Репозиторий')}
              aria-label="GameMind AI by lennielan"
            >
              <Github size={16} />
            </button>
          </div>
        )}

        <button
          className={`sidebar__nav-item ${isActive('/settings') ? 'sidebar__nav-item--active' : ''}`}
          onClick={() => navigate('/settings')}
          title={collapsed ? t('sidebar.settings', 'Settings') : undefined}
        >
          {isActive('/settings') && <div className="sidebar__nav-active-marker" aria-hidden="true" />}
          <div className="sidebar__nav-icon-wrapper">
            <Settings size={18} className="sidebar__nav-icon" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                className="sidebar__nav-label"
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                {t('sidebar.settings', 'Settings')}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
