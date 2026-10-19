import { Badge, BadgeTier } from '../types/badge.types'

export const GAMEMIND_RANK_TIERS: BadgeTier[] = [
  {
    tier: 1,
    name_key: 'badges.gamemind_rank.tier1.name',
    desc_key: 'badges.gamemind_rank.tier1.desc',
    icon: 'Shield',
    color: '#94a3b8',
    border_color: 'rgba(148, 163, 184, 0.4)',
    glow_color: 'rgba(148, 163, 184, 0.15)',
    min_score: 0,
    max_score: 499
  },
  {
    tier: 2,
    name_key: 'badges.gamemind_rank.tier2.name',
    desc_key: 'badges.gamemind_rank.tier2.desc',
    icon: 'Gamepad2',
    color: '#22c55e',
    border_color: 'rgba(34, 197, 94, 0.4)',
    glow_color: 'rgba(34, 197, 94, 0.2)',
    min_score: 500,
    max_score: 1499
  },
  {
    tier: 3,
    name_key: 'badges.gamemind_rank.tier3.name',
    desc_key: 'badges.gamemind_rank.tier3.desc',
    icon: 'Zap',
    color: '#06b6d4',
    border_color: 'rgba(6, 182, 212, 0.4)',
    glow_color: 'rgba(6, 182, 212, 0.25)',
    min_score: 1500,
    max_score: 2999
  },
  {
    tier: 4,
    name_key: 'badges.gamemind_rank.tier4.name',
    desc_key: 'badges.gamemind_rank.tier4.desc',
    icon: 'Award',
    color: '#a855f7',
    border_color: 'rgba(168, 85, 247, 0.4)',
    glow_color: 'rgba(168, 85, 247, 0.3)',
    min_score: 3000,
    max_score: 4999
  },
  {
    tier: 5,
    name_key: 'badges.gamemind_rank.tier5.name',
    desc_key: 'badges.gamemind_rank.tier5.desc',
    icon: 'Star',
    color: '#eab308',
    border_color: 'rgba(234, 179, 8, 0.5)',
    glow_color: 'rgba(234, 179, 8, 0.35)',
    min_score: 5000,
    max_score: 7499
  },
  {
    tier: 6,
    name_key: 'badges.gamemind_rank.tier6.name',
    desc_key: 'badges.gamemind_rank.tier6.desc',
    icon: 'Flame',
    color: '#38bdf8',
    border_color: 'rgba(56, 189, 248, 0.45)',
    glow_color: 'rgba(56, 189, 248, 0.35)',
    min_score: 7500,
    max_score: 9999
  },
  {
    tier: 7,
    name_key: 'badges.gamemind_rank.tier7.name',
    desc_key: 'badges.gamemind_rank.tier7.desc',
    icon: 'Gem',
    color: '#f43f5e',
    border_color: 'rgba(244, 63, 94, 0.45)',
    glow_color: 'rgba(244, 63, 94, 0.4)',
    min_score: 10000,
    max_score: 14999
  },
  {
    tier: 8,
    name_key: 'badges.gamemind_rank.tier8.name',
    desc_key: 'badges.gamemind_rank.tier8.desc',
    icon: 'Swords',
    color: '#ec4899',
    border_color: 'rgba(236, 72, 153, 0.45)',
    glow_color: 'rgba(236, 72, 153, 0.4)',
    min_score: 15000,
    max_score: 24999
  },
  {
    tier: 9,
    name_key: 'badges.gamemind_rank.tier9.name',
    desc_key: 'badges.gamemind_rank.tier9.desc',
    icon: 'Crown',
    color: '#fbbf24',
    border_color: 'rgba(251, 191, 36, 0.6)',
    glow_color: 'rgba(251, 191, 36, 0.5)',
    min_score: 25000,
    max_score: 9999999
  }
]

export const DEFAULT_BADGES: Omit<Badge, 'id' | 'created_at'>[] = [
  {
    code_name: 'boss',
    name_key: 'badges.boss.name',
    desc_key: 'badges.boss.desc',
    icon: 'Crown',
    color: '#ff4d4d',
    acquisition_type: 'manual',
    category: 'role',
    sort_order: 1000
  },
  {
    code_name: 'gamemind_rank',
    name_key: 'badges.gamemind_rank.name',
    desc_key: 'badges.gamemind_rank.desc',
    icon: 'Trophy',
    color: '#60a5fa',
    acquisition_type: 'auto',
    category: 'rank',
    sort_order: 500,
    is_tiered: true,
    tiers: GAMEMIND_RANK_TIERS
  },
  {
    code_name: 'developer',
    name_key: 'badges.developer.name',
    desc_key: 'badges.developer.desc',
    icon: 'Code',
    color: '#3498db',
    acquisition_type: 'manual',
    category: 'role',
    sort_order: 90
  },
  {
    code_name: 'cbt',
    name_key: 'badges.cbt.name',
    desc_key: 'badges.cbt.desc',
    icon: 'Bug',
    color: '#9b59b6',
    acquisition_type: 'auto',
    category: 'status',
    sort_order: 80
  },
  {
    code_name: 'pioneer',
    name_key: 'badges.pioneer.name',
    desc_key: 'badges.pioneer.desc',
    icon: 'Compass',
    color: '#f1c40f',
    acquisition_type: 'auto',
    category: 'achievement',
    sort_order: 60
  },
  {
    code_name: 'ai_explorer_1',
    name_key: 'badges.ai_explorer_1.name',
    desc_key: 'badges.ai_explorer_1.desc',
    icon: 'Bot',
    color: '#2ecc71',
    acquisition_type: 'auto',
    category: 'achievement',
    sort_order: 50
  },
  {
    code_name: 'collector',
    name_key: 'badges.collector.name',
    desc_key: 'badges.collector.desc',
    icon: 'Star',
    color: '#f39c12',
    acquisition_type: 'auto',
    category: 'achievement',
    sort_order: 40
  },
  {
    code_name: 'completionist',
    name_key: 'badges.completionist.name',
    desc_key: 'badges.completionist.desc',
    icon: 'Trophy',
    color: '#d4af37',
    acquisition_type: 'auto',
    category: 'achievement',
    sort_order: 30
  },
  {
    code_name: 'social_player',
    name_key: 'badges.social_player.name',
    desc_key: 'badges.social_player.desc',
    icon: 'Users',
    color: '#1abc9c',
    acquisition_type: 'auto',
    category: 'achievement',
    sort_order: 20
  },
  {
    code_name: 'veteran_1',
    name_key: 'badges.veteran_1.name',
    desc_key: 'badges.veteran_1.desc',
    icon: 'Shield',
    color: '#7f8c8d',
    acquisition_type: 'auto',
    category: 'status',
    sort_order: 10
  },
  {
    code_name: 'steam_veteran',
    name_key: 'badges.steam_veteran.name',
    desc_key: 'badges.steam_veteran.desc',
    icon: 'Gamepad2',
    color: '#34495e',
    acquisition_type: 'auto',
    category: 'status',
    sort_order: 5
  },
  {
    code_name: 'legend',
    name_key: 'badges.legend.name',
    desc_key: 'badges.legend.desc',
    icon: 'LegendIcon',
    color: '#ff9ff3',
    acquisition_type: 'manual',
    category: 'role',
    sort_order: 110
  }
]

export const BADGE_THRESHOLDS = {
  PIONEER_MAX_USERS: 100,
  AI_EXPLORER_1: 10,
  COLLECTOR_FAVORITES: 20,
  SOCIAL_PLAYER_FRIENDS: 10,
  COMPLETIONIST_PERCENT: 80
}

/**
 * Helper utility to resolve tier for a given badge and score
 */
export function getTierForScore(score: number, tiers: BadgeTier[] = GAMEMIND_RANK_TIERS): BadgeTier {
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (score >= tiers[i].min_score) {
      return tiers[i]
    }
  }
  return tiers[0]
}
