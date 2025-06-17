# NuxtHub Starter Template

Deze starter laat je binnen enkele seconden beginnen met [NuxtHub](https://hub.nuxt.com).

- [Documentatie](https://hub.nuxt.com)

## Functies

- Afbeelding upload met [`hubBlob()`](http://hub.nuxt.com/docs/storage/blob)
- Chat berichten opslaan met [`hubDatabase()`](http://hub.nuxt.com/docs/storage/database)
- Server redirects opslaan met [`hubKV()`](http://hub.nuxt.com/docs/storage/kv)
- Cache een API response met [`cachedEventHandler()`](https://hub.nuxt.com/docs/server/cache)
- Genereer de API documentatie met Scalar binnen de [NuxtHub Admin](https://admin.hub.nuxt.com)

## Setup

Zorg ervoor dat je de dependencies installeert met [pnpm](https://pnpm.io).

```bash
pnpm install
```

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

**Notitie:** Het kaartcentrum wordt automatisch berekend vanuit de `NUXT_PUBLIC_LOCATION_BOUNDS_*` waarden.

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
