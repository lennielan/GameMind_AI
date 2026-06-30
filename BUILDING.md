# Building GameMind AI

This guide explains how to compile the GameMind AI application into a standalone Windows `.exe` installer. 

## Prerequisites

Before building the application, ensure you have the following installed:
1. **Node.js** (v18 or higher recommended)
2. **Visual Studio Build Tools** (Required for compiling native dependencies like `better-sqlite3` on Windows).

## Build Instructions

To generate the installer, open a terminal in the root of the project directory and run the following command:

```bash
npm run build:win
```

### What this command does:
1. It transpiles and bundles the TypeScript code for the Electron Main process and Renderer process using Vite.
2. It compiles the native `better-sqlite3` C++ binary to match the specific V8 engine version used by Electron.
3. It packages the application using `electron-builder` into an NSIS installer (`.exe`).

## Locating the Executable

Once the build process completes successfully, the generated `.exe` file will be located in the `dist` folder at the root of the project:

```
AiSteamAdvisor/
└── dist/
    └── GameMind AI Setup 0.1.0.exe
```

You can share this `.exe` file with your friends. When they run it, it will automatically install GameMind AI on their machine and create a desktop shortcut.

## Troubleshooting

- **ModuleNotFoundError: No module named 'distutils'**: If you encounter this during `better-sqlite3` compilation, your Python version is too new (3.12+). The easiest fix is to run `python -m pip install setuptools` to restore the missing module.
- **Dynamic Require Error**: Ensure that `better-sqlite3` is listed under `"dependencies"` (not `"devDependencies"`) in `package.json` so that the bundler treats it as an external native module.
