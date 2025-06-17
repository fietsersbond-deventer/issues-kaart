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
LOCATION_NAME=JouwStadNaam

# Locatie Zoekgebied (voor het beperken van zoekresultaten tot interessegebied)
LOCATION_BOUNDS_WEST=6.0
LOCATION_BOUNDS_SOUTH=52.1
LOCATION_BOUNDS_EAST=6.3
LOCATION_BOUNDS_NORTH=52.4

# Minimale Bounding Box (voorkomt excessief inzoomen als er geen issues zijn)
LOCATION_MIN_BBOX_WEST=6.1109776821179045
LOCATION_MIN_BBOX_SOUTH=52.23674680068737
LOCATION_MIN_BBOX_EAST=6.224405294943567
LOCATION_MIN_BBOX_NORTH=52.29330327072566
```

**Configuratie Parameters:**

- `LOCATION_NAME`: De naam die wordt getoond in de applicatie UI (bijv. "Amsterdam", "Rotterdam")
- `LOCATION_BOUNDS_*`: Definieert de bounding box voor zoekresultaten om te focussen op jouw interessegebied
- `LOCATION_MIN_BBOX_*`: Minimale bounding box om excessief inzoomen te voorkomen wanneer er geen issues aanwezig zijn

**Notitie:** Het kaartcentrum wordt automatisch berekend vanuit de `LOCATION_BOUNDS_*` waarden.

**Je Coördinaten Vinden:**

1. Ga naar [OpenStreetMap](https://www.openstreetmap.org/)
2. Navigeer naar je gewenste locatie
3. Klik rechts en selecteer "Toon adres" om coördinaten te krijgen
4. Definieer bounds die jouw interessegebied omvatten voor `LOCATION_BOUNDS_*`

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

