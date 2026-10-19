# Development Workflow

## Setup
1. Clone the repository.
2. Ensure Node.js 20+ is installed.
3. Run `npm install` to install dependencies.

## Running in Dev Mode
Run `npm run dev`.
This starts Vite in watch mode and launches the Electron application with Hot Module Replacement (HMR) for the React frontend.
If you modify Main process files, Electron will restart automatically.

## Adding a new IPC Channel
1. Define the types in `src/shared/types/ipc.types.ts`.
2. Add the channel constant in `src/shared/constants/ipc-channels.ts`.
3. Add the exposed method in `src/preload/index.ts`.
4. Add the handler in `src/main/ipc/*.ts` and register it in `src/main/ipc/index.ts`.
5. Call `window.api.yourMethod()` in the Renderer.

## Building for Production
Run `npm run build:win` to generate a Windows `.exe` installer via `electron-builder`.
Output will be in the `dist/` directory (not `out/`, which is used for compiled source files).
