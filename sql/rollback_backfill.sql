-- 回滚 backfill_self_grants.sql 产生的授权行
-- 策略：清空 resource_grants 表（之前自授权因缺 company_id 全失败，表里只有回填的数据）
-- 清完之后，新建的客户/产品/供应商会自动写自授权（已修复），管理员手动给成员授权不受影响

DELETE FROM resource_grants;

-- 验证
SELECT COUNT(*) AS remaining FROM resource_grants;
