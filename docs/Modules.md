# Modules Documentation

## 1. Sync Engine (`src/main/services/steam/sync-engine.ts`)
The core module responsible for fetching data from Steam and persisting it to the local SQLite database.
- **Flow**: Fetches profile -> Fetches owned games -> Fetches achievements for each game -> Updates DB.
- **Current Limitation**: Fully synchronous processing of achievements which can block the event loop or trigger Steam API rate limits.

## 2. DNA Engine (`src/main/services/ai/dna-engine.ts`)
Analyzes the user's game library (top 50 games by playtime) to generate a psychological profile ("Player DNA").
- **Flow**: Extracts genres, tags, and playtime -> Prompts OpenAI -> Parses JSON response -> Saves traits to DB.
- **Current Limitation**: Relies on a mocked hardcoded response if the OpenAI API fails or rate-limits.

## 3. IPC Layer (`src/main/ipc/*`)
Acts as the "Controllers" of the application.
- Receives requests from the React frontend.
- Calls the appropriate Service or Repository.
- Returns data or throws errors back across the IPC bridge.

## 4. UI Features (`src/renderer/src/features/*`)
Feature-sliced architecture for the frontend. Each folder contains its own page component, specific sub-components, and localized CSS.
- `dashboard/`: Overview of stats and recent games.
- `library/`: Grid/List view of the user's Steam library.
- `player-dna/`: Visualization of the AI-generated traits.
- `settings/`: Configuration (Steam ID, API keys, Language).
