-- fieldwork.sql - 外勤管理数据表

CREATE TABLE IF NOT EXISTS field_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  type TEXT NOT NULL DEFAULT 'in',
  latitude NUMERIC,
  longitude NUMERIC,
  address TEXT,
  photo_url TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id INTEGER
);

CREATE TABLE IF NOT EXISTS field_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id),
  client_id UUID REFERENCES clients(id),
  client_name TEXT,
  purpose TEXT,
  notes TEXT,
  result TEXT,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_time TIME,
  end_time TIME,
  duration_minutes INTEGER,
  latitude NUMERIC,
  longitude NUMERIC,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  company_id INTEGER
);

-- ==================== RLS ====================
ALTER TABLE field_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;

-- field_checkins: 同公司可读，本人/管理员可写
CREATE POLICY "Company access field_checkins" ON field_checkins FOR ALL
USING (EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=field_checkins.company_id))
WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=field_checkins.company_id));

-- field_visits: 同公司可读，本人/管理员可写
CREATE POLICY "Company access field_visits" ON field_visits FOR ALL
USING (EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=field_visits.company_id))
WITH CHECK (EXISTS(SELECT 1 FROM profiles WHERE user_id=auth.uid() AND company_id=field_visits.company_id));
