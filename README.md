# Fietsersbond Deventer - Issues Kaart

Een interactieve kaartapplicatie voor het beheren en visualiseren van fietsgerelateerde onderwerpen in Deventer. Dit project stelt gebruikers in staat om knelpunten, suggesties en projecten op een kaart te plaatsen en te beheren.

## 📋 Overzicht

Deze applicatie is gebouwd met Nuxt 4 en biedt:

- **Interactieve kaart** met OpenLayers voor het weergeven van onderwerpen
- **Gebruikersbeheer** met authenticatie en autorisatie
- **Admin dashboard** voor het beheren van onderwerpen, categorieën en gebruikers
- **Real-time updates** via WebSockets
- **Meerdere kaartlagen** (luchtfoto, fietskaart, etc.)
- **Responsive design** voor mobiel en desktop

## 🚀 Technologie Stack

- **Framework**: Nuxt 4 (Vue 3 met TypeScript)
- **UI Components**: Vuetify 3
- **Kaarten**: OpenLayers via vue3-openlayers
- **State Management**: Pinia
- **Authenticatie**: @sidebase/nuxt-auth
- **Database**: SQLite (via server/database)
- **Testing**: Vitest
- **Package Manager**: pnpm

## 📦 Vereisten

- **Node.js**: versie 22.2 of hoger
- **pnpm**: versie 10.11.0 of hoger

## 🛠️ Installatie

1. **Clone de repository**

   ```bash
   git clone https://github.com/fietsersbond-deventer/issues-kaart.git
   cd issues-kaart
   ```

2. **Installeer dependencies**

   ```bash
   pnpm install
   ```

3. **Configureer environment variabelen**
   Maak een `.env` bestand aan in de root van het project en vul de vereiste waarden in op basis van het `.env.example` bestand.

4. **Database migraties uitvoeren**
   ```bash
   pnpm run migrate
   ```

## 🏃 Development

Start de development server:

```bash
pnpm run dev
```

De applicatie is nu beschikbaar op [http://localhost:3000](http://localhost:3000)

### Andere handige commando's

```bash
# Linting
pnpm run lint

# Type checking
pnpm run typecheck

# Tests uitvoeren
pnpm run test

# Tests met coverage
pnpm run test:coverage

# Tests met UI
pnpm run test:ui
```

## 🏗️ Build voor productie

```bash
# Build de applicatie
pnpm run build

# Start de productie server
pnpm run start
```

### Deployment

Het project bevat een `deploy.sh` script voor geautomatiseerde deployment naar een remote server via rsync en PM2.

**Gebruik:**

```bash
DEPLOYMENT_TARGET=user@host:/path/to/deploy ./deploy.sh
```

Het script:
1. Bouwt de applicatie (`npm run build`)
2. Synchroniseert `package.json` naar de remote server
3. Synchroniseert de `.output` directory (server, public, nitro.json)
4. Herstart de applicatie via PM2 op de remote server

**Vereisten voor deployment:**
- SSH toegang tot de remote server
- PM2 geïnstalleerd op de remote server
- De `DEPLOYMENT_TARGET` environment variabele gezet
- Een `ecosystem.config.cjs` bestand op de remote server (zie `ecosystem.config.example.cjs` voor een voorbeeld)

**PM2 Configuratie:**

Kopieer `ecosystem.config.example.cjs` naar `ecosystem.config.cjs` en pas de environment variabelen aan:

```bash
cp ecosystem.config.example.cjs ecosystem.config.cjs
# Bewerk ecosystem.config.cjs met je eigen waarden
```

Start de applicatie met PM2:

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

## 📁 Project Structuur

```
fietsersbond/
├── app/
│   ├── components/       # Vue componenten
│   │   ├── admin/       # Admin-specifieke componenten
│   │   ├── map/         # Kaart componenten
│   │   └── layout/      # Layout componenten
│   ├── composables/     # Herbruikbare composables
│   ├── pages/           # Nuxt pagina's (auto-routing)
│   ├── types/           # TypeScript type definities
│   └── utils/           # Utility functies
├── server/
│   ├── api/            # API endpoints
│   ├── database/       # Database schema en migraties
│   ├── middleware/     # Server middleware
│   └── utils/          # Server utilities
├── middleware/         # Route middleware
├── public/            # Statische bestanden
└── tests/             # Test bestanden
```

## 🗺️ Gebruik

### Voor gebruikers

1. Ga naar de kaart via de homepage
2. Klik op bestaande markers om details te zien
3. Login om nieuwe onderwerpen toe te voegen of te bewerken

### Voor beheerders

1. Login met admin-rechten
2. Ga naar `/admin` voor het dashboard
3. Beheer onderwerpen, categorieën en gebruikers

## 🔐 Authenticatie

De applicatie gebruikt lokale authenticatie met:

- Gebruikersnaam/wachtwoord login
- JWT tokens met refresh tokens
- Rolgebaseerde toegangscontrole (admin/gebruiker)
- Wachtwoord reset functionaliteit

## 🧪 Testing

Tests zijn geschreven met Vitest:

```bash
# Alle tests
pnpm run test

# Specifieke test file
pnpm run test tests/extractImageUrl.test.ts

# Watch mode
pnpm run test -- --watch
```

## 📝 Coding Richtlijnen

Zie `.github/workflows/copilot-instructions.md` voor gedetailleerde coding richtlijnen en best practices.

Belangrijke punten:

- TypeScript voor alle code
- Nuxt 4 auto-imports (geen imports voor Vue/Nuxt composables)
- Vuetify voor UI componenten
- Nederlandse teksten in de gebruikersinterface
- ESLint configuratie volgen

## 🤝 Bijdragen

1. Fork het project
2. Maak een feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit je wijzigingen (`git commit -m 'Add some AmazingFeature'`)
4. Push naar de branch (`git push origin feature/AmazingFeature`)
5. Open een Pull Request

## 📄 Licentie

Dit project is gelicenseerd onder de MIT License - zie het [LICENSE](LICENSE) bestand voor details.

Copyright (c) 2025 Fietsersbond Deventer

## 👥 Contact

Fietsersbond Deventer - [GitHub](https://github.com/fietsersbond-deventer)

Project Link: [https://github.com/fietsersbond-deventer/issues-kaart](https://github.com/fietsersbond-deventer/issues-kaart)
