-- ============================================================
-- GameMind AI: Server-side conversation aggregation
-- Replaces client-side O(N^2) message downloading
-- Run this in Supabase SQL Editor
-- ============================================================

-- RPC function: get_conversations
-- Returns the conversation list for a user with last message, unread count, and partner profile.
-- Uses DISTINCT ON to efficiently pick the latest message per partner.

CREATE OR REPLACE FUNCTION public.get_conversations(p_user_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  numeric_id INT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_messages AS (
    -- All messages involving this user, excluding deleted ones
    SELECT
      m.id,
      m.sender_id,
      m.receiver_id,
      m.content,
      m.is_read,
      m.created_at,
      CASE
        WHEN m.sender_id = p_user_id THEN m.receiver_id
        ELSE m.sender_id
      END AS partner_id
    FROM messages m
    WHERE (m.sender_id = p_user_id OR m.receiver_id = p_user_id)
      AND (m.deleted_for IS NULL OR NOT (p_user_id = ANY(m.deleted_for)))
  ),
  latest_per_partner AS (
    -- Pick only the latest message per conversation partner
    SELECT DISTINCT ON (partner_id)
      partner_id,
      content AS last_msg_content,
      created_at AS last_msg_at
    FROM user_messages
    ORDER BY partner_id, created_at DESC
  ),
  unread_counts AS (
    -- Count unread messages per partner (only incoming ones)
    SELECT
      sender_id AS partner_id,
      COUNT(*) AS cnt
    FROM user_messages
    WHERE receiver_id = p_user_id AND is_read = false
    GROUP BY sender_id
  )
  SELECT
    lpp.partner_id AS user_id,
    u.username,
    u.avatar_url,
    u.numeric_id,
    lpp.last_msg_content AS last_message,
    lpp.last_msg_at AS last_message_at,
    COALESCE(uc.cnt, 0) AS unread_count
  FROM latest_per_partner lpp
  JOIN users u ON u.id = lpp.partner_id
  LEFT JOIN unread_counts uc ON uc.partner_id = lpp.partner_id
  ORDER BY lpp.last_msg_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Add missing indexes for scalability
-- ============================================================

-- Index on friends.friend_id for fast incoming friend request lookups
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends(friend_id);

-- Index on friends.status for filtering by pending/accepted
CREATE INDEX IF NOT EXISTS idx_friends_status ON public.friends(status);

-- Composite index for unread message counting
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON public.messages(receiver_id, is_read)
  WHERE is_read = false;
