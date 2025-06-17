# Fietsersbond Projecten overzicht

## Configuratie

### Locatie Configuratie

Deze applicatie is locatie-onafhankelijk en kan geconfigureerd worden voor elk geografisch gebied door omgevingsvariabelen in te stellen. Kopieer `.env.example` naar `.env` en configureer het volgende:

```bash
# Locatie Naam (wordt getoond in de UI)
NUXT_PUBLIC_LOCATION_NAME=JouwStadNaam

# Locatie Bounds (definieert het interessegebied voor zoekopdrachten en standaard kaartweergave)
NUXT_PUBLIC_LOCATION_BOUNDS_WEST=6.11
NUXT_PUBLIC_LOCATION_BOUNDS_SOUTH=52.237
NUXT_PUBLIC_LOCATION_BOUNDS_EAST=6.224
NUXT_PUBLIC_LOCATION_BOUNDS_NORTH=52.293
```

**Configuratie Parameters:**

- `NUXT_PUBLIC_LOCATION_NAME`: De naam die wordt getoond in de applicatie UI (bijv. "Amsterdam", "Rotterdam")
- `NUXT_PUBLIC_LOCATION_BOUNDS_*`: Definieert de bounding box voor je interessegebied. Deze wordt gebruikt voor:
  - Het beperken van zoekresultaten tot jouw gebied
  - Het berekenen van het kaartcentrum (automatisch uit deze bounds)
  - De standaard weergave wanneer er geen issues zijn

**Je Coördinaten Vinden:**

1. **Voor bounding box coördinaten** - Gebruik [Bounding Box Tool](http://bboxfinder.com/):

   - Ga naar http://bboxfinder.com/
   - Zoom naar je gewenste gebied
   - Teken een rechthoek rond je interessegebied
   - Kopieer de coördinaten (in het formaat: west,south,east,north)

2. **Alternatief** - Gebruik [OpenStreetMap](https://www.openstreetmap.org/):

   - Navigeer naar je gewenste locatie
   - Klik rechts en selecteer "Toon adres" om coördinaten te krijgen
   - Bepaal handmatig de grenzen van je interessegebied

3. **Voor Nederlandse gemeenten** - Gebruik [PDOK Locatieserver](https://www.pdok.nl/introductie/-/article/pdok-locatieserver):
   - Zoek je gemeente op om automatisch de bounding box te krijgen

**Tip:** Zorg ervoor dat je bounding box niet te groot is (anders wordt de kaart te ver uitgezoomd) maar ook niet te klein (anders worden zoekresultaten te beperkt).

## NuxtHub Setup

Deze applicatie is gebouwd voor [NuxtHub](https://hub.nuxt.com) en maakt gebruik van Cloudflare's edge platform voor hosting, database en andere services.

### Vereisten

- Een [Cloudflare](https://cloudflare.com) account
- [Node.js](https://nodejs.org) (versie 18 of hoger)
- [pnpm](https://pnpm.io) package manager

### Stap 1: Project Setup

1. **Clone het project en installeer dependencies:**

   ```bash
   git clone <repository-url>
   cd fietsersbond
   pnpm install
   ```

2. **Maak een NuxtHub account:**
   - Ga naar [hub.nuxt.com](https://hub.nuxt.com)
   - Log in met je GitHub account
   - Verbind je Cloudflare account

### Stap 2: Database Setup

Deze applicatie gebruikt Cloudflare D1 (SQLite) database via NuxtHub:

1. **Database wordt automatisch aangemaakt** bij eerste deployment
2. **Lokale development:** Database wordt automatisch ge-seed met test data
3. **Productie:** Voer database migraties handmatig uit via NuxtHub Admin

### Stap 3: Omgevingsvariabelen

1. **Maak een `.env` bestand** (kopieer van `.env.example`):

   ```bash
   cp .env.example .env
   ```

2. **Configureer de vereiste variabelen:**

   ```bash
   # Locatie configuratie (pas aan voor jouw gebied)
   NUXT_PUBLIC_LOCATION_NAME=JouwStad
   NUXT_PUBLIC_LOCATION_BOUNDS_WEST=6.11
   NUXT_PUBLIC_LOCATION_BOUNDS_SOUTH=52.237
   NUXT_PUBLIC_LOCATION_BOUNDS_EAST=6.224
   NUXT_PUBLIC_LOCATION_BOUNDS_NORTH=52.293

   # Admin configuratie
   NUXT_PUBLIC_ADMIN_NAME=Beheerder

   # Authentication (wordt automatisch gegenereerd bij deployment)
   NUXT_SESSION_PASSWORD=<wordt-automatisch-gegenereerd>
   NUXT_JWT_SECRET=<wordt-automatisch-gegenereerd>

   # Eerste Admin Account
   NUXT_ADMIN_EMAIL=admin@joudomein.nl
   ```

### Stap 4: Deployment

1. **Eerste deployment:**

   ```bash
   npx nuxthub deploy
   ```

2. **Stel omgevingsvariabelen in via NuxtHub Admin:**

   - Ga naar [admin.hub.nuxt.com](https://admin.hub.nuxt.com)
   - Selecteer je project
   - Ga naar "Environment Variables"
   - Voeg je locatie configuratie toe
   - **Belangrijk:** Voeg ook je admin account configuratie toe:
     ```bash
     NUXT_ADMIN_EMAIL=admin@joudomein.nl
     ```

3. **Database migraties uitvoeren:**
   - In NuxtHub Admin, ga naar "Database"
   - Voer de migraties uit als ze niet automatisch zijn uitgevoerd

### Stap 5: Automatische Admin Account Aanmaak

Het systeem kan automatisch een eerste admin account aanmaken bij deployment:

1. **Configureer admin account variabelen:**

   Voeg de volgende variabelen toe via NuxtHub Admin (Environment Variables):

   ```bash
   NUXT_ADMIN_EMAIL=admin@jouwdomein.nl
   ```

   **Note:** De naam van de admin wordt automatisch overgenomen van `NUXT_PUBLIC_ADMIN_NAME`.

2. **Automatische aanmaak:**

   - Het systeem controleert bij elke start of er al admin accounts bestaan
   - Als er geen admin bestaat, wordt er een account aangemaakt met bovenstaande gegevens

3. **Eerste inlog:**

- Gebruik 'Wachtwoord vergeten?' op de inlogpagina om een wachtwoord in te stellen voor de nieuwe admin account.

### Extra Services

Om wachtwoord reset functionaliteit te ondersteunen is een Postmark account nodig voor e-mail notificaties.

#### Email (Postmark)

Voor wachtwoord reset functionaliteit:

```bash
NUXT_POSTMARK_API_KEY=je-postmark-api-key
NUXT_EMAIL_FROM=noreply@joudomein.nl
NUXT_ADMIN_EMAIL=admin@joudomein.nl
```

### Lokale Development vs Productie

**Lokale development:**

- Gebruikt lokale SQLite database
- Automatische database seeding
- Hot-reload voor development

**Productie (NuxtHub):**

- Cloudflare D1 database
- Edge deployment wereldwijd
- Automatische HTTPS
- Built-in analytics en monitoring

### Troubleshooting

**Database problemen:**

- Check database status in NuxtHub Admin
- Voer migraties handmatig uit indien nodig

**Deployment problemen:**

- Controleer build logs in NuxtHub Admin
- Zorg dat alle environment variables correct zijn ingesteld

**Performance:**

- Monitor via NuxtHub Analytics
- Database queries worden automatisch geoptimaliseerd door Cloudflare

## Development Server

Start de development server op `http://localhost:3000`:

```bash
pnpm dev
```

## Productie

Bouw de applicatie voor productie:

```bash
pnpm build
```

Bekijk de [deployment documentatie](https://hub.nuxt.com/docs/getting-started/deploy) voor meer informatie.

## Deploy

Deploy de applicatie op de Edge met [NuxtHub](https://hub.nuxt.com) op je Cloudflare account:

```bash
npx nuxthub deploy
```

Vervolgens kun je je server logs, analytics en meer bekijken in de [NuxtHub Admin](https://admin.hub.nuxt.com).

Je kunt ook deployen met [Cloudflare Pages CI](https://hub.nuxt.com/docs/getting-started/deploy#cloudflare-pages-ci).
