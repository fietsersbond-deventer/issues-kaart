-- Read admin email from environment variable and only proceed if it's set
WITH admin_email AS (
    SELECT NULLIF(@NUXT_ADMIN_EMAIL, '') as email
),
random_password AS (
    -- Generate a random 16-character password using alphanumeric characters
    SELECT lower(hex(randomblob(8))) as password
)
-- Only insert if NUXT_ADMIN_EMAIL is set and user doesn't exist
INSERT INTO users (username, role, password_hash)
SELECT 
    email, 
    'admin',
    (SELECT password FROM random_password)
FROM admin_email
WHERE email IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM users WHERE username = (SELECT email FROM admin_email)
);

-- Only update role if NUXT_ADMIN_EMAIL is set and user exists
UPDATE users 
SET role = 'admin'
WHERE username = (SELECT email FROM admin_email)
AND email IS NOT NULL
AND role != 'admin';
