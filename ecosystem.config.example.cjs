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
        // Organisatie configuratie
        NUXT_PUBLIC_ORGANIZATION_NAME: "Fietsersbond Afdeling",
        NUXT_PUBLIC_ORGANIZATION_SHORT_NAME: "Onderwerpen",
        NUXT_PUBLIC_ORGANIZATION_WEBSITE: "https://example.fietsersbond.nl/",
        NUXT_PUBLIC_ORGANIZATION_CONTACT_URL:
          "https://example.fietsersbond.nl/contact/",
        NUXT_PUBLIC_GITHUB_REPO_URL: "https://github.com/organization/repo",
        // Kaart configuratie
        NUXT_PUBLIC_MAP_CENTER_LAT: "52.2511467",
        NUXT_PUBLIC_MAP_CENTER_LON: "6.1574997",
        NUXT_PUBLIC_MAP_INITIAL_ZOOM: "13",
        NUXT_PUBLIC_MAP_SEARCH_BBOX: "6.0,52.1,6.3,52.4",
        // Matomo server-side configuration (optional)
        MATOMO_URL: "https://matomo.example.com",
        MATOMO_TRACKER_URL: "matomo.php",
        MATOMO_AUTH_TOKEN: "your-matomo-auth-token-here",
        // Matomo client-side configuration (optional)
        NUXT_PUBLIC_MATOMO_SITE_ID: "1",
        NUXT_PUBLIC_MATOMO_SCRIPT_URL: "matomo.js",
      },
    },
  ],
};
