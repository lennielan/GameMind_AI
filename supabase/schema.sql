CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  steam_id TEXT,
  username TEXT,
  dna_summary JSONB,
  is_library_public BOOLEAN DEFAULT true,
  is_dna_public BOOLEAN DEFAULT true,
  is_achievements_public BOOLEAN DEFAULT true,
  is_online_public BOOLEAN DEFAULT true,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  showcase_games JSONB DEFAULT '[]'::jsonb,
  showcase_achievements JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE friends (
  user_id UUID REFERENCES users(id),
  friend_id UUID REFERENCES users(id),
  status TEXT CHECK (status IN ('pending', 'accepted')),
  PRIMARY KEY (user_id, friend_id)
);
