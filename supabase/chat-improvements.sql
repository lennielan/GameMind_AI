-- ============================================================
-- GameMind AI: Chat Improvements Migration
-- Скрипт миграции для добавления новых функций чата
-- Запустите этот скрипт в Supabase SQL Editor
-- ============================================================

-- 1. Добавляем колонки для редактирования и удаления сообщений
ALTER TABLE messages 
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_for UUID[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- 2. Добавляем колонку для закрепленных чатов
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS pinned_chats UUID[] DEFAULT '{}'::uuid[];

-- 3. Обновляем RLS политики для сообщений
-- Разрешаем отправителю редактировать и удалять (для обоих) свои сообщения
DROP POLICY IF EXISTS "Sender can update own messages" ON messages;
CREATE POLICY "Sender can update own messages"
  ON messages FOR UPDATE
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);
