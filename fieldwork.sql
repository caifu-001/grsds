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
