# GameMind AI

> AI-powered gaming analytics platform for Steam

## Quick Start

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build:win
```

## Architecture

- **Main Process** (`src/main/`) — Node.js backend: database, API clients, services
- **Renderer Process** (`src/renderer/`) — React UI: components, pages, stores
- **Preload** (`src/preload/`) — Secure IPC bridge between processes
- **Shared** (`src/shared/`) — Types and constants used by all processes

## Tech Stack

| Layer | Technology |
|:--|:--|
| Desktop | Electron 33 |
| UI | React 19 + TypeScript |
| Build | electron-vite (Vite 6) |
| State | Zustand 5 |
| Database | SQLite (better-sqlite3) |
| Config | electron-store (encrypted) |
| Charts | Recharts |
| Animations | Framer Motion |
| Icons | Lucide React |

## Security

- `contextIsolation: true` — renderer has no direct Node.js access
- `nodeIntegration: false` — all IPC goes through preload bridge
- API keys encrypted via Electron `safeStorage`
- CSP headers in production builds
