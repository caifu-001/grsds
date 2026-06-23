-- Fix client_id type mismatch: clients.id is UUID, but after-sales tables use BIGINT
-- Run this in Supabase SQL Editor
-- Drops column and re-adds as UUID since existing BIGINT data can't be cast

ALTER TABLE service_tickets DROP COLUMN IF EXISTS client_id;
ALTER TABLE service_tickets ADD COLUMN client_id UUID;

ALTER TABLE client_visits DROP COLUMN IF EXISTS client_id;
ALTER TABLE client_visits ADD COLUMN client_id UUID;

ALTER TABLE visit_tasks DROP COLUMN IF EXISTS client_id;
ALTER TABLE visit_tasks ADD COLUMN client_id UUID;

ALTER TABLE warranties DROP COLUMN IF EXISTS client_id;
ALTER TABLE warranties ADD COLUMN client_id UUID;

ALTER TABLE maintenance_plans DROP COLUMN IF EXISTS client_id;
ALTER TABLE maintenance_plans ADD COLUMN client_id UUID;
