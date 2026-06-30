import { supabase } from './supabase.client'

export interface UserProfile {
  id: string
  steam_id: string
  username: string
  numeric_id: number
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
      .from('users')
      .select('*')
      .eq('numeric_id', numericId)
      .neq('id', session.user.id)
      .limit(1)

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

    const { data, error } = await supabase
      .from('friends')
      .select(`
        status,
        user_id,
        friend_id,
        user_profile:users!friends_user_id_fkey(*),
        friend_profile:users!friends_friend_id_fkey(*)
      `)
      .or(`user_id.eq.${session.user.id},friend_id.eq.${session.user.id}`)
      .eq('status', 'accepted')

    if (error) {
      console.error('Error getting friends:', error)
      return []
    }

    return (data || []).map((row: any) => {
      if (row.user_id === session.user.id) {
        return row.friend_profile
      } else {
        return row.user_profile
      }
    })
  }

  async getPendingRequests(): Promise<UserProfile[]> {
    if (!supabase) return []

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('friends')
      .select(`
        status,
        user_id,
        user_profile:users!friends_user_id_fkey(*)
      `)
      .eq('friend_id', session.user.id)
      .eq('status', 'pending')

    if (error) {
      console.error('Error getting pending requests:', error)
      return []
    }

    return (data || []).map((row: any) => row.user_profile)
  }

  async getOutgoingRequests(): Promise<string[]> {
    if (!supabase) return []

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return []

    const { data, error } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', session.user.id)
      .eq('status', 'pending')

    if (error) {
      console.error('Error getting outgoing requests:', error)
      return []
    }

    return (data || []).map((row: any) => row.friend_id)
  }
}

export const friendsService = new FriendsService()
