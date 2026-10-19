export type BadgeCategory = 'role' | 'status' | 'achievement' | 'rank'
export type BadgeAcquisitionType = 'manual' | 'auto'

export interface BadgeTier {
  tier: number
  name_key: string
  desc_key: string
  icon: string
  color: string
  border_color?: string
  glow_color?: string
  min_score: number
  max_score: number
}

export interface Badge {
  id: string
  code_name: string
  name_key: string
  desc_key: string
  icon: string
  color: string
  acquisition_type: BadgeAcquisitionType
  category: BadgeCategory
  sort_order: number
  is_tiered?: boolean
  tiers?: BadgeTier[]
  created_at: number
}

export interface UserBadge {
  id: number
  steam_id: string
  badge_code: string
  is_hidden: boolean
  current_tier?: number
  granted_by?: string
  granted_at: number
}

export interface UserBadgeWithDetails extends UserBadge {
  badge: Badge
  activeTier?: BadgeTier
}
