-- Enable RLS on both tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- USERS TABLE POLICIES
-- ==========================================

-- 1. Users can view their own profile
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid() = id);

-- 2. Users can view profiles of other users (needed for searching and viewing friends)
-- In a stricter environment, we might restrict this, but for GameMind AI, searching by username requires this.
CREATE POLICY "Users can view any profile" 
ON users FOR SELECT 
USING (true);

-- 3. Users can insert their own profile (on registration/sync)
CREATE POLICY "Users can insert own profile" 
ON users FOR INSERT 
WITH CHECK (auth.uid() = id);

-- 4. Users can update their own profile
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ==========================================
-- FRIENDS TABLE POLICIES
-- ==========================================

-- 1. Users can view their own friendships (either they sent the request or received it)
CREATE POLICY "Users can view own friendships" 
ON friends FOR SELECT 
USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- 2. Users can send a friend request (insert)
CREATE POLICY "Users can insert friendship" 
ON friends FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 3. Users can accept a friend request (update where they are the friend_id and status becomes 'accepted')
CREATE POLICY "Users can update incoming friendship" 
ON friends FOR UPDATE 
USING (auth.uid() = friend_id)
WITH CHECK (auth.uid() = friend_id AND status = 'accepted');

-- 4. Users can delete a friendship (cancel request or unfriend)
CREATE POLICY "Users can delete own friendships" 
ON friends FOR DELETE 
USING (auth.uid() = user_id OR auth.uid() = friend_id);
