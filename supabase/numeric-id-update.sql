-- 1. Добавляем колонку numeric_id, если ее еще нет
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS numeric_id INT UNIQUE;

-- 2. Функция для генерации 6-значного ID и вставки нового юзера
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_numeric_id INT;
  is_unique BOOLEAN;
BEGIN
  LOOP
    -- Генерируем число от 100000 до 999999
    new_numeric_id := floor(random() * 900000 + 100000)::INT;
    
    -- Проверяем уникальность
    SELECT NOT EXISTS (SELECT 1 FROM public.users WHERE numeric_id = new_numeric_id) INTO is_unique;
    
    IF is_unique THEN
      -- Если почты нет, используем часть UUID, если есть — часть почты (никнейм будет обновляться позже при синхронизации со Steam)
      BEGIN
        INSERT INTO public.users (id, numeric_id, username)
        VALUES (
          new.id, 
          new_numeric_id, 
          COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1), 'User_' || substr(new.id::text, 1, 5))
        );
        EXIT; -- Успешная вставка, выходим из цикла
      EXCEPTION WHEN unique_violation THEN
        -- Теоретически может быть race condition, цикл повторится
      END;
    END IF;
  END LOOP;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Создаем триггер, который срабатывает после регистрации в auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. Если в таблице уже есть пользователи без numeric_id, заполним их
DO $$
DECLARE
  u RECORD;
  new_id INT;
  is_unique BOOLEAN;
BEGIN
  FOR u IN SELECT id FROM public.users WHERE numeric_id IS NULL LOOP
    LOOP
      new_id := floor(random() * 900000 + 100000)::INT;
      SELECT NOT EXISTS (SELECT 1 FROM public.users WHERE numeric_id = new_id) INTO is_unique;
      IF is_unique THEN
        UPDATE public.users SET numeric_id = new_id WHERE id = u.id;
        EXIT;
      END IF;
    END LOOP;
  END LOOP;
END $$;
