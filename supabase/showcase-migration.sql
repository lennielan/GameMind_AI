-- Добавление колонок витрины игр и достижений
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS showcase_games JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS showcase_achievements JSONB DEFAULT '[]'::jsonb;
