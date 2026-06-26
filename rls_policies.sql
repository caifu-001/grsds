-- RLS policies for my_office + fieldwork tables
-- Run this in Supabase SQL Editor
-- The 404 errors happen because RLS is enabled but no policies exist

-- ===== announcements =====
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements_select" ON announcements FOR SELECT
  USING (company_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'company_id')::INTEGER));
-- Allow insert/update/delete for any authenticated user (for now)
-- Adjust if you want admin-only
CREATE POLICY "announcements_insert" ON announcements FOR INSERT
  WITH CHECK (company_id IS NOT NULL);
CREATE POLICY "announcements_update" ON announcements FOR UPDATE
  USING (true);
CREATE POLICY "announcements_delete" ON announcements FOR DELETE
  USING (true);

-- ===== my_documents =====
ALTER TABLE my_documents ENABLE ROW LEVEL SECURITY;
-- Users can only see their own documents
CREATE POLICY "my_documents_select" ON my_documents FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "my_documents_insert" ON my_documents FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "my_documents_update" ON my_documents FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "my_documents_delete" ON my_documents FOR DELETE
  USING (user_id = auth.uid());

-- ===== field_checkins =====
ALTER TABLE field_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_checkins_select" ON field_checkins FOR SELECT
  USING (company_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'company_id')::INTEGER));
CREATE POLICY "field_checkins_insert" ON field_checkins FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "field_checkins_update" ON field_checkins FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "field_checkins_delete" ON field_checkins FOR DELETE
  USING (user_id = auth.uid());

-- ===== field_visits =====
ALTER TABLE field_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "field_visits_select" ON field_visits FOR SELECT
  USING (company_id = (SELECT (current_setting('request.jwt.claims', true)::json->>'company_id')::INTEGER));
CREATE POLICY "field_visits_insert" ON field_visits FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "field_visits_update" ON field_visits FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "field_visits_delete" ON field_visits FOR DELETE
  USING (user_id = auth.uid());
