-- Fix lead_pool status check constraint
-- The existing table was created with Chinese status values,
-- but all_in_one.sql defines English values.
-- DROP and re-add with BOTH to support existing data.
ALTER TABLE lead_pool DROP CONSTRAINT IF EXISTS lead_pool_status_check;
ALTER TABLE lead_pool ADD CONSTRAINT lead_pool_status_check CHECK (
  status IN ('new','assigned','contacted','converted','recycled','junk',
             '新线索','已分配','已联系','已转化','已回收','无效')
);

-- Verify
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid='lead_pool'::regclass AND conname='lead_pool_status_check';
