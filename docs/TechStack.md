# Technology Stack

## Frontend (Renderer Process)
- **Framework**: React 19
- **Language**: TypeScript 5.7
- **Build Tool**: Vite 6 (via `electron-vite`)
- **State Management**: Zustand 5
- **Routing**: React Router DOM 7
- **Styling**: CSS (BEM methodology / Custom properties), Lucide React (Icons)
- **Animations**: Framer Motion 11
- **Data Visualization**: Recharts 3
- **i18n**: i18next & react-i18next

## Backend (Main Process)
- **Runtime**: Node.js (via Electron 33)
- **Language**: TypeScript
- **Database**: SQLite (currently `sql.js`, migrating to `better-sqlite3`)
- **Configuration Storage**: `electron-store` (for encrypted API keys and settings)
- **AI Integration**: OpenAI SDK (Custom wrappers)
- **API Clients**: Native `fetch` for Steam Web API and Store API

## Architecture Tools
- **IPC Bridge**: `@electron-toolkit/preload` for strict context isolation
- **Linting**: ESLint (`@electron-toolkit/eslint-config-ts`)
- **Testing**: Vitest 2.1
- **Packaging**: `electron-builder`

## Why This Stack?
- **Electron + React**: Provides a native-feeling desktop experience while leveraging a massive web ecosystem for UI.
- **Zustand**: Lightweight, boilerplate-free state management perfect for isolated UI states.
- **SQLite**: Local-first data architecture. Essential for user privacy and offline capabilities.
