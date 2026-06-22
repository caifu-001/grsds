-- 离职审批系统
-- 在 Supabase SQL Editor 中执行

-- 添加离职审批列到 profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resignation_status text DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resignation_date date DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resignation_reason text DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resignation_requested_at timestamptz DEFAULT NULL;

-- 审批状态：pending(待批) / approved(已批) / rejected(已拒)
CREATE INDEX IF NOT EXISTS idx_profiles_resignation_status ON profiles(resignation_status);
