# Database Architecture

## Current Implementation: `sql.js`
GameMind AI currently uses `sql.js` for its database.
- **How it works**: Compiles SQLite to WebAssembly. The entire database resides in RAM during application runtime.
- **Persistence Mechanism**: On every data mutation (INSERT/UPDATE), a debounced function `db.export()` is called. This serializes the *entire* in-memory database to a Uint8Array and writes the complete file to the disk.

### Critical Scalability Risk (Technical Debt)
The `sql.js` implementation is a massive bottleneck. For a user with 1,000 games and 10,000 achievements, the database file will grow to several megabytes. Rewriting a multi-megabyte file to disk every time a single achievement is synced will cause severe UI freezing, memory bloat, and massive disk I/O.
**Migration to `better-sqlite3` is a P0 (Critical) priority.**

## Schema Overview
- **`user_profile`**: Stores basic Steam user data.
- **`games`**: Stores the user's library. Contains caching columns for genres, tags, and achievement counts.
- **`achievements`**: Stores individual achievements linked via `app_id` to the `games` table.
- **`player_dna`**: Stores the AI-generated psychological traits.
- **`recommendations`**: Stores AI-generated game suggestions.
- **`sync_log`**: Audit trail of synchronization attempts.

## Repositories
All queries are centralized in `src/main/database/repositories/`. No direct SQL execution should occur in Services or IPC handlers.
