-- Update the well-known Test User to mark onboarding as completed.
-- This runs safely after 0037_onboarding.sql has added the column.
UPDATE users 
SET onboarding_completed = true 
WHERE id = '00000000-0000-0000-0000-000000000001';
