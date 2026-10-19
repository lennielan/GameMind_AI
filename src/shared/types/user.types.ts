// ============================================================
// Cloud User Profile Types
// ============================================================

export interface CloudUserProfile {
  id: string
  steam_id: string | null
  username: string
  numeric_id: number
  avatar_url?: string | null
  steam_nickname?: string | null
  is_library_public: boolean
  is_dna_public: boolean
  is_achievements_public: boolean
  is_online_public: boolean
  dna_summary: any | null
  stats_games?: number | null
  stats_hours?: number | null
  stats_achievements?: number | null
  last_seen?: string | null
  chat_privacy?: 'everyone' | 'friends_only'
  message_retention?: 'forever' | '24h'
  created_at: string
}
