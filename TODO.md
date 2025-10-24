# TODO: App Generiek Maken

Deze TODO lijst beschrijft alle stappen om de Fietsersbond Deventer app generiek te maken, zodat andere afdelingen deze kunnen gebruiken door alleen configuratie aan te passen.

## 📋 Overzicht van Deventer-specifieke elementen

### Hardcoded Teksten & Branding

- Organisatie naam "Fietsersbond Deventer" in meerdere bestanden
- Welkomtekst "Welkom bij de Fietsersbond Deventer"
- Site titles, descriptions, Open Graph metadata
- Logo bestanden: `/fietsersbond-logo.webp`, `/fietsersbond.jpeg`
- GitHub repository links naar `fietsersbond-deventer`

### Geografische Configuratie

- Kaart centrum coördinaten: `[687858.9021986299, 6846820.48790154]` (Deventer)
- Zoek bias coördinaten: `52.2511467, 6.1574997` (Deventer)
- Zoekgebied bounding box: `"6.0,52.1,6.3,52.4"` (rond Deventer)
- Initieel zoom niveau: `13`

### Externe URLs

- Hoofdwebsite: `https://deventer.fietsersbond.nl/`
- Contact URL: `https://deventer.fietsersbond.nl/contact/contact-met-de-afdeling/`

### Database & Deployment

- Database pad: `/path/to/fietsersbond.sqlite3`
- PM2 app naam: `fietsersbond`
- Deploy script met hardcoded paths

---

## 🛠️ Configuratie Stappen

### Stap 1: Environment Variabelen Uitbreiden

#### `.env.example` aanpassen

Toevoegen aan `.env.example`:

```bash
# ====== ORGANISATIE CONFIGURATIE ======
NUXT_PUBLIC_ORGANIZATION_NAME="Fietsersbond Afdeling"
NUXT_PUBLIC_ORGANIZATION_SHORT_NAME="Onderwerpen"
NUXT_PUBLIC_ORGANIZATION_WEBSITE="https://example.fietsersbond.nl/"
NUXT_PUBLIC_ORGANIZATION_CONTACT_URL="https://example.fietsersbond.nl/contact/"
NUXT_PUBLIC_GITHUB_REPO_URL="https://github.com/organization/repo"

# ====== KAART CONFIGURATIE ======
NUXT_PUBLIC_MAP_CENTER_LON=6.1574997
NUXT_PUBLIC_MAP_CENTER_LAT=52.2511467
NUXT_PUBLIC_MAP_INITIAL_ZOOM=13
NUXT_PUBLIC_MAP_SEARCH_BBOX="6.0,52.1,6.3,52.4"

# ====== BRANDING ======
NUXT_PUBLIC_LOGO_PATH="/logo.webp"
NUXT_PUBLIC_LOGO_ALT="Logo"
NUXT_PUBLIC_FAVICON_PATH="/favicon.ico"
```

### Stap 2: Nuxt Config Aanpassen

#### `nuxt.config.ts` uitbreiden

- Alle nieuwe environment variabelen toevoegen aan `runtimeConfig.public`
- Favicon path configurabel maken
- Type conversies toevoegen voor numerieke waarden

### Stap 3: Composables Aanpassen

#### `app/composables/useLocationSearch.ts`

- `biasLat` en `biasLon` vervangen door config waarden
- `viewbox` configurabel maken
- `deventerCoords` vervangen door config waarden
- Hardcoded coördinaten in sorteerfunctie vervangen

#### `app/composables/useMapView.ts`

- Hardcoded center coördinaten vervangen door config waarden

#### `app/composables/useIssueOpenGraph.ts`

- Hardcoded "Fietsersbond" vervangen door config organisatie naam
- Site name configurabel maken

#### `app/composables/useBreadcrumbs.ts`

- "Deventer onderwerpen" vervangen door config waarde

### Stap 4: Components Aanpassen

#### `app/components/Map.client.vue`

- Hardcoded center coördinaten vervangen
- Initieel zoom niveau configurabel maken

#### `app/components/NavBar.vue`

- Logo path configurabel maken
- Logo alt text configurabel maken
- Organisatie naam in header configurabel maken
- Externe links (website, contact) configurabel maken
- Tooltip teksten aanpassen

#### `app/components/Intro.vue`

- Welkomtekst configurabel maken

### Stap 5: Pages Aanpassen

#### `app/app.vue`

- SEO meta title configurabel maken

#### `app/pages/kaart/[id].vue`

- Page titles configurabel maken

### Stap 6: Deployment & Infrastructure

#### `deploy.sh`

- PM2 app naam configurabel maken
- Hardcoded paths vervangen door variabelen
- User path `/home/fietsersbond/` configurabel maken

#### `ecosystem.config.example.cjs`

- App naam configurabel maken
- Database path placeholder generiek maken

### Stap 9: Configuration Helper

#### Nieuwe bestanden toevoegen

- `config/organization.example.json` - Voorbeeld configuratie
- `scripts/setup-organization.js` - Script om configuratie te valideren
- `docs/CONFIGURATION.md` - Uitgebreide configuratie handleiding

---

## 🎯 Resultaat

Na het uitvoeren van alle stappen kunnen nieuwe afdelingen:

1. **Repository clonen**
2. **`.env` bestand aanmaken** met hun specifieke waarden
3. **Logo bestanden vervangen** in `/public/`
4. **Database migraties uitvoeren**
5. **App starten**

De app zal dan volledig branded zijn voor hun organisatie zonder code wijzigingen.

---

## 📝 Extra Overwegingen

### Automated Setup (Optioneel)

- CLI tool voor eerste setup
- Docker container met environment setup
- GitHub template repository maken
