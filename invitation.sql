-- 邀请系统：添加邀请字段到 profiles 表
-- 在 Supabase SQL Editor 执行

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_company_id BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ;

-- 索引加速查询
CREATE INDEX IF NOT EXISTS idx_profiles_invited_company ON profiles(invited_company_id) WHERE invited_company_id IS NOT NULL;

-- 清除离职用户对旧公司的关联（批量修复已有数据）
UPDATE profiles SET company_id = NULL, department_id = NULL WHERE status = 'leave' AND company_id IS NOT NULL;
