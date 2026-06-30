# Data Flow & IPC Communication

GameMind AI uses a strictly typed, asynchronous IPC (Inter-Process Communication) mechanism.

## 1. Request-Response Cycle (Renderer to Main)
For fetching data or triggering actions:

1. **Renderer Component**: Calls a method on the injected `window.api` object.
   ```ts
   const stats = await window.api.getStats()
   ```
2. **Preload Bridge**: Intercepts the call and passes it via `ipcRenderer.invoke`.
3. **Main Process IPC Handler**: Listens via `ipcMain.handle`, processes the request using Repositories/Services, and returns a standardized response object:
   ```ts
   { success: true, data: { ... } } // OR { success: false, error: '...' }
   ```

## 2. Event Streaming (Main to Renderer)
For long-running tasks like Steam Synchronization:

1. **Main Process Service**: Emits events using `webContents.send()`.
   ```ts
   mainWindow.webContents.send('sync-status', { progress: 50, status: 'Fetching games' })
   ```
2. **Renderer Component**: Subscribes to these events via the preload bridge.
   ```ts
   useEffect(() => {
     const unsubscribe = window.api.onSyncStatus((status) => {
       setProgress(status.progress)
     })
     return () => unsubscribe()
   }, [])
   ```

## State Management Data Flow
- **Global UI State**: Handled by Zustand (e.g., Theme, Sidebar toggle, IsSyncing).
- **Persistent Data**: NEVER stored in Zustand permanently. The single source of truth is always the SQLite database. Zustand only holds ephemeral UI state.
