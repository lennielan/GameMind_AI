# Minimum Viable Product (MVP) Definition

For GameMind AI to reach a successful MVP state, it MUST have the following functionality working flawlessly:

1. **Authentication**: Users can input their Steam ID/Vanity URL and Steam Web API Key securely.
2. **Synchronization**: The app can pull 100% of the user's public library and achievement data without hitting API rate limits or crashing the app.
3. **Performance**: The app loads instantly and does not freeze during syncing (requires `better-sqlite3`).
4. **Player DNA**: The AI successfully parses the top 50 games and generates a psychological profile using OpenAI (no hardcoded mocks).
5. **Dashboard**: Users can view their total playtime, achievement completion rate, and DNA persona visually.
6. **Library View**: Users can search, sort, and filter their synced games.
