-- 先看 contacts 表当前结构
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'contacts' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 如果 client_id 是 bigint，改成 uuid
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND table_schema = 'public'
      AND column_name = 'client_id' AND data_type = 'bigint'
  ) THEN
    ALTER TABLE contacts ALTER COLUMN client_id TYPE UUID USING NULL;
    RAISE NOTICE 'contacts.client_id 已从 BIGINT 改为 UUID，请注意：旧数据已清空为 NULL';
  ELSE
    RAISE NOTICE 'contacts.client_id 类型正常，无需修改';
  END IF;
END $$;
