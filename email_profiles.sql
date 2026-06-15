-- ===== 给 profiles 表加 email 列并回填已有数据 =====

-- 1) 加列
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2) 回填已登录用户的邮箱
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.user_id = au.id AND p.email IS NULL;

-- 3) 提示未来数据在新注册/登录时自动同步
-- 代码已修改：onLoginSuccess 和 saveNewUser 都会写入 email
