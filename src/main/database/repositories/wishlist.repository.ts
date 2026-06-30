import { execute, queryAll } from '../database'

export interface WishlistItem {
  appId: number
  name: string
  priority: number
  addedAt: number
}

export class WishlistRepository {
  upsertWishlist(steamId: string, items: WishlistItem[]): void {
    if (!items || items.length === 0) return

    // Simply clear and re-insert the wishlist
    execute('DELETE FROM wishlist WHERE steam_id = ?', [steamId])

    for (const item of items) {
      execute(
        `INSERT INTO wishlist (app_id, steam_id, name, priority, added_at)
         VALUES (?, ?, ?, ?, ?)`,
        [item.appId, steamId, item.name, item.priority, item.addedAt]
      )
    }
  }

  getWishlist(steamId: string): WishlistItem[] {
    const rows = queryAll<any>('SELECT * FROM wishlist WHERE steam_id = ? ORDER BY priority ASC, added_at DESC', [steamId])
    return rows.map(r => ({
      appId: r.app_id,
      name: r.name,
      priority: r.priority,
      addedAt: r.added_at
    }))
  }
}

export const wishlistRepository = new WishlistRepository()
