-- ============================================================
-- 多租户迁移 SQL (请在 Supabase SQL Editor 中执行)
-- 租户模式：公司级隔离，admin看全部/user看自己，超级管理员跨公司
-- ============================================================

-- 1. 公司表
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  tax_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- 旧 companies 表可能缺列，补建
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 2. 加 company_id 列（必须在 companies RLS 策略之前，因为策略引用了 profiles.company_id）
ALTER TABLE clients ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL;

-- companies RLS 策略（依赖 profiles.company_id，必须在 step 2 之后）
DROP POLICY IF EXISTS "Super admins all companies" ON companies;
CREATE POLICY "Super admins all companies" ON companies FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND role='super_admin')
);

DROP POLICY IF EXISTS "Members see own company" ON companies;
CREATE POLICY "Members see own company" ON companies FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=companies.id)
);

DROP POLICY IF EXISTS "Auth users register company" ON companies;
CREATE POLICY "Auth users register company" ON companies FOR INSERT
  WITH CHECK (auth.role()='authenticated' AND status='pending' AND created_by=auth.uid());

-- 3. 创建默认公司 + 迁移已有数据
INSERT INTO companies (name, tax_id, status, created_by)
VALUES ('默认公司', 'TAX000000', 'approved', 'b2adc3bc-e5c1-46a9-b50e-fdfe56203370')
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE v_id INTEGER;
BEGIN
  SELECT id INTO v_id FROM companies WHERE name='默认公司';
  UPDATE clients SET company_id=v_id WHERE company_id IS NULL;
  UPDATE contacts SET company_id=v_id WHERE company_id IS NULL;
  UPDATE orders SET company_id=v_id WHERE company_id IS NULL;
  UPDATE profiles SET company_id=v_id WHERE company_id IS NULL;
END $$;

-- 设为超级管理员
UPDATE profiles SET role='super_admin', company_id=(SELECT id FROM companies WHERE name='默认公司')
WHERE user_id='b2adc3bc-e5c1-46a9-b50e-fdfe56203370';

-- 4. 重建所有 RLS 策略（公司级隔离）
-- clients: admin看全公司, 普通用户只看自己的
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;
DROP POLICY IF EXISTS "Admins manage all clients" ON clients;

CREATE POLICY "Company admins all clients" ON clients FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=clients.company_id AND role IN('admin','super_admin'))
);
CREATE POLICY "Company users own clients" ON clients FOR ALL USING (
  auth.uid()=user_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=clients.company_id)
);

-- contacts
DROP POLICY IF EXISTS "Users can view own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can insert own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can update own contacts" ON contacts;
DROP POLICY IF EXISTS "Users can delete own contacts" ON contacts;

CREATE POLICY "Company admins all contacts" ON contacts FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=contacts.company_id AND role IN('admin','super_admin'))
);
CREATE POLICY "Company users own contacts" ON contacts FOR ALL USING (
  auth.uid()=user_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=contacts.company_id)
);

-- orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can delete own orders" ON orders;

CREATE POLICY "Company admins all orders" ON orders FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=orders.company_id AND role IN('admin','super_admin'))
);
CREATE POLICY "Company users own orders" ON orders FOR ALL USING (
  auth.uid()=user_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=orders.company_id)
);

-- departments
DROP POLICY IF EXISTS "Admins manage departments" ON departments;
DROP POLICY IF EXISTS "Users view departments" ON departments;

CREATE POLICY "Company admins all departments" ON departments FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=departments.company_id AND role IN('admin','super_admin'))
);
CREATE POLICY "Company members view departments" ON departments FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=departments.company_id)
);

-- profiles: 每人管自己的，超级管理员看全部
DROP POLICY IF EXISTS "Admins manage profiles" ON profiles;
DROP POLICY IF EXISTS "Users view own profile" ON profiles;
DROP POLICY IF EXISTS "Users manage own profile" ON profiles;

CREATE POLICY "Users own profile" ON profiles FOR ALL USING (auth.uid()=user_id);

-- 5. RPC: 列出本公司用户 (admin/super_admin)
DROP FUNCTION IF EXISTS list_all_users;
CREATE OR REPLACE FUNCTION list_all_users()
RETURNS TABLE(user_id UUID, email TEXT, display_name TEXT, department_id INTEGER, role TEXT, company_id INTEGER, "position" TEXT, status TEXT, phone TEXT, role_id BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND role IN('admin','super_admin')) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  RETURN QUERY
    SELECT p.user_id, au.email::TEXT, p.display_name, p.department_id, p.role, p.company_id, p."position", p.status, p.phone, p.role_id
    FROM profiles p LEFT JOIN auth.users au ON au.id=p.user_id
    WHERE p.company_id=(SELECT company_id FROM profiles WHERE user_id=auth.uid())
    ORDER BY p.created_at DESC NULLS LAST;
END;
$$;

-- 6. RPC: 列出所有公司 (super_admin only)
DROP FUNCTION IF EXISTS list_all_companies;
CREATE OR REPLACE FUNCTION list_all_companies()
RETURNS TABLE(id INTEGER, name TEXT, tax_id TEXT, status TEXT, created_by UUID, created_at TIMESTAMPTZ, creator_email TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND role='super_admin') THEN
    RAISE EXCEPTION 'permission denied';
  END IF;
  RETURN QUERY
    SELECT c.id, c.name, c.tax_id, c.status, c.created_by, c.created_at, au.email::TEXT
    FROM companies c LEFT JOIN auth.users au ON au.id=c.created_by
    ORDER BY c.created_at DESC;
END;
$$;

NOTIFY pgrst, 'reload schema';
