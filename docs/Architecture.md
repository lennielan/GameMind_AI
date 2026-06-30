# Architecture Overview

GameMind AI follows a strictly separated multi-process architecture based on Electron's best practices. The goal is maximum security, performance, and clear separation of concerns.

## Process Model

### 1. Main Process (Node.js)
The brain of the application. It has full access to the operating system and Node.js APIs.
- **Responsibilities**: Database management (SQLite), File System access (Cache, Logs), External API calls (Steam, OpenAI), Window management.
- **Security**: Handles all secrets (API keys) securely. The Renderer never sees them.

### 2. Preload Process (Bridge)
The secure bridge between the Main process and the Renderer process.
- **Responsibilities**: Exposes a strongly-typed `window.api` object using `contextBridge`.
- **Security**: Ensures the Renderer cannot arbitrarily execute Node.js code.

### 3. Renderer Process (React UI)
The user interface. Runs in a Chromium sandbox.
- **Responsibilities**: Rendering React components, managing local UI state (Zustand), handling user interactions.
- **Security**: `nodeIntegration` is `false`. `contextIsolation` is `true`.

## Core Architectural Patterns
- **Repository Pattern**: All database access goes through strict repositories (`games.repository.ts`, `player-dna.repository.ts`) rather than ad-hoc SQL queries.
- **Service Layer**: Complex business logic (AI parsing, Steam Syncing) is encapsulated in services rather than IPC handlers.
- **Event-Driven UI Updates**: Long-running tasks (like Steam Sync) emit progress events via WebContents to the Renderer, allowing real-time UI updates without polling.
