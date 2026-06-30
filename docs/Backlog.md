# Product Backlog

## High Priority
- [ ] Migrate database engine from `sql.js` to `better-sqlite3`.
- [ ] Implement a robust queue for `sync-engine.ts` to respect Steam's 200 requests/5min limit.
- [ ] Remove hardcoded DNA mock in `dna-engine.ts` and handle API failures via UI alerts.

## Medium Priority
- [ ] Create the "Recommendations" page and backend AI logic.
- [ ] Add loading skeletons and spinners in the UI during IPC calls.
- [ ] Implement vitest test suites for Repositories.
- [ ] Support local AI models (LM Studio / Ollama API integration).

## Low Priority
- [ ] Add Steam login via OAuth instead of manual API Key entry (if possible without exposing client secrets).
- [ ] Export DNA profile as an image to share on social media.
