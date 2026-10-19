# Configuration Management

GameMind AI uses `electron-store` for configuration management.
This is distinct from the SQLite database; `electron-store` is used exclusively for application settings, secrets, and preferences that need to load immediately before the DB initializes.

## Config schema
- `theme`: 'light' | 'dark' | 'system'
- `language`: 'en' | 'ru'
- `steamApiKey`: Encrypted string
- `openAiApiKey`: Encrypted string
- `autoSync`: boolean

## Security
Sensitive keys (Steam API, OpenAI) are encrypted using Electron's `safeStorage` API before being saved to the JSON file by `config-manager.ts`. They are decrypted in memory when needed by the Service layer.
