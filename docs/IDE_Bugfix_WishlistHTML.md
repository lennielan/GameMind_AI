# SYSTEM INSTRUCTION FOR ANTIGRAVITY IDE AGENT

**ROLE:** Primary Full-Stack Developer for GameMind AI
**OBJECTIVE:** Implement Bulletproof Steam Wishlist Fetching

---

## 1. BUG REPORT & ROOT CAUSE ANALYSIS
The user still cannot sync their wishlist. 
**Why?**
The logs reveal this error: `SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`.
This means Steam's Store API is returning an **HTML page** instead of JSON!
This happens because:
1. We are using standard Node `fetch` (Undici), which lacks a browser TLS fingerprint. Steam's Cloudflare/DDoS protection detects it as a bot and drops the connection or redirects to an HTML block page.
2. Even if we bypass Cloudflare, Steam recently started redirecting unauthenticated requests to the `wishlistdata` JSON endpoint to the store homepage. 

## 2. THE BULLETPROOF FIX

We must do two things in `src/main/services/steam/steam-api.client.ts`:
1. Use Electron's built-in `net.fetch` instead of global Node `fetch`. `net.fetch` uses Chromium's network stack, which bypasses bot-protection blocks.
2. Implement an **HTML Scraping Fallback**. If the JSON endpoint still returns HTML, we fetch the actual public wishlist HTML page and extract the embedded `var g_rgWishlistData = [...]` script tag!

### Implementation Steps

**Step 1:** Add `net` to the electron imports at the top of `steam-api.client.ts`:
```ts
import { net } from 'electron'
```

**Step 2:** Update the `fetch` helper in `SteamApiClient`:
Replace `const response = await fetch(url.toString())` with:
```ts
    const response = await net.fetch(url.toString())
```

**Step 3:** Completely replace the `getWishlist` function with this bulletproof version:

```ts
  public async getWishlist(steamId: string, profileUrl?: string): Promise<any[]> {
    try {
      let storePath = \`profiles/\${steamId}\`
      if (profileUrl) {
         const match = profileUrl.match(/steamcommunity\\.com\\/(id\\/[^\\/]+|profiles\\/[^\\/]+)/)
         if (match) {
            storePath = match[1]
         }
      }

      // Try the JSON endpoint first
      const jsonUrl = \`https://store.steampowered.com/wishlist/\${storePath}/wishlistdata/?p=0\`
      logger.debug('SteamAPI', \`Fetching Wishlist JSON from \${jsonUrl}\`)
      
      let response = await net.fetch(jsonUrl)
      let text = await response.text()

      let data;
      try {
        data = JSON.parse(text)
      } catch (e) {
        // If JSON parsing fails (e.g. got HTML redirect), fallback to scraping the HTML page
        logger.warn('SteamAPI', 'JSON endpoint failed or returned HTML. Falling back to HTML scraping...')
        const htmlUrl = \`https://store.steampowered.com/wishlist/\${storePath}/\`
        response = await net.fetch(htmlUrl)
        const htmlText = await response.text()
        
        const match = htmlText.match(/var g_rgWishlistData = (\\[.*?\\]);/)
        if (match && match[1]) {
           const parsedArray = JSON.parse(match[1])
           data = {}
           parsedArray.forEach((item: any) => {
              data[item.appid] = item
           })
        } else {
           throw new Error('Could not find g_rgWishlistData in HTML')
        }
      }

      if (!data || Object.keys(data).length === 0 || data.success === 2) {
        return [] 
      }

      const wishlist: any[] = []
      for (const appIdStr in data) {
        const item = data[appIdStr]
        wishlist.push({
          appId: parseInt(appIdStr, 10),
          name: item.name,
          priority: item.priority || 0,
          addedAt: item.added || 0
        })
      }
      return wishlist
    } catch (error) {
      logger.error('SteamAPI', \`getWishlist failed for \${steamId}\`, error)
      return [] 
    }
  }
```

**Step 4:** Replace `fetch` with `net.fetch` in `getAppDetails` and `searchGameByName` as well, to prevent Cloudflare blocks on those endpoints!

Run `npm run typecheck` to verify the changes.
