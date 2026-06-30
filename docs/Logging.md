# Logging Strategy

GameMind AI employs a custom logging module (`src/main/logger/logger.ts`).

## Features
- **File Rotation**: Logs are saved to `AppData/Roaming/gamemind-ai/logs/`.
- **Log Levels**: DEBUG, INFO, WARN, ERROR.
- **Console Output**: Formatted console output for development.

## Usage Rule
`console.log` MUST NOT be used in the Main process. All backend logging must go through the `logger` utility to ensure errors are captured on user machines.

```ts
import { logger } from '../logger/logger'

logger.info('SyncEngine', 'Starting full synchronization')
logger.error('Database', 'Failed to run migration', error)
```
