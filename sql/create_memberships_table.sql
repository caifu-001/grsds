-- 1. 建表
CREATE TABLE IF NOT EXISTS company_memberships (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','editor','member')),
  department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (user_id, company_id)
);
ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;

-- RLS：成员只能看自己公司的成员
CREATE POLICY "Members can see own company" ON company_memberships
  FOR SELECT USING (
    EXISTS(SELECT 1 FROM company_memberships cm2 WHERE cm2.user_id = auth.uid() AND cm2.company_id = company_memberships.company_id AND cm2.status = 'active')
  );
CREATE POLICY "Admins can manage members" ON company_memberships
  FOR ALL USING (
    EXISTS(SELECT 1 FROM company_memberships cm2 WHERE cm2.user_id = auth.uid() AND cm2.company_id = company_memberships.company_id AND cm2.role = 'admin' AND cm2.status = 'active')
  );

-- 2. profiles 加 active_company_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- 3. 迁移旧数据
INSERT INTO company_memberships (user_id, company_id, role, status, joined_at)
SELECT user_id, company_id,
  CASE WHEN role = 'super_admin' THEN 'admin' WHEN role = 'admin' THEN 'admin' ELSE 'member' END,
  'active', created_at
FROM profiles
WHERE company_id IS NOT NULL
ON CONFLICT (user_id, company_id) DO NOTHING;

-- 4. 回填 active_company_id
UPDATE profiles p
SET active_company_id = (
  SELECT cm.company_id FROM company_memberships cm
  WHERE cm.user_id = p.user_id AND cm.status = 'active'
  ORDER BY cm.joined_at LIMIT 1
)
WHERE p.active_company_id IS NULL
  AND EXISTS (SELECT 1 FROM company_memberships cm WHERE cm.user_id = p.user_id);

-- 验证
SELECT COUNT(*) AS membership_count FROM company_memberships;
