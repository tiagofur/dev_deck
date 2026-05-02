-- Seed a well-known Test User for E2E and development flows.
-- ID: 00000000-0000-0000-0000-000000000001
-- Delete first to handle any unique index conflicts (github_id unique index from 0009)
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001';
INSERT INTO users (id, github_id, login, display_name)
VALUES ('00000000-0000-0000-0000-000000000001', -1, 'devdeck-test', 'Test User');
