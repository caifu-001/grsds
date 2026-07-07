-- 修复 project_assignments / project_block_state RLS 策略中 profiles 引用错误
-- 原策略用了 profiles WHERE id = auth.uid() 应改为 user_id = auth.uid()

ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_block_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pa_select ON project_assignments;
CREATE POLICY pa_select ON project_assignments FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_assignments.project_id
          AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS pa_modify ON project_assignments;
CREATE POLICY pa_modify ON project_assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_assignments.project_id
          AND (p.owner_id = auth.uid()
               OR EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))))
);

DROP POLICY IF EXISTS pbs_select ON project_block_state;
CREATE POLICY pbs_select ON project_block_state FOR SELECT USING (
  EXISTS (SELECT 1 FROM projects p WHERE p.id = project_block_state.project_id
          AND p.company_id = (SELECT company_id FROM profiles WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS pbs_modify ON project_block_state;
CREATE POLICY pbs_modify ON project_block_state FOR ALL USING (
  EXISTS (SELECT 1 FROM project_assignments pa
          WHERE pa.project_id = project_block_state.project_id
          AND pa.user_id = auth.uid()
          AND pa.project_role IN ('edit','approve'))
);

SELECT 'RLS policies fixed - profiles.id changed to profiles.user_id' AS result;
