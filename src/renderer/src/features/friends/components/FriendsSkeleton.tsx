// ============================================================
// FriendsSkeleton Component
// ============================================================

import React from 'react'

export function FriendsSkeleton({ count = 8 }): React.JSX.Element {
  return (
    <div className="users-grid">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="user-card skeleton-card pulse-anim" style={{ height: '220px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="skeleton-avatar pulse-anim" style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface-3)' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', width: '100%' }}>
            <div className="skeleton-text pulse-anim" style={{ width: '120px', height: '20px', background: 'var(--surface-3)', borderRadius: '4px' }}></div>
            <div className="skeleton-text pulse-anim" style={{ width: '80px', height: '14px', background: 'var(--surface-3)', borderRadius: '4px' }}></div>
          </div>
          <div style={{ display: 'flex', gap: '8px', width: '100%', marginTop: 'auto' }}>
            <div className="skeleton-btn pulse-anim" style={{ flex: 1, height: '36px', background: 'var(--surface-3)', borderRadius: '8px' }}></div>
            <div className="skeleton-btn pulse-anim" style={{ flex: 1, height: '36px', background: 'var(--surface-3)', borderRadius: '8px' }}></div>
          </div>
        </div>
      ))}
    </div>
  )
}
