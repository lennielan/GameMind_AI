# SYSTEM INSTRUCTION FOR ANTIGRAVITY IDE AGENT

**ROLE:** Primary Full-Stack Developer for GameMind AI
**OBJECTIVE:** Fix SQL Constraint Error and Steam Store API Wishlist Fetching

---

## 1. BUG REPORT & ROOT CAUSE ANALYSIS
The user reports that the Wishlist section has completely disappeared from the UI.
**Why?**
The previous fixes correctly prevented hallucinated generation and cleared old broken data from the database. Because no new wishlist items are being generated, the UI gracefully hides the empty section.

**But why is the wishlist empty if the user's profile is public?**
There are **TWO** massive bugs preventing the wishlist from ever being saved:

1. **SQL `NOT NULL` Constraint Failure (`wishlist.repository.ts`)**: 
   The `wishlist` SQLite table schema defines `steam_id TEXT NOT NULL`. However, `upsertWishlist(items: WishlistItem[])` does **NOT** accept a `steamId` and does **NOT** insert it. When the sync engine tries to save the wishlist, SQLite throws a constraint error, crashing the process and leaving the table empty forever!

2. **Steam Store API Custom URLs (`steam-api.client.ts`)**: 
   The Steam Store API (`/wishlist/profiles/.../wishlistdata/?p=0`) only works if the user uses a standard numeric ID. If the user has a Custom Vanity URL (e.g. `steamcommunity.com/id/username`), this endpoint fails. We must extract the correct path (`id/username` vs `profiles/12345`) from the user's `profileUrl` to guarantee the fetch works.

## 2. REQUIRED FIXES

### FIX 1: Fix Wishlist Repository SQL
In `src/main/database/repositories/wishlist.repository.ts`:
1. Change the signature to: `upsertWishlist(steamId: string, items: WishlistItem[]): void`
2. Update the SQL to use `steamId`:
```ts
    execute('DELETE FROM wishlist WHERE steam_id = ?', [steamId])

    for (const item of items) {
      execute(
        \`INSERT INTO wishlist (app_id, steam_id, name, priority, added_at)
         VALUES (?, ?, ?, ?, ?)\`,
        [item.appId, steamId, item.name, item.priority, item.addedAt]
      )
    }
```
3. Change `getWishlist()` to `getWishlist(steamId: string)` and update the `SELECT` to filter by `steam_id = ?`.

### FIX 2: Update Sync Engine Call
In `src/main/services/steam/sync-engine.ts`, around line 175:
Update the repository call to pass the `steamId`:
```ts
   wishlistRepository.upsertWishlist(steamId, wishlist)
```

### FIX 3: Robust Steam API Wishlist Fetching
In `src/main/services/steam/steam-api.client.ts`:
1. Change `getWishlist` signature to accept the `profileUrl`: `public async getWishlist(steamId: string, profileUrl?: string)`
2. Extract the correct URL path:
```ts
      let url = \`https://store.steampowered.com/wishlist/profiles/\${steamId}/wishlistdata/?p=0\`
      
      if (profileUrl) {
         // Handle both standard and custom vanity URLs
         const match = profileUrl.match(/steamcommunity\\.com\\/(id\\/[^\\/]+|profiles\\/[^\\/]+)/)
         if (match) {
            url = \`https://store.steampowered.com/wishlist/\${match[1]}/wishlistdata/?p=0\`
         }
      }
```

### FIX 4: Pass `profileUrl` in Sync Engine
In `src/main/services/steam/sync-engine.ts`, around line 173:
```ts
      const profile = userProfileRepository.getProfile()
      const wishlist = await steamApi.getWishlist(steamId, profile?.profileUrl)
```

### FIX 5: Pass `steamId` in Recommendations Engine
In `src/main/services/ai/recommendations-engine.ts`:
```ts
      const wishlistRaw = wishlistRepository.getWishlist(profile.steamId)
```

Apply all these fixes exactly as written, then run `npm run typecheck` to ensure all signatures match!
