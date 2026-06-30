# API Architecture

## 1. Steam Web API (`steam-api.client.ts`)
Responsible for fetching public user data from Steam.
- **Endpoints Used**:
  - `ISteamUser/GetPlayerSummaries/v0002/`
  - `IPlayerService/GetOwnedGames/v0001/`
  - `ISteamUserStats/GetPlayerAchievements/v0001/`
- **Error Handling**: Detects 403 (Private Profile) and 400 (No achievements for game).
- **Store API Bypass**: Uses `https://store.steampowered.com/api/appdetails` for extended game data, handling 429 Rate Limits carefully.

## 2. OpenAI API (`openai.client.ts`)
Responsible for generating Player DNA and Recommendations.
- **Current Flow**: Direct API calls from the Main process using the user-provided API key.
- **Payload Strategy**: To save tokens, only the Top 50 games (by playtime) are sent to the LLM for analysis, stripped of unnecessary metadata.
- **JSON Enforcement**: Prompts enforce JSON schema outputs, and the client parses the response.
