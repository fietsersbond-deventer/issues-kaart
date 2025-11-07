module.exports = {
  apps: [
    {
      name: "fietsersbond",
      script: "./server/index.mjs",
      env: {
        NUXT_SESSION_PASSWORD: "your-session-password-here",
        NUXT_POSTMARK_API_KEY: "your-postmark-api-key-here",
        NUXT_JWT_SECRET: "your-jwt-secret-here",
        NUXT_PUBLIC_APP_URL: "https://your-domain.com",
        NUXT_EMAIL_FROM: "noreply@your-domain.com",
        NUXT_ADMIN_EMAIL: "admin@your-domain.com",
        NUXT_DB_PATH: "/path/to/fietsersbond.sqlite3",
        // Matomo server-side configuration (optional)
        NUXT_MATOMO_URL: "https://matomo.example.com",
        NUXT_MATOMO_TRACKER_URL: "matomo.php",
        NUXT_MATOMO_AUTH_TOKEN: "your-matomo-auth-token-here",
        // Matomo client-side configuration (optional)
        NUXT_PUBLIC_MATOMO_SITE_ID: "1",
        NUXT_PUBLIC_MATOMO_SCRIPT_URL: "matomo.js",
      },
    },
  ],
};
