# SYSTEM INSTRUCTION FOR ANTIGRAVITY IDE AGENT

**ROLE:** Primary Full-Stack Developer for GameMind AI
**OBJECTIVE:** Fix the "Ghost Window" bug where clicking the Steam Login button does absolutely nothing.

## Deep Analysis of the Bug

The user reported that clicking the "Войти через Steam" button in the Settings page results in absolutely nothing happening.

**Root Causes:**
1. **The `ready-to-show` Ghost Window trap:** In `steam.ipc.ts`, the `BrowserWindow` for Steam login is created with `show: false`, and then we do `loginWin.once('ready-to-show', () => loginWin.show())`. On some Windows machines, or depending on how Steam's login page renders (e.g. if it uses weird redirects or doesn't paint immediately), the `ready-to-show` event **never fires**. This results in an invisible "ghost" modal window that is technically open in the background but completely hidden from the user, making it seem like the button does nothing.
2. **Code Duplication & Confusion:** There are currently TWO IPC handlers (`STEAM_LOGIN` and `STEAM_STORE_LOGIN`) doing almost the exact same thing in `steam.ipc.ts`. 

## Implementation Plan (Fixes to apply)

### 1. Unify and Fix the IPC Handler (`src/main/ipc/steam.ipc.ts`)
- Completely remove the `STEAM_STORE_LOGIN` handler. We will use `STEAM_LOGIN` for everything.
- In the `STEAM_LOGIN` handler:
  - REMOVE `show: false`. Let the window show immediately (`show: true` is default).
  - REMOVE the `ready-to-show` event listener.
  - Set `autoHideMenuBar: true` and `alwaysOnTop: true` to ensure the popup is visible over the main app.
  - The handler should resolve with `{ success: true, data: steamId, error: null }` after successful navigation and cookie parsing.

### 2. Update React Components
- In `src/renderer/src/components/ui/SteamLoginModal.tsx`:
  - Change `window.api.steamStoreLogin()` to `window.api.steamLogin()`.
- In `src/renderer/src/features/settings/SettingsPage.tsx`:
  - Ensure the `onClick` handler has a `try/catch` block. If `steamLogin()` fails or throws an error, it should log it to the console or show an error state so the user doesn't just see "nothing".

### 3. Cleanup `preload/index.ts` and `ipc-channels.ts`
- Remove `steamStoreLogin` from the preload `api` object.
- Remove `STEAM_STORE_LOGIN` from `IPC_CHANNELS`.

**CRITICAL RULE:** Do NOT use `show: false` for the login popup. Allow it to show instantly so the user has immediate visual feedback that the button worked!
