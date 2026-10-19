# Testing Strategy

## Current State
- Testing is currently the weakest point of the project.
- Vitest is configured, but no tests have been written.

## Strategy Moving Forward

### 1. Unit Tests (Backend)
- **Target**: Services (e.g., `DnaEngine`, `SyncEngine`) and AI prompt generation logic.
- **Mocks**: Mock the SQLite database and external `fetch` calls. Ensure the DNA generation behaves correctly when OpenAI returns errors or malformed JSON.

### 2. Integration Tests
- **Target**: IPC bridge and Repositories.
- **Approach**: Spin up an in-memory test database, trigger IPC commands directly (bypassing Electron UI), and assert that the database updates correctly.

### 3. Component Tests (Frontend)
- **Target**: Complex UI logic like the Dashboard charts and Library filtering.
- **Approach**: React Testing Library + Vitest.

*E2E tests (via Playwright or Spectron) are deferred until Beta phase.*
