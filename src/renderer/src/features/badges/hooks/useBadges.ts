import { useState, useEffect, useCallback } from 'react'
import type { Badge, UserBadgeWithDetails, BadgeTier } from '@shared/types/badge.types'
import { DEFAULT_BADGES, GAMEMIND_RANK_TIERS, getTierForScore } from '@shared/config/badge.config'
import { supabase } from '../../../services/supabase.client'

const api = (window as any).api

export function useBadges(targetId?: string, targetSteamId?: string, forceIsOwnProfile?: boolean) {
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [userBadges, setUserBadges] = useState<UserBadgeWithDetails[]>([])
  const [userScore, setUserScore] = useState<number>(0)
  const [evolvedTier, setEvolvedTier] = useState<BadgeTier | null>(null)
  const [resolvedTargetUuid, setResolvedTargetUuid] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true)

      // 1. Get all badges definitions
      let badgesList: Badge[] = []
      if (api?.badges) {
        const resAll = await api.badges.getAll()
        if (resAll?.success && resAll?.data?.length) {
          badgesList = resAll.data
        }
      }
      if (badgesList.length === 0) {
        badgesList = DEFAULT_BADGES.map((b) => ({
          ...b,
          id: `badge_${b.code_name}`,
          created_at: Date.now()
        }))
      }
      setAllBadges(badgesList)

      const queryId = targetId || targetSteamId

      let ownSteamId = ''
      let ownNumericId = ''
      let ownScoreFromApi = 0

      if (api?.getSteamProfile) {
        try {
          const profRes = await api.getSteamProfile()
          if (profRes?.success && profRes?.data) {
            const p = profRes.data
            ownSteamId = String(p.steamId || p.steam_id || '')
            ownNumericId = String(p.numericId || p.numeric_id || '')
            ownScoreFromApi = p.gamemindScore || p.gamemind_score || 0
          }
        } catch (e) {
          console.warn('Failed to fetch local steam profile in useBadges:', e)
        }
      }

      const isOwnProfile =
        forceIsOwnProfile === true ||
        !queryId ||
        (ownSteamId && queryId === ownSteamId) ||
        (ownNumericId && queryId === ownNumericId)

      // 3. Resolve Score strictly
      let currentScore = 0
      let isTargetUserBoss = false

      if (isOwnProfile) {
        currentScore = ownScoreFromApi
        if (supabase && (ownNumericId || ownSteamId)) {
          try {
            let u = null
            if (ownSteamId) {
              const res = await supabase.rpc('get_user_basic_info', { p_query: ownSteamId.toString() }).maybeSingle()
              u = res.data
            }
            if (!u && ownNumericId) {
              const res = await supabase.rpc('get_user_basic_info', { p_query: ownNumericId.toString() }).maybeSingle()
              u = res.data
            }
            if (u) {
              if (!currentScore) currentScore = u.gamemind_score || u.gamemindScore || 0
              if (u.role === 'admin') isTargetUserBoss = true
            }
          } catch (e) {
            console.warn('Failed own user fetch:', e)
          }
        }
      } else if (supabase && queryId) {
        try {
          let targetUser = null
          const res = await supabase.rpc('get_user_basic_info', { p_query: queryId.toString() }).maybeSingle()
          targetUser = res.data

          if (targetUser) {
            if (targetUser.id) setResolvedTargetUuid(targetUser.id)
            currentScore = targetUser.gamemind_score || targetUser.gamemindScore || 0
            if (targetUser.role === 'admin') {
              isTargetUserBoss = true
            }
          }
        } catch (e) {
          console.warn('Failed to fetch target user score from Supabase:', e)
        }
      }

      const effectiveTargetUuid = resolvedTargetUuid || (queryId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId) ? queryId : null)

      setUserScore(currentScore)

      // 4. Fetch Badges from Supabase & SQLite for target user
      const foundBadgesMap = new Map<string, UserBadgeWithDetails>()
      const cloudBadgeCodes = new Set<string>()

      if (supabase && targetId) {
        try {
          const { data: cloudBadges, error: cloudErr } = await supabase
            .from('user_badges')
            .select('*')
            .eq('user_id', targetId)

          if (!cloudErr && cloudBadges) {
            for (const cb of cloudBadges) {
              const bDef = badgesList.find((b) => b.code_name === cb.badge_code)
              if (bDef) {
                cloudBadgeCodes.add(cb.badge_code)
                foundBadgesMap.set(cb.badge_code, {
                  id: cb.id || Math.random(),
                  steam_id: targetId,
                  badge_code: cb.badge_code,
                  is_hidden: Boolean(cb.is_hidden),
                  current_tier: cb.current_tier || 1,
                  granted_by: cb.granted_by || 'system',
                  granted_at: cb.granted_at ? new Date(cb.granted_at).getTime() : Date.now(),
                  badge: bDef
                })
              }
            }
          }
        } catch (e) {
          console.warn('Supabase user_badges fetch error:', e)
        }
      }

      if (api?.badges && queryId) {
        const idsToTry = Array.from(new Set([targetId, targetSteamId].filter(Boolean) as string[]))
        for (const id of idsToTry) {
          try {
            const resUser = await api.badges.getUserBadges(id)
            if (resUser?.success && resUser?.data) {
              for (const ub of resUser.data) {
                if (!foundBadgesMap.has(ub.badge_code)) {
                  foundBadgesMap.set(ub.badge_code, ub)
                }
                // Sync missing local badges to Supabase if it's our own profile
                if (isOwnProfile && supabase && effectiveTargetUuid && !cloudBadgeCodes.has(ub.badge_code)) {
                  supabase.from('user_badges').upsert({
                    user_id: effectiveTargetUuid,
                    badge_code: ub.badge_code,
                    is_hidden: Boolean(ub.is_hidden),
                    granted_by: ub.granted_by || 'system',
                    granted_at: new Date(ub.granted_at || Date.now()).toISOString()
                  }, { onConflict: 'user_id,badge_code' }).then(() => {
                    cloudBadgeCodes.add(ub.badge_code)
                  }).catch(() => {})
                }
              }
            }
          } catch {}
        }
      }

      // 5. Always include GameMind Rank Badge & resolve current Tier based on score
      const rankBadgeDef =
        badgesList.find((b) => b.code_name === 'gamemind_rank') ||
        DEFAULT_BADGES.find((b) => b.code_name === 'gamemind_rank')

      if (rankBadgeDef) {
        const activeTier = getTierForScore(currentScore, rankBadgeDef.tiers || GAMEMIND_RANK_TIERS)
        const existingRankBadge = foundBadgesMap.get('gamemind_rank')

        if (isOwnProfile && existingRankBadge && existingRankBadge.current_tier && activeTier.tier > existingRankBadge.current_tier) {
          setEvolvedTier(activeTier)
        }

        foundBadgesMap.set('gamemind_rank', {
          id: existingRankBadge?.id || Date.now(),
          steam_id: targetSteamId || targetId || 'target',
          badge_code: 'gamemind_rank',
          is_hidden: existingRankBadge ? Boolean(existingRankBadge.is_hidden) : false,
          current_tier: activeTier.tier,
          granted_by: 'system',
          granted_at: existingRankBadge?.granted_at || Date.now(),
          badge: rankBadgeDef as Badge,
          activeTier
        })
      }

      // 6. Ensure Boss badge for boss account
      const isBossAccount = isTargetUserBoss

      const cleanedBadgesMap = new Map<string, UserBadgeWithDetails>()

      for (const [code, ub] of foundBadgesMap.entries()) {
        if (code === 'boss' || code === 'founder' || code === 'boss_badge' || ub.badge.name_key === 'badges.boss.name') {
          if (isBossAccount && !cleanedBadgesMap.has('boss')) {
            const bossDef =
              badgesList.find((b) => b.code_name === 'boss') ||
              DEFAULT_BADGES.find((b) => b.code_name === 'boss') ||
              ub.badge

            cleanedBadgesMap.set('boss', {
              ...ub,
              badge_code: 'boss',
              is_hidden: ub.is_hidden, // Let boss hide their badge
              badge: bossDef as Badge
            })
          }
        } else {
          cleanedBadgesMap.set(code, ub)
        }
      }

      // Inviolable guarantee: if isBossAccount is true, 'boss' MUST exist in cleanedBadgesMap
      if (isBossAccount && !cleanedBadgesMap.has('boss')) {
        const bossDef =
          badgesList.find((b) => b.code_name === 'boss') ||
          DEFAULT_BADGES.find((b) => b.code_name === 'boss')

        if (bossDef) {
          cleanedBadgesMap.set('boss', {
            id: Date.now(),
            steam_id: targetSteamId || targetId || import.meta.env.VITE_ADMIN_NUMERIC_ID || '',
            badge_code: 'boss',
            is_hidden: false, // Default visible if newly created
            granted_by: 'system',
            granted_at: Date.now(),
            badge: bossDef as Badge
          })
        }
      }

      // 7. Sort badges: Boss first, GameMind Rank second, then by sort_order
      const sortedBadges = Array.from(cleanedBadgesMap.values()).sort((a, b) => {
        if (a.badge_code === b.badge_code) return 0
        if (a.badge_code === 'boss') return -1
        if (b.badge_code === 'boss') return 1
        if (a.badge_code === 'gamemind_rank') return -1
        if (b.badge_code === 'gamemind_rank') return 1
        return (b.badge?.sort_order || 0) - (a.badge?.sort_order || 0)
      })

      setUserBadges(sortedBadges)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [targetId, targetSteamId, forceIsOwnProfile])

  useEffect(() => {
    fetchBadges()
  }, [fetchBadges])

  // Listen for global real-time visibility updates for 0ms instant UI updates across components
  useEffect(() => {
    const handleGlobalToggle = (e: any) => {
      const { badgeCode, isHidden } = e.detail || {}
      if (badgeCode !== undefined) {
        setUserBadges((prev) =>
          prev.map((ub) => (ub.badge_code === badgeCode ? { ...ub, is_hidden: isHidden } : ub))
        )
      }
    }
    window.addEventListener('gamemind:badge-visibility-toggle', handleGlobalToggle)
    return () => {
      window.removeEventListener('gamemind:badge-visibility-toggle', handleGlobalToggle)
    }
  }, [])

  const toggleVisibility = async (badgeCode: string, isHidden: boolean) => {
    // 1. INSTANT optimistic React state update (0ms delay)
    setUserBadges((prev) =>
      prev.map((ub) => (ub.badge_code === badgeCode ? { ...ub, is_hidden: isHidden } : ub))
    )

    // 2. Dispatch real-time global event
    window.dispatchEvent(
      new CustomEvent('gamemind:badge-visibility-toggle', {
        detail: { badgeCode, isHidden }
      })
    )

    // 3. Persist to SQLite and Supabase in background
    const queryId = targetId || targetSteamId
    if (api?.badges && queryId) {
      const idsToTry = Array.from(new Set([targetId, targetSteamId].filter(Boolean) as string[]))
      for (const id of idsToTry) {
        api.badges.toggleVisibility(id, badgeCode, isHidden).catch(() => {})
      }
    }

    if (supabase) {
      const uuidToUse = resolvedTargetUuid || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId || '') ? queryId : undefined)
      if (uuidToUse) {
        try {
          await supabase
            .from('user_badges')
            .upsert({ 
              user_id: uuidToUse, 
              badge_code: badgeCode, 
              is_hidden: isHidden,
              granted_by: 'system',
              granted_at: new Date().toISOString()
            }, { onConflict: 'user_id,badge_code' })
        } catch (e) {
          console.error('Failed to sync badge visibility to Supabase:', e)
        }
      }
    }
  }

  const grantBadge = async (badgeCode: string, grantedBy = 'boss') => {
    const queryId = targetId || targetSteamId
    if (!queryId) return

    // Supabase insert/upsert
    if (supabase) {
      const uuidToUse = resolvedTargetUuid || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId || '') ? queryId : undefined)
      if (uuidToUse) {
        try {
          await supabase.from('user_badges').upsert(
            {
              user_id: uuidToUse,
              badge_code: badgeCode,
              is_hidden: false,
              granted_by: grantedBy,
              granted_at: new Date().toISOString()
            },
            { onConflict: 'user_id,badge_code' }
          )
        } catch (e) {
          console.error('Failed to grant badge in Supabase:', e)
        }
      }
    }

    // Local SQLite insert
    if (api?.badges) {
      const idsToTry = Array.from(new Set([targetId, targetSteamId].filter(Boolean) as string[]))
      for (const id of idsToTry) {
        await api.badges.grantBadge(id, badgeCode, grantedBy)
      }
    }

    await fetchBadges()
  }

  const revokeBadge = async (badgeCode: string) => {
    const queryId = targetId || targetSteamId
    if (!queryId) return

    // Supabase delete
    if (supabase) {
      const uuidToUse = resolvedTargetUuid || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId || '') ? queryId : undefined)
      if (uuidToUse) {
        try {
          await supabase
            .from('user_badges')
            .delete()
            .eq('user_id', uuidToUse)
            .eq('badge_code', badgeCode)
        } catch (e) {
          console.error('Failed to revoke badge in Supabase:', e)
        }
      }
    }

    // Local SQLite delete
    if (api?.badges) {
      const idsToTry = Array.from(new Set([targetId, targetSteamId].filter(Boolean) as string[]))
      for (const id of idsToTry) {
        await api.badges.revokeBadge(id, badgeCode)
      }
    }

    await fetchBadges()
  }

  const dismissEvolutionModal = () => {
    if (evolvedTier) {
      const newTier = evolvedTier.tier
      const badgeCode = 'gamemind_rank'
      const queryId = targetId || targetSteamId

      // Update local state instantly
      setUserBadges((prev) => 
        prev.map(b => b.badge_code === badgeCode ? { ...b, current_tier: newTier } : b)
      )

      // Update Supabase
      if (supabase) {
        const uuidToUse = resolvedTargetUuid || (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryId || '') ? queryId : undefined)
        if (uuidToUse) {
           supabase.from('user_badges')
             .update({ current_tier: newTier })
             .eq('user_id', uuidToUse)
             .eq('badge_code', badgeCode)
             .then()
             .catch(() => {})
        }
      }

      // Update SQLite via IPC
      if (api?.badges && queryId) {
        const idsToTry = Array.from(new Set([targetId, targetSteamId].filter(Boolean) as string[]))
        for (const id of idsToTry) {
          api.badges.updateTier(id, badgeCode, newTier).catch(() => {})
        }
      }
    }
    setEvolvedTier(null)
  }

  return {
    allBadges,
    userBadges,
    userScore,
    evolvedTier,
    dismissEvolutionModal,
    loading,
    error,
    refetch: fetchBadges,
    toggleVisibility,
    grantBadge,
    revokeBadge
  }
}
