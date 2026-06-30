# Long-Term Roadmap

## Phase 1: Prototype (Completed)
- Basic Electron + Vite Setup
- React + Tailwind/CSS UI Foundation
- SQLite (sql.js) setup
- Basic Steam API Sync implementation

## Phase 2: Core MVP (Current Phase)
- **Migrate Database**: Move from `sql.js` to `better-sqlite3`.
- **Robust Sync**: Fix rate limits, implement a background sync queue.
- **DNA Engine V1**: Integrate OpenAI properly with a fallback to a local LLM prompt, removing hardcoded mocks.
- **Basic Library View**: Polished UI for browsing synced games.

## Phase 3: Public Beta
- **Explainable Recommendations**: AI-driven game suggestions based on the DNA profile.
- **Error Handling**: Graceful degradation when offline or when APIs fail.
- **Settings & Config**: Full i18n support, theme customization.
- **Telemetry (Opt-in)**: Basic usage metrics to improve the AI.

## Phase 4: Release 1.0
- **Polished UI/UX**: All animations smooth, no layout shifts.
- **Local AI Option**: Integration with `Ollama` or `LM Studio` for users who want zero-cost, 100% private AI profiling.
- **Mac & Linux Builds**.

## Phase 5: Version 2.0 (Long-term Vision)
- **Social DNA Matching**: Find friends or communities with similar gaming psychology.
- **Multi-Platform**: Integration with Epic Games, Xbox, PlayStation APIs.
- **Predictive Analytics**: "Will you like this upcoming game?" based on early trailers/tags.
