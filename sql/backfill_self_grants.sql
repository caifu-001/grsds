-- 回填：给所有非管理员员工补上他们自己创建的资源的自授权行
-- 逻辑：对每条 clients/products/suppliers，如果创建者不是管理员且没有对应授权行，补一条

-- 1. 回填 clients 自授权
INSERT INTO resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
SELECT 
  c.user_id,
  c.company_id,
  'clients',
  c.id::TEXT,
  c.user_id
FROM clients c
WHERE c.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM resource_grants rg 
    WHERE rg.user_id = c.user_id 
      AND rg.company_id = c.company_id 
      AND rg.resource_type = 'clients' 
      AND rg.resource_id = c.id::TEXT
  )
  -- 排除管理员（管理员不依赖 resource_grants，超管前端 isSuperAdmin 绕过）
  AND NOT EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.user_id = c.user_id 
      AND cm.company_id = c.company_id 
      AND cm.role = 'admin'
  );

-- 2. 回填 products 自授权
INSERT INTO resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
SELECT 
  p.user_id,
  p.company_id,
  'products',
  p.id::TEXT,
  p.user_id
FROM products p
WHERE p.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM resource_grants rg 
    WHERE rg.user_id = p.user_id 
      AND rg.company_id = p.company_id 
      AND rg.resource_type = 'products' 
      AND rg.resource_id = p.id::TEXT
  )
  AND NOT EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.user_id = p.user_id 
      AND cm.company_id = p.company_id 
      AND cm.role = 'admin'
  );

-- 3. 回填 suppliers 自授权
INSERT INTO resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
SELECT 
  s.user_id,
  s.company_id,
  'suppliers',
  s.id::TEXT,
  s.user_id
FROM suppliers s
WHERE s.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM resource_grants rg 
    WHERE rg.user_id = s.user_id 
      AND rg.company_id = s.company_id 
      AND rg.resource_type = 'suppliers' 
      AND rg.resource_id = s.id::TEXT
  )
  AND NOT EXISTS (
    SELECT 1 FROM company_memberships cm 
    WHERE cm.user_id = s.user_id 
      AND cm.company_id = s.company_id 
      AND cm.role = 'admin'
  );

-- 4. 验证：查看回填了多少条
SELECT 'clients' AS resource_type, COUNT(*) AS new_grants FROM (
  SELECT c.user_id, c.company_id, c.id FROM clients c WHERE c.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM resource_grants rg WHERE rg.user_id=c.user_id AND rg.company_id=c.company_id AND rg.resource_type='clients' AND rg.resource_id=c.id::TEXT)
) t
UNION ALL
SELECT 'products', COUNT(*) FROM (
  SELECT p.user_id, p.company_id, p.id FROM products p WHERE p.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM resource_grants rg WHERE rg.user_id=p.user_id AND rg.company_id=p.company_id AND rg.resource_type='products' AND rg.resource_id=p.id::TEXT)
) t
UNION ALL
SELECT 'suppliers', COUNT(*) FROM (
  SELECT s.user_id, s.company_id, s.id FROM suppliers s WHERE s.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM resource_grants rg WHERE rg.user_id=s.user_id AND rg.company_id=s.company_id AND rg.resource_type='suppliers' AND rg.resource_id=s.id::TEXT)
) t;
