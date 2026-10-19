-- ============================================================
-- GameMind AI: Direct Messages System
-- Скрипт миграции для Supabase SQL Editor
-- ============================================================

-- ── 1. Таблица messages ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Индексы для быстрого чтения чатов
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_pair ON messages(
  LEAST(sender_id, receiver_id),
  GREATEST(sender_id, receiver_id),
  created_at DESC
);

-- ── 2. Таблица muted_users ───────────────────────────────────
CREATE TABLE IF NOT EXISTS muted_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muted_until TIMESTAMPTZ,  -- NULL = навсегда
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, muted_user_id)
);

CREATE INDEX IF NOT EXISTS idx_muted_users_lookup ON muted_users(user_id, muted_user_id);

-- ── 3. Новые колонки в таблице users ─────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_privacy TEXT DEFAULT 'everyone'
  CHECK (chat_privacy IN ('everyone', 'friends_only'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS message_retention TEXT DEFAULT 'forever'
  CHECK (message_retention IN ('forever', '24h'));

-- ── 4. RLS Политики для messages ─────────────────────────────
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Чтение: только участники переписки
CREATE POLICY "Users can read own messages"
  ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Вставка: отправлять может только от своего имени
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Обновление: получатель может пометить как прочитанное
CREATE POLICY "Receiver can mark as read"
  ON messages FOR UPDATE
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Удаление: только отправитель может удалить своё сообщение
CREATE POLICY "Sender can delete own messages"
  ON messages FOR DELETE
  USING (auth.uid() = sender_id);

-- ── 5. RLS Политики для muted_users ──────────────────────────
ALTER TABLE muted_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own mutes"
  ON muted_users FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 6. Включить Realtime для messages ────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================================
-- Готово! Теперь таблицы messages и muted_users созданы,
-- колонки chat_privacy и message_retention добавлены в users,
-- RLS политики настроены, Realtime включен.
-- ============================================================
