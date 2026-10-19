// ============================================================
// Router — Application routing
// ============================================================

import { createHashRouter } from 'react-router-dom'
import { MainLayout } from './components/layout/MainLayout'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { LibraryPage } from './features/library/LibraryPage'
import { PlayerDnaPage } from './features/player-dna/PlayerDnaPage'
import { RecommendationsPage } from './features/recommendations/RecommendationsPage'
import { SemanticSearchPage } from './features/search/SemanticSearchPage'
import { FriendsPage } from './features/friends/FriendsPage'
import { TimelinePage } from './features/timeline/TimelinePage'
import { JournalPage } from './features/journal/JournalPage'
import { UserProfilePage } from './features/profile/UserProfilePage'
import { ProfilePage } from './features/profile/ProfilePage'
import { ChatsPage } from './features/chats/ChatsPage'
import { PlaceholderPage } from './components/ui/PlaceholderPage'
import {
  Lightbulb,
  BarChart3,
  Users,
  ShoppingCart,
  Compass
} from 'lucide-react'

import { OverlayPage } from './features/overlay/OverlayPage'

export const router = createHashRouter([
  {
    path: '/overlay',
    element: <OverlayPage />
  },
  {
    path: '/',
    element: <MainLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        path: 'library',
        element: <LibraryPage />
      },
      {
        path: 'player-dna',
        element: <PlayerDnaPage />
      },
      {
        path: 'recommendations',
        element: <RecommendationsPage />
      },
      {
        path: 'search',
        element: <SemanticSearchPage />
      },
      {
        path: 'friends',
        element: <FriendsPage />
      },
      {
        path: 'timeline',
        element: <TimelinePage />
      },
      {
        path: 'journal',
        element: <JournalPage />
      },
      {
        path: 'profile/me',
        element: <ProfilePage />
      },
      {
        path: 'profile/:userId',
        element: <UserProfilePage />
      },
      {
        path: 'chats',
        element: <ChatsPage />
      },
      {
        path: 'insights',
        element: (
          <PlaceholderPage
            title="AI Insights"
            description="Discover interesting patterns and observations about your gaming habits."
            icon={Lightbulb}
          />
        )
      },
      {
        path: 'analytics',
        element: (
          <PlaceholderPage
            title="Analytics"
            description="Interactive dashboards with genre distribution, playtime heatmaps, and trends."
            icon={BarChart3}
          />
        )
      },
      {
        path: 'social',
        element: (
          <PlaceholderPage
            title="Social"
            description="Compare libraries with friends, find games to play together, and discover similarities."
            icon={Users}
          />
        )
      },
      {
        path: 'wishlist',
        element: (
          <PlaceholderPage
            title="Wishlist AI"
            description="AI-powered wishlist analysis with buy priority estimation and discount tracking."
            icon={ShoppingCart}
          />
        )
      },
      {
        path: 'discovery',
        element: (
          <PlaceholderPage
            title="Game Discovery"
            description="Explore games from multiple sources with enriched metadata from RAWG, IGDB, and more."
            icon={Compass}
          />
        )
      },
      { path: 'settings', element: <SettingsPage /> }
    ]
  }
])
