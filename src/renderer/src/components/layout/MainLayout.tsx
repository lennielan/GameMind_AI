// ============================================================
// Main Layout — App shell with sidebar and content area
// ============================================================

import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { OnboardingTutorialOverlay } from '../onboarding/OnboardingTutorialOverlay'
import './MainLayout.css'

export function MainLayout(): React.JSX.Element {
  const location = useLocation()
  const isChatsRoute = location.pathname === '/chats'

  return (
    <div className="app-layout">
      <Header />
      <div className="app-layout__body">
        <Sidebar />
        <main className="app-layout__content">
          <div className={`app-layout__scroll${isChatsRoute ? ' app-layout__scroll--full-bleed' : ''}`}>
            <Outlet />
          </div>
        </main>
      </div>
      <OnboardingTutorialOverlay />
    </div>
  )
}
