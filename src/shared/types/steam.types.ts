// ============================================================
// Steam Data Types
// ============================================================

export interface SteamProfile {
  steamId: string
  personaName: string
  avatarUrl: string
  avatarMediumUrl: string
  avatarFullUrl: string
  profileUrl: string
  countryCode: string | null
  stateCode: string | null
  timeCreated: number
  lastLogoff: number
  personaState: number
  communityVisibilityState: number
}

export interface SteamGame {
  appId: number
  name: string
  playtimeForever: number // minutes
  playtime2Weeks: number // minutes
  imgIconUrl: string
  hasCommunityVisibleStats: boolean
  lastPlayedAt: number | null
  rtimeLastPlayed?: number
}

export interface SteamAchievement {
  apiName: string
  displayName: string
  description: string
  icon: string
  iconGray: string
  achieved: boolean
  unlockTime: number | null
  globalPercent: number | null
}

export interface SteamFriend {
  steamId: string
  personaName: string
  avatarUrl: string
  relationship: string
  friendSince: number
}

export interface SteamGameDetails {
  appId: number
  name: string
  type: string
  shortDescription: string
  detailedDescription: string
  headerImage: string
  screenshots: string[]
  genres: string[]
  categories: string[]
  developers: string[]
  publishers: string[]
  releaseDate: string | null
  metacriticScore: number | null
  metacriticUrl: string | null
  priceInitial: number | null // cents
  priceFinal: number | null // cents
  isFree: boolean
  platforms: {
    windows: boolean
    mac: boolean
    linux: boolean
  }
  tags: string[]
}

export interface SteamWishlistItem {
  appId: number
  name: string
  priority: number
  addedAt: number | null
  priceInitial: number | null
  priceFinal: number | null
  discountPercent: number | null
}
