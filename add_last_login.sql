-- 在 profiles 表加 last_login_at 列
-- 在 Supabase SQL Editor 中执行

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.last_login_at IS '最后登录时间';
