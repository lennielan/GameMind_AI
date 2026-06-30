// ============================================================
// Sidebar — Main navigation
// ============================================================

import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Library,
  Dna,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
  Gamepad2,
  Users,
  Brain
} from 'lucide-react'
import './Sidebar.css'

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  path: string
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'sidebar.dashboard', icon: LayoutDashboard, path: '/' },
  { id: 'library', label: 'sidebar.library', icon: Library, path: '/library' },
  { id: 'player-dna', label: 'sidebar.playerDna', icon: Dna, path: '/player-dna' },
  { id: 'recommendations', label: 'sidebar.recommendations', icon: Sparkles, path: '/recommendations' },
  { id: 'search', label: 'sidebar.aiSearch', icon: Brain, path: '/search' },
  { id: 'friends', label: 'sidebar.friends', icon: Users, path: '/friends' }
]

export function Sidebar(): React.JSX.Element {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string): boolean => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  return (
    <motion.aside
      className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Logo */}
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon">
          <Gamepad2 size={22} />
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
              <span className="sidebar__logo-name">GameMind</span>
              <span className="sidebar__logo-ai">AI</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div style={{ padding: '0 var(--space-2)', paddingBottom: 'var(--space-2)' }}>
        <button
          className="sidebar__toggle"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Navigation */}
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
              {active && (
                <motion.div
                  className="sidebar__nav-indicator"
                  layoutId="sidebar-indicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <Icon size={20} className="sidebar__nav-icon" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    className="sidebar__nav-label"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {t(item.label)}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar__footer">
        <button
          className="sidebar__nav-item"
          onClick={() => navigate('/settings')}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                className="sidebar__nav-label"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                Settings
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  )
}
