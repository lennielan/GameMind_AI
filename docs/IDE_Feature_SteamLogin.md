# SYSTEM INSTRUCTION FOR ANTIGRAVITY IDE AGENT

**ROLE:** Primary Full-Stack Developer for GameMind AI
**OBJECTIVE:** Implement Steam Authentication via Electron BrowserWindow for Wishlist Sync

## Context
Steam's store API aggressively blocks unauthenticated `fetch` requests with Cloudflare 429/302 errors. The ONLY reliable way to fetch a user's wishlist is to have them actually log into the Steam Store, which saves session cookies in Electron's `session.defaultSession`. Our `net.fetch` calls will then automatically use these cookies and bypass Steam's bot protection.

The user wants a beautiful, native-looking Steam Login flow integrated into the app.

## Implementation Steps

### 1. Main Process: Auth IPC Handler
Create a new file `src/main/ipc/auth.ipc.ts` (or add to existing steam IPC):
- Implement `ipcMain.handle('steam:checkAuth', ...)`:
  - Uses `session.defaultSession.cookies.get({ url: 'https://store.steampowered.com' })`
  - Returns `true` if a cookie named `steamLoginSecure` exists.
- Implement `ipcMain.handle('steam:login', ...)`:
  - Opens a new `BrowserWindow` (width 500, height: 700, `modal: true`, `parent: mainWindow`, `autoHideMenuBar: true`).
  - `win.loadURL('https://store.steampowered.com/login/')`
  - Listen to `win.webContents.on('did-navigate', (event, url) => { ... })`.
  - If the `url` is exactly `https://store.steampowered.com/` (or starts with it but is not `/login`), it means the user successfully logged in and Steam redirected them to the homepage.
  - Close the `win` and resolve the promise with `true`.
  - Also handle `win.on('closed')` to resolve with `false` if the user manually closes it without logging in.

### 2. Preload Script
In `src/preload/index.ts`, expose the new IPC methods:
```ts
steam: {
  // ... existing methods
  checkAuth: () => ipcRenderer.invoke('steam:checkAuth'),
  login: () => ipcRenderer.invoke('steam:login')
}
```

### 3. UI: Steam Login Modal Component
Create a beautiful React component: `src/renderer/src/components/SteamLoginModal.tsx`.
- **Design:** Must match the premium, dark, glassmorphism design of the app. Use rich colors (Steam's deep blues `#171a21`, `#66c0f4`), smooth micro-animations, and a sleek layout.
- **Logic:**
  - On mount, call `window.api.steam.checkAuth()`.
  - If `false`, show the modal over the dashboard.
  - Text: "Link your Steam Account to continue" / "Required for syncing your private Wishlist and Library accurately."
  - Button: "Sign In via Steam". When clicked, call `window.api.steam.login()`.
  - Show a loading spinner while the popup is open.
  - If login succeeds, show a success animation and hide the modal so the user can use the app.
- **Integration:** Place this modal in `Dashboard.tsx` or `App.tsx` so it blocks or overlays the main view if the user is not authenticated.

### 4. Steam API Client Update
Ensure `src/main/services/steam/steam-api.client.ts` uses `net.fetch` (which it currently does). Since `net.fetch` uses `session.defaultSession`, it will automatically pick up the cookies set by the login window! 

**CRITICAL RULES:**
1. DO NOT use `<webview>`. Open a native Electron `BrowserWindow` for the login popup.
2. Maintain the highest standard of UI/UX for the React modal. It must look expensive and fluid.
3. Make sure to register the IPC handlers in the main entry point (`src/main/index.ts`).
