INSERT INTO "users" (username, role, password_hash, created_at)
SELECT 'arjen.haayman@gmail.com', 'admin', 'dummy wachtwoord', CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "users");
