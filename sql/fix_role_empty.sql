-- 给空 role 补上 admin
UPDATE company_memberships
SET role = 'admin'
WHERE user_id = 'c252c421-4100-4ad6-8125-f441483958c4'
  AND company_id = 1737
  AND (role IS NULL OR role = '');

-- 确认
SELECT * FROM company_memberships
WHERE user_id = 'c252c421-4100-4ad6-8125-f441483958c4';
