# Technical Debt

1. **In-Memory SQLite (Critical)**: `sql.js` currently used. This forces the entire DB to serialize to disk on every change. Will cause UI freezes and memory crashes on large libraries.
2. **AI Fallbacks (High)**: `dna-engine.ts` returns a mocked Russian/English JSON if OpenAI fails. This creates a false sense of success in the UI.
3. **Synchronous Steam API Calls (High)**: `sync-engine.ts` fetches achievements without a backoff queue, violating Steam's API rate limits.
4. **Missing Error Boundaries (Medium)**: React UI does not have global error boundaries. If an IPC call fails unexpectedly, the UI might crash or show empty states without explaining why.
