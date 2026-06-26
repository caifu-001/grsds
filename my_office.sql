-- my_office.sql - 个人办公中心数据表
-- 依赖: profiles 表 (user_id UUID)

CREATE TABLE IF NOT EXISTS my_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  title TEXT NOT NULL,
  content TEXT,
  file_url TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT[],
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  company_id INTEGER
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  dept_id TEXT,
  created_by UUID NOT NULL REFERENCES profiles(user_id),
  priority TEXT DEFAULT 'normal',
  is_pinned BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id INTEGER
);
