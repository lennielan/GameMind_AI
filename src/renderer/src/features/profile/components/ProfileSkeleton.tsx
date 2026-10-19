// ============================================================
// ProfileSkeleton Component
// ============================================================

import { motion } from 'framer-motion'
import './ProfileSkeleton.css'

export function ProfileSkeleton(): React.JSX.Element {
  return (
    <div className="profile-skeleton">
      <div className="profile-skeleton__header">
        <div className="profile-skeleton__avatar pulse-anim"></div>
        <div className="profile-skeleton__info">
          <div className="profile-skeleton__text pulse-anim" style={{ width: '200px', height: '32px' }}></div>
          <div className="profile-skeleton__text pulse-anim" style={{ width: '120px', height: '20px', marginTop: '8px' }}></div>
        </div>
      </div>
      <div className="profile-skeleton__sections">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="profile-skeleton__section pulse-anim"></div>
        ))}
      </div>
    </div>
  )
}
