// ============================================================
// Placeholder Page — Reusable coming soon template
// ============================================================

import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: LucideIcon
}

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps): React.JSX.Element {
  return (
    <motion.div
      className="placeholder-page"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
        textAlign: 'center'
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: 'var(--accent-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-primary)',
          marginBottom: 8
        }}
      >
        <Icon size={28} />
      </div>
      <h1
        style={{
          fontSize: 'var(--font-2xl)',
          fontWeight: 'var(--weight-bold)',
          color: 'var(--text-primary)',
          letterSpacing: '-0.3px'
        }}
      >
        {title}
      </h1>
      <p
        style={{
          fontSize: 'var(--font-md)',
          color: 'var(--text-tertiary)',
          maxWidth: 400
        }}
      >
        {description}
      </p>
      <span
        style={{
          fontSize: 'var(--font-xs)',
          color: 'var(--accent-primary)',
          background: 'var(--accent-subtle)',
          padding: '4px 12px',
          borderRadius: 'var(--radius-full)',
          fontWeight: 'var(--weight-semibold)',
          marginTop: 8,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        Coming Soon
      </span>
    </motion.div>
  )
}
