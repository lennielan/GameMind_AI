# Security Standards

GameMind AI adheres to Electron security best practices.

## 1. Process Isolation
- **`nodeIntegration: false`**: The Renderer process has absolutely no access to Node.js APIs (like `fs`, `child_process`).
- **`contextIsolation: true`**: The `window` object in the Renderer is completely isolated from the Preload scripts. Communication happens strictly through the carefully designed `contextBridge`.

## 2. API Key Protection
- The React Frontend NEVER holds API keys in memory.
- The user inputs keys in the Settings UI, which are sent via IPC to the Main process.
- The Main process encrypts them using OS-level encryption (`safeStorage`) before writing them to disk via `electron-store`.
- External API calls (to Steam and OpenAI) occur exclusively in the Main process.

## 3. Web Preferences
- Web Security is ON.
- Navigation is blocked (`will-navigate` event is prevented) to stop malicious redirects inside the desktop window.
