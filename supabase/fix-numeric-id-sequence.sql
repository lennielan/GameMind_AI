-- ============================================================
-- GameMind AI: Fix numeric_id generation
-- Replaces random loop with safe sequence-based approach
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create a sequence for numeric IDs (starting from 100000 to keep 6-digit IDs)
CREATE SEQUENCE IF NOT EXISTS public.user_numeric_id_seq
  START WITH 100000
  INCREMENT BY 1
  MINVALUE 100000
  MAXVALUE 999999
  NO CYCLE;

-- 2. Advance the sequence past any existing IDs to avoid collisions
DO $$
DECLARE
  max_existing INT;
BEGIN
  SELECT COALESCE(MAX(numeric_id), 99999) INTO max_existing FROM public.users;
  IF max_existing >= 100000 THEN
    PERFORM setval('public.user_numeric_id_seq', max_existing);
  END IF;
END $$;

-- 3. Replace the trigger function with a safe, non-looping version
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, numeric_id, username)
  VALUES (
    new.id,
    nextval('public.user_numeric_id_seq'),
    COALESCE(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1),
      'User_' || substr(new.id::text, 1, 5)
    )
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- The existing trigger on_auth_user_created already points to handle_new_user(),
-- so no need to recreate it. The function body is replaced in-place.
