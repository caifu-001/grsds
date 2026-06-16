-- notifications & activity_logs for CRM
-- Execute in Supabase SQL Editor

-- 1. Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT,
  user_id UUID,
  type TEXT NOT NULL DEFAULT 'info',        -- info / warning / success / error
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  link TEXT DEFAULT '',                      -- deep link like clients/orders/sales
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Activity logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id BIGINT,
  user_id UUID,
  action TEXT NOT NULL,                      -- create / update / delete / status_change
  entity_type TEXT NOT NULL,                  -- client / order / lead / contract / etc
  entity_id BIGINT,
  entity_name TEXT DEFAULT '',
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. RLS policies
DO $$ BEGIN
  -- Notifications RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_select_company') THEN
    CREATE POLICY notif_select_company ON public.notifications FOR SELECT USING (company_id = current_setting('request.header.x-company-id', true)::bigint OR user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_update_company') THEN
    CREATE POLICY notif_update_company ON public.notifications FOR UPDATE USING (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='notifications' AND policyname='notif_insert_auth') THEN
    CREATE POLICY notif_insert_auth ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
  -- Activity logs RLS
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_logs' AND policyname='actlog_select_company') THEN
    CREATE POLICY actlog_select_company ON public.activity_logs FOR SELECT USING (company_id = current_setting('request.header.x-company-id', true)::bigint OR user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='activity_logs' AND policyname='actlog_insert_auth') THEN
    CREATE POLICY actlog_insert_auth ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.notifications(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON public.activity_logs(company_id, created_at DESC);

-- 5. Notify PostgREST
NOTIFY pgrst, 'reload schema';
