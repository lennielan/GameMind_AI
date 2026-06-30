# Performance Optimization

## Current Bottlenecks

### 1. Database Writes (Critical)
**Issue**: `sql.js` serializes the entire in-memory database to disk on every save.
**Impact**: Saving 1 achievement causes megabytes of disk I/O.
**Solution**: Migrate to `better-sqlite3` which uses native SQLite C bindings and supports proper file-based WAL (Write-Ahead Logging) and incremental updates.

### 2. Steam Sync Rate Limits (High)
**Issue**: Fetching achievements for 500 games simultaneously will trigger HTTP 429 Too Many Requests from the Steam API.
**Impact**: Sync fails, incomplete data.
**Solution**: Implement a task queue in `sync-engine.ts` with exponential backoff and concurrency limits (e.g., max 5 parallel requests, 50ms delay between requests).

## Frontend Performance
- **React**: Renders are generally well-optimized. Zustand prevents unnecessary re-renders of the whole app when localized state changes.
- **Animations**: Handled gracefully by Framer Motion.
