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
