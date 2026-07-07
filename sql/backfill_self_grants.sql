-- 回填：给所有非管理员员工授权查看公司所有现有资源
-- 因为没有 user_id 列无法确定创建者，回填策略为：每个公司的非管理员成员 → 看该公司所有资源

-- 1. 回填 clients
INSERT INTO resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
SELECT cm.user_id, cm.company_id, 'clients', c.id::TEXT, cm.user_id
FROM company_memberships cm
JOIN clients c ON c.company_id = cm.company_id
WHERE cm.role != 'admin' AND cm.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM resource_grants rg
    WHERE rg.user_id = cm.user_id
      AND rg.company_id = cm.company_id
      AND rg.resource_type = 'clients'
      AND rg.resource_id = c.id::TEXT
  );

-- 2. 回填 products
INSERT INTO resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
SELECT cm.user_id, cm.company_id, 'products', p.id::TEXT, cm.user_id
FROM company_memberships cm
JOIN products p ON p.company_id = cm.company_id
WHERE cm.role != 'admin' AND cm.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM resource_grants rg
    WHERE rg.user_id = cm.user_id
      AND rg.company_id = cm.company_id
      AND rg.resource_type = 'products'
      AND rg.resource_id = p.id::TEXT
  );

-- 3. 回填 suppliers
INSERT INTO resource_grants (user_id, company_id, resource_type, resource_id, granted_by)
SELECT cm.user_id, cm.company_id, 'suppliers', s.id::TEXT, cm.user_id
FROM company_memberships cm
JOIN suppliers s ON s.company_id = cm.company_id
WHERE cm.role != 'admin' AND cm.status = 'active'
  AND NOT EXISTS (
    SELECT 1 FROM resource_grants rg
    WHERE rg.user_id = cm.user_id
      AND rg.company_id = cm.company_id
      AND rg.resource_type = 'suppliers'
      AND rg.resource_id = s.id::TEXT
  );

-- 4. 验证结果
SELECT 'clients' AS resource_type, COUNT(*) AS new_grants FROM (
  SELECT 1 FROM company_memberships cm
  JOIN clients c ON c.company_id = cm.company_id
  WHERE cm.role != 'admin' AND cm.status = 'active'
    AND NOT EXISTS (SELECT 1 FROM resource_grants rg WHERE rg.user_id=cm.user_id AND rg.company_id=cm.company_id AND rg.resource_type='clients' AND rg.resource_id=c.id::TEXT)
) t
UNION ALL
SELECT 'products', COUNT(*) FROM (
  SELECT 1 FROM company_memberships cm
  JOIN products p ON p.company_id = cm.company_id
  WHERE cm.role != 'admin' AND cm.status = 'active'
    AND NOT EXISTS (SELECT 1 FROM resource_grants rg WHERE rg.user_id=cm.user_id AND rg.company_id=cm.company_id AND rg.resource_type='products' AND rg.resource_id=p.id::TEXT)
) t
UNION ALL
SELECT 'suppliers', COUNT(*) FROM (
  SELECT 1 FROM company_memberships cm
  JOIN suppliers s ON s.company_id = cm.company_id
  WHERE cm.role != 'admin' AND cm.status = 'active'
    AND NOT EXISTS (SELECT 1 FROM resource_grants rg WHERE rg.user_id=cm.user_id AND rg.company_id=cm.company_id AND rg.resource_type='suppliers' AND rg.resource_id=s.id::TEXT)
) t;
