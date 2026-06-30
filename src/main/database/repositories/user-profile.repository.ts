import { queryOne, execute } from '../database'
import type { SteamProfile } from '@shared/types/steam.types'

export class UserProfileRepository {
  getProfile(): SteamProfile | null {
    const row = queryOne<any>('SELECT * FROM user_profile LIMIT 1')
    if (!row) return null

    return {
      steamId: row.steam_id,
      personaName: row.persona_name,
      avatarUrl: row.avatar_url,
      avatarMediumUrl: row.avatar_url, // Assuming we store one or parse if we store all
      avatarFullUrl: row.avatar_url,
      profileUrl: row.profile_url,
      countryCode: row.country_code,
      stateCode: null,
      timeCreated: row.time_created,
      lastLogoff: 0,
      personaState: 0,
      communityVisibilityState: 1
    }
  }

  upsertProfile(profile: SteamProfile): void {
    const existing = queryOne<{ steam_id: string }>('SELECT steam_id FROM user_profile WHERE steam_id = ?', [profile.steamId])

    if (existing) {
      execute(
        `UPDATE user_profile SET
          persona_name = ?,
          avatar_url = ?,
          profile_url = ?,
          country_code = ?,
          last_synced_at = ?
        WHERE steam_id = ?`,
        [
          profile.personaName,
          profile.avatarFullUrl || profile.avatarUrl,
          profile.profileUrl,
          profile.countryCode || null,
          Date.now(),
          profile.steamId
        ]
      )
    } else {
      execute(
        `INSERT INTO user_profile (
          steam_id, persona_name, avatar_url, profile_url, country_code, time_created, last_synced_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          profile.steamId,
          profile.personaName,
          profile.avatarFullUrl || profile.avatarUrl,
          profile.profileUrl,
          profile.countryCode || null,
          profile.timeCreated || Date.now(),
          Date.now()
        ]
      )
    }
  }
}

export const userProfileRepository = new UserProfileRepository()
