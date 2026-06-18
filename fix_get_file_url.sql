-- Fix: Create missing get_file_url function(s)
-- Called by computed columns or triggers on contracts table
-- Run in Supabase SQL Editor

-- Function: get_file_url(text) -> text
CREATE OR REPLACE FUNCTION public.get_file_url(path text)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  IF path IS NULL OR path = '' THEN
    RETURN NULL;
  END IF;
  IF path LIKE 'http%' THEN
    RETURN path;
  END IF;
  RETURN 'https://jyefbatmmbelrhhzsgva.supabase.co/storage/v1/object/public/' || path;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_file_url(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_file_url(text) TO anon;

NOTIFY pgrst, 'reload schema';
