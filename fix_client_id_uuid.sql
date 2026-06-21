-- Fix client_id type mismatch: clients.id is UUID, but after-sales tables use BIGINT
-- Run this in Supabase SQL Editor

ALTER TABLE service_tickets ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
ALTER TABLE client_visits ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
ALTER TABLE visit_tasks ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
ALTER TABLE warranties ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
ALTER TABLE maintenance_plans ALTER COLUMN client_id TYPE UUID USING client_id::uuid;
