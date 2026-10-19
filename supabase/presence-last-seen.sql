-- ============================================================
-- GameMind AI: Reliable online status fallback
-- Keeps last_seen available for newly registered users and
-- backfills existing profiles that were created before the column.
-- ============================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

ALTER TABLE public.users
ALTER COLUMN last_seen SET DEFAULT TIMEZONE('utc'::text, NOW());

UPDATE public.users
SET last_seen = COALESCE(last_seen, created_at, TIMEZONE('utc'::text, NOW()))
WHERE last_seen IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_last_seen
ON public.users(last_seen DESC);
