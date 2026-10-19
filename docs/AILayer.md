# AI Architecture Layer

The AI layer in GameMind AI transforms raw Steam data into psychological insights and recommendations.

## DNA Engine (`dna-engine.ts`)
Generates the "Player DNA".
1. Extracts the Top 50 games from the SQLite DB (sorted by playtime).
2. Maps them to an essential format `{ name, playtimeHours, genres, tags }` to minimize token usage.
3. Constructs a strict system prompt demanding a JSON response matching the `PlayerDnaSummary` and `PlayerDnaTrait` schema.
4. On API rate limits (HTTP 429), it currently falls back to a mocked, hardcoded response.
   - **Tech Debt**: This fallback is unacceptable for production. It should either queue the request or inform the user clearly instead of faking data.

## Recommendations Engine (`recommendations-engine.ts`)
*Currently a stub/placeholder.*
Future Implementation plan:
1. Fetch Player DNA traits.
2. Fetch User Wishlist.
3. Compare Wishlist game tags against DNA traits.
4. Output a ranked list of games with a "Reasoning" string (e.g., "Because you enjoy deep tactical thinking, this strategy game fits perfectly.")
