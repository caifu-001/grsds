-- invitations 表加字段 + 查问题
-- Supabase SQL Editor 执行

-- 加 message 列
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS message TEXT;

-- 确认 invitations 表结构和数据
SELECT column_name, data_type FROM information_schema.columns WHERE table_name='invitations' ORDER BY ordinal_position;

-- 看现有数据
SELECT * FROM invitations;
