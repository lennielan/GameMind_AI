# Folder Structure

The project follows a modular, feature-based structure for the UI and a domain-driven structure for the backend.

```text
src/
├── main/                   # Main Process (Node.js backend)
│   ├── cache/              # File-based caching system
│   ├── config/             # App configuration and secrets management
│   ├── database/           # SQLite initialization, migrations, and repositories
│   ├── ipc/                # IPC Handlers (endpoints exposed to UI)
│   ├── logger/             # Centralized logging system
│   └── services/           # Business logic
│       ├── ai/             # OpenAI client, DNA engine, Matcher
│       └── steam/          # Steam API clients, Sync engine
│
├── preload/                # Preload Process (IPC Bridge)
│   └── index.ts            # contextBridge exposure
│
├── renderer/               # Renderer Process (React UI)
│   ├── index.html          # Entry point
│   └── src/
│       ├── components/     # Shared UI components (layout, buttons, cards)
│       ├── features/       # Feature-sliced modules (dashboard, library, settings)
│       ├── i18n/           # Internationalization (ru, en)
│       ├── stores/         # Zustand global state (theme, app status)
│       └── styles/         # Global CSS and variables
│
└── shared/                 # Shared resources (Main + Renderer)
    ├── constants/          # Shared constants (API endpoints, IPC channels)
    └── types/              # TypeScript interfaces (models, IPC payloads)
```
