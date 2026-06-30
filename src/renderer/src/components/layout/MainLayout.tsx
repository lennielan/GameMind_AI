// ============================================================
// Main Layout — App shell with sidebar and content area
// ============================================================

import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import './MainLayout.css'

export function MainLayout(): React.JSX.Element {
  return (
    <div className="app-layout">
      <Header />
      <div className="app-layout__body">
        <Sidebar />
        <main className="app-layout__content">
          <div className="app-layout__scroll">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
