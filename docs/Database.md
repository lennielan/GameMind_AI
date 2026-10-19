# Database Architecture

GameMind AI uses a **Hybrid Database Architecture** to maximize performance, ensure offline capabilities, and enable social cloud features. Responsibilities are strictly divided between a Local SQLite database and a Remote Supabase (PostgreSQL) database.

## 1. Local Database (SQLite)
Powered by `better-sqlite3`, this database resides on the user's local disk (`gamemind.db`).

**Purpose:** Local cache and fast computation layer.
**Benefits:** Instant access (<1ms), offline support, no cloud storage costs for massive libraries.

### Stored Data:
- **`user_profile` (Local Cache)**: Basic Steam user data for offline use.
- **`games`**: The user's complete Steam library (caching genres, tags, playtimes).
- **`achievements`**: All unlocked achievements for all games.
- **`player_dna`**: AI-generated psychological traits and summaries.
- **`recommendations`**: Cached AI-generated game suggestions based on library.
- **`playtime_snapshots` / `game_journals` / `timeline_entries`**: Local historical logs and AI narratives.
- **`sync_log`**: Local audit trail of background synchronization.

## 2. Cloud Database (Supabase PostgreSQL)
Powered by the `@supabase/supabase-js` client.

**Purpose:** Social features, cross-device synchronization, and shared state.
**Benefits:** Real-time subscriptions, secure RLS policies, global accessibility.

### Stored Data:
- **`friends`**: Real-time social connections and friend requests.
- **`messages` / `conversations`**: Direct messaging system.
- **`favorites`**: User's top games with AI-generated reviews, visible to friends.
- **`recommendation_blacklist` / `history`**: Global sync of games the user doesn't want to see recommended across devices.

## Repositories
All database interactions are centralized in `src/main/database/repositories/`. 
- No direct SQL execution should occur in Services or IPC handlers.
- Repositories abstract the underlying technology (e.g., `FavoritesRepository` uses Supabase, while `GamesRepository` uses SQLite).
