-- 邀请系统 v2：邮箱邀请入职
-- 在 Supabase SQL Editor 执行

-- 1. 邀请表
CREATE TABLE IF NOT EXISTS invitations (
  id BIGSERIAL PRIMARY KEY,
  from_company_id BIGINT NOT NULL,
  to_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_inv_to_email_status ON invitations(to_email, status);
CREATE INDEX IF NOT EXISTS idx_inv_company ON invitations(from_company_id);

-- 2. 清理旧邀请字段（迁移到新表后可选废弃）
-- ALTER TABLE profiles DROP COLUMN IF EXISTS invited_company_id;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS invited_at;
