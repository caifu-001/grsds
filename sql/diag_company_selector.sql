-- 逐层排查：为什么公司选择器为空
-- 在 Supabase SQL Editor 分步执行

-- 第1层：company_memberships 表存在且有行吗？
SELECT 'step1_company_memberships' AS step, COUNT(*) AS count FROM company_memberships;

-- 第2层：profiles 表有多少用户，有 company_id 吗？
SELECT 'step2_profiles' AS step, COUNT(*) AS total,
  COUNT(*) FILTER (WHERE company_id IS NOT NULL) AS has_company_id
FROM profiles;

-- 第3层：companies 表有数据吗？
SELECT 'step3_companies' AS step, COUNT(*) AS count FROM companies;

-- 第4层：当前登录用户的 profiles 信息
SELECT 'step4_my_profile' AS step, user_id, email, company_id, role, active_company_id, display_name
FROM profiles
WHERE user_id = auth.uid();

-- 第5层：当前用户在公司成员表里的记录
SELECT 'step5_my_memberships' AS step, * FROM company_memberships WHERE user_id = auth.uid();

-- 第6层：直接调用 RPC
SELECT 'step6_rpc' AS step, * FROM get_my_memberships();
