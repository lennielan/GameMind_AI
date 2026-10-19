import { supabase } from './supabase.client'

export interface UserProfile {
  id: string
  steam_id: string
  username: string
  numeric_id: number
  avatar_url?: string | null
  last_seen?: string | null
  dna_summary: any
  created_at: string
}

export interface FriendRequest {
  user_id: string
  friend_id: string
  status: 'pending' | 'accepted'
  friend_profile?: UserProfile
  user_profile?: UserProfile
}

export class FriendsService {
  async searchUsers(query: string): Promise<UserProfile[]> {
    if (!supabase || !query.trim()) return []

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const numericId = parseInt(query.trim(), 10)
    if (isNaN(numericId)) return []

    const { data, error } = await supabase
      .rpc('search_users', { p_numeric_id: numericId })

    if (error) {
      console.error('Error searching users:', error)
      return []
    }

    return data as UserProfile[]
  }

  async sendFriendRequest(friendId: string): Promise<boolean> {
    if (!supabase) return false

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: session.user.id,
        friend_id: friendId,
        status: 'pending'
      })

    if (error) {
      console.error('Error sending friend request:', error)
      return false
    }

    return true
  }

  async acceptFriendRequest(userId: string): Promise<boolean> {
    if (!supabase) return false

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .match({
        user_id: userId,
        friend_id: session.user.id
      })

    if (error) {
      console.error('Error accepting friend request:', error)
      return false
    }

    return true
  }

  async removeFriend(targetId: string): Promise<boolean> {
    if (!supabase) return false

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return false

    const { error } = await supabase
      .from('friends')
      .delete()
      .or(`and(user_id.eq.${session.user.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${session.user.id})`)

    if (error) {
      console.error('Error removing friend:', error)
      return false
    }

    return true
  }

  async getFriends(): Promise<UserProfile[]> {
    if (!supabase) return []

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase.rpc('get_my_friends')

    if (error) {
      console.error('Error getting friends:', error)
      return []
    }

    return (data || []) as UserProfile[]
  }

  async getPendingRequests(): Promise<UserProfile[]> {
    if (!supabase) return []

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase.rpc('get_my_incoming_requests')

    if (error) {
      console.error('Error getting pending requests:', error)
      return []
    }

    return (data || []) as UserProfile[]
  }

  async getOutgoingRequests(): Promise<UserProfile[]> {
    if (!supabase) return []

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase.rpc('get_my_outgoing_requests')

    if (error) {
      console.error('Error getting outgoing requests:', error)
      return []
    }

    return (data || []) as UserProfile[]
  }
}

export const friendsService = new FriendsService()
