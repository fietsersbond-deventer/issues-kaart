# Testen

Gebruik de Node.js-versie uit `.nvmrc` (`nvm use`) en pnpm 10.11.0.
Installeer bij een nieuwe checkout eerst de afhankelijkheden met
`pnpm install --frozen-lockfile`.

## Commando's

```sh
pnpm test:run                                  # alle unit- en componenttests
pnpm exec vitest run tests/issueRoutes.test.ts  # één testsuite
pnpm test                                     # herhalen bij wijzigingen
pnpm test:coverage                            # tests met dekkingscontrole
pnpm lint
pnpm typecheck
pnpm build
```

## Tests schrijven

- Test waarneembaar gedrag: geslaagde acties, foutafhandeling en randgevallen.
- Breid bij voorkeur een bestaande suite in `tests/` uit. Voeg bij een bugfix
  een regressietest toe en controleer dat die om de juiste reden faalt.
  Maak daarna de kleinste oplossing en behoud de test.
- Draai na een wijziging de relevante suite en de volledige dekkingscontrole.
  Verwijder geen falende tests of broncode uit de meting om controles te laten slagen.
- Controleer vóór oplevering ook lint, types en de build.

## Testconfiguratie

`vitest.config.ts` laat tests standaard in Node.js draaien. Componenttests
gebruiken `// @vitest-environment jsdom` om een browseromgeving na te bootsen.
De Vue-plugin maakt `.vue`-bestanden leesbaar voor de testrunner.

- `~` en `@` verwijzen naar `app/`; `~~` verwijst naar de projectmap.
- `#imports` en `#components` gebruiken de kleine Nuxt-adapters in
  `tests/helpers/nuxt.ts`. Zo kunnen tests draaien zonder de volledige Nuxt-app.
  `vue-router` wordt vanuit Nuxt geladen, zodat dezelfde versie wordt gebruikt.
- In tests wordt `import.meta.client` vervangen door een controle op `window`.
  Browsercode draait daardoor in jsdom-tests en wordt in Node-tests overgeslagen.
- Vite verwerkt ook `vue3-openlayers` en `vuetify`, zodat hun imports en CSS
  in integratietests werken.

## Testdekking

Statements, branches, functies en regels moeten **elk minimaal 80%** dekking
halen. Dit is een ondergrens voor het hele project; test nieuwe functionaliteit
ook inhoudelijk, inclusief relevante foutpaden.

`vitest.config.ts` bepaalt welke bronbestanden meetellen: code in `app/`,
`server/`, `shared/` en `scripts/`, inclusief migraties en uitvoerbare typeguards.
Ook bestanden zonder tests tellen mee. Declaraties en expliciet genoemde
bestanden met alleen types zijn uitgezonderd. Voeg nieuwe mappen met
uitvoerbare code toe aan de configuratie.

Vitest meet de dekking met V8 en toont een samenvatting in de terminal.
Bekijk het rapport in `coverage/index.html`. JSON-rapporten staan in
`coverage/coverage-final.json` en `coverage/coverage-summary.json`.

## CI

`.github/workflows/ci.yml` draait bij pushes en pull requests naar `main` en
`develop`. Na installatie volgen lint, typecheck, tests met dekkingscontrole
en de build. De Playwright-code wordt ook typegecontroleerd; browserinstallatie
en E2E-uitvoering zijn uit deze PR/MR-workflow gehaald. Zie [browsertests](e2e.md)
voor lokale reproductie en debugging. Als een stap faalt, stoppen de volgende stappen.

De workflow uploadt momenteel geen coverage-rapporten. Er is dus geen
artifactopslag of bewaartermijn voor deze rapporten ingesteld.

## Waar staan de tests?

Alle suites staan in `tests/`. Enkele startpunten:

| Onderdeel | Tests (zonder `.test.ts`) |
| --- | --- |
| Inloggen, rechten en wachtwoorden | `authRoutes`, `adminRoutes`, `refreshTokens`, `passwordPages` |
| Meldingen opslaan, zoeken en filteren | `issueRoutes`, `serviceRoutes`, `searchViews`, `filter` |
| Bewerken, formulieren en selectie | `editor`, `selectedIssue`, `issueState`, `forms` |
| Realtime samenwerken | `realtimeServer`, `websocketRoutes`, `websocketClients`, `liveStores` |
| Kaart en geometrie | `Map*`, `issueMap*`, `mapControls`, `mapLifecycle`, `boundsGuards` |
| Beheer en interface | `adminPages`, `categoryDialogs`, `applicationShell`, `presentationComponents` |
| Migraties en imports | `migrations`, `importWorkflow`, `areasCommand` en KML-tests |

## Isolatie en grenzen

- Gebruik SQLite in het geheugen; migratie- en importtests gebruiken tijdelijke
  bestanden of databases. Gebruik nooit persoonlijke of productiedata als testdata.
- Vervang externe diensten zoals e-mail, geocoders, kaarttegels, analytics en
  afbeeldingsdownloads aan de rand van de applicatie. Tests moeten zonder die diensten werken.
- Gebruik `tests/helpers/server.ts` voor routehandlers, `tests/helpers/vue.ts`
  voor Vue/Pinia en `tests/helpers/nuxt.ts` voor Nuxt-adapters. Routetests gebruiken
  echte migraties en controleren opgeslagen gegevens en verstuurde events.
- Ruim componenten, stores, listeners, databases en tijdelijke bestanden op.
  Herstel globale waarden, omgevingsvariabelen en gesimuleerde timers na elke test.

Unit- en componenttests gebruiken echte Vue-status en OpenLayers-geometrie,
maar vereenvoudigde UI-adapters. Ze vervangen geen browsertests voor lay-out,
widgets of de volledige inlogstroom via HTTP. CI-instellingen en
branchbeveiliging moeten apart worden gecontroleerd.

## Linting en formatteren

Het lintbeleid, de configuratie en de commando's staan in
[linting en formatteren](linting.md).
