-- ============================================================
-- RLS 策略更新：全部从 profiles.company_id 切到 active_company_id
-- 请在 company_memberships.sql 之后执行
-- ============================================================

-- companies
DROP POLICY IF EXISTS "Members see own company" ON companies;
CREATE POLICY "Members see own company" ON companies FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = companies.id)
);

-- clients
DROP POLICY IF EXISTS "Company admins all clients" ON clients;
CREATE POLICY "Company admins all clients" ON clients FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = clients.company_id AND role IN('admin','super_admin'))
);
DROP POLICY IF EXISTS "Company users own clients" ON clients;
CREATE POLICY "Company users own clients" ON clients FOR ALL USING (
  auth.uid() = user_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = clients.company_id)
);

-- contacts
DROP POLICY IF EXISTS "Company admins all contacts" ON contacts;
CREATE POLICY "Company admins all contacts" ON contacts FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = contacts.company_id AND role IN('admin','super_admin'))
);
DROP POLICY IF EXISTS "Company users own contacts" ON contacts;
CREATE POLICY "Company users own contacts" ON contacts FOR ALL USING (
  auth.uid() = user_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = contacts.company_id)
);

-- orders
DROP POLICY IF EXISTS "Company admins all orders" ON orders;
CREATE POLICY "Company admins all orders" ON orders FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = orders.company_id AND role IN('admin','super_admin'))
);
DROP POLICY IF EXISTS "Company users own orders" ON orders;
CREATE POLICY "Company users own orders" ON orders FOR ALL USING (
  auth.uid() = user_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = orders.company_id)
);

-- departments
DROP POLICY IF EXISTS "Company admins all departments" ON departments;
CREATE POLICY "Company admins all departments" ON departments FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = departments.company_id AND role IN('admin','super_admin'))
);
DROP POLICY IF EXISTS "Company members view departments" ON departments;
CREATE POLICY "Company members view departments" ON departments FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = departments.company_id)
);

-- projects
DROP POLICY IF EXISTS "Company admins all projects" ON projects;
CREATE POLICY "Company admins all projects" ON projects FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = projects.company_id AND role IN('admin','super_admin'))
);
DROP POLICY IF EXISTS "Company users own projects" ON projects;
CREATE POLICY "Company users own projects" ON projects FOR ALL USING (
  auth.uid() = owner_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = projects.company_id)
);

-- suppliers
DROP POLICY IF EXISTS "Company admins all suppliers" ON suppliers;
CREATE POLICY "Company admins all suppliers" ON suppliers FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = suppliers.company_id AND role IN('admin','super_admin'))
);
DROP POLICY IF EXISTS "Company users own suppliers" ON suppliers;
CREATE POLICY "Company users own suppliers" ON suppliers FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = suppliers.company_id)
);

-- products
DROP POLICY IF EXISTS "Company admins all products" ON products;
CREATE POLICY "Company admins all products" ON products FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = products.company_id AND role IN('admin','super_admin'))
);
DROP POLICY IF EXISTS "Company users view products" ON products;
CREATE POLICY "Company users view products" ON products FOR SELECT USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = products.company_id)
);

-- product_scouting
DROP POLICY IF EXISTS "Company admins all scouting" ON product_scouting;
CREATE POLICY "Company admins all scouting" ON product_scouting FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = product_scouting.company_id AND role IN('admin','super_admin'))
);
DROP POLICY IF EXISTS "Company users own scouting" ON product_scouting;
CREATE POLICY "Company users own scouting" ON product_scouting FOR ALL USING (
  auth.uid() = user_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = product_scouting.company_id)
);

-- operations_logs
DROP POLICY IF EXISTS "Company admins all op_logs" ON operation_logs;
CREATE POLICY "Company admins all op_logs" ON operation_logs FOR ALL USING (
  EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = operation_logs.company_id AND role IN('admin','super_admin'))
);
DROP POLICY IF EXISTS "Company users own op_logs" ON operation_logs;
CREATE POLICY "Company users own op_logs" ON operation_logs FOR ALL USING (
  auth.uid() = user_id AND EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND active_company_id = operation_logs.company_id)
);

NOTIFY pgrst, 'reload schema';
