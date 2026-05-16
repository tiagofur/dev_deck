-- 0018_add_user_roles.sql
-- Add role column to users table for RBAC support

ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user';
