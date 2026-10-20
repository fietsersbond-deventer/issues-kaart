# Linting en formatteren

`pnpm lint` controleert code met ESLint en controleert daarna de afgesproken
opmaak met Prettier. De CI gebruikt hetzelfde commando. TypeScript-typecontrole
blijft een aparte stap: `pnpm typecheck`. Voor teststrategie, coverage en de
volledige CI-volgorde, zie [testen](testing.md).

## Dagelijks gebruik

Volg eerst de installatie-instructies in de [README](../README.md).
De postinstall-stap (`nuxt prepare`) maakt de Nuxt-configuratie die ESLint nodig heeft.

| Commando | Wat gebeurt er? | Wijzigt bestanden? |
| --- | --- | --- |
| `pnpm lint` | ESLint over de checkout, daarna `pnpm format:check`; waarschuwingen laten de controle falen. | Nee |
| `pnpm lint:fix` | ESLint past beschikbare fixes toe, daarna draait `pnpm format`. | Ja |
| `pnpm format:check` | Alleen Prettier-controle van de vijf geselecteerde bestanden hieronder. | Nee |
| `pnpm format` | Alleen Prettier-opmaak van diezelfde vijf bestanden. | Ja |
| `pnpm typecheck` | Nuxt/TypeScript controleert typen; dit staat los van ESLint. | Nee, afgezien van gegenereerde Nuxt-bestanden |

De vervolgstap na `&&` draait alleen als de eerste stap slaagt. Blijft ESLint bij
`lint:fix` een niet automatisch herstelbare fout melden, los die dan eerst op of
voer `pnpm format` afzonderlijk uit. Controleer de diff na automatisch corrigeren
en draai daarna `pnpm lint`.

## Welke configuratie doet wat?

| Bestand | Rol | Zelf aanpassen? |
| --- | --- | --- |
| `eslint.config.mjs` | Het ingangspunt: neemt Nuxts basis over en voegt onze regels en importgrenzen toe. | Ja, hier wijzigen we lintbeleid. |
| `.nuxt/eslint.config.mjs` | Door Nuxt gegenereerde regels, parsers voor TS/Vue en namen van auto-imports. | Nee; opnieuw maken met `pnpm exec nuxt prepare`. |
| `tsconfig.eslint.json` | Klein TypeScript-project waarmee ESLint de typen in `shared` kan opzoeken. | Alleen als het bereik van typed linting verandert. |
| `tsconfig.json` | De bestaande Nuxt-appconfiguratie voor TypeScript. | Geen vervanging voor het lintproject; dit heeft een ander doel. |
| `package.json` | De lint-/formatteercommando's, de lijst te formatteren bestanden en de exacte Prettier-versie. | Ja; houd `format` en `format:check` gelijk. |
| `tests/eslintConfig.test.ts` | Voert geldige en ongeldige voorbeelden door de echte ESLint-configuratie. | Ja, bij beleidswijzigingen. |
| `.github/workflows/ci.yml` | Roept hetzelfde `pnpm lint` aan als lokaal. De volledige pipeline staat in [testen](testing.md#ci). | Alleen als de CI-stappen veranderen. |

Er is geen aparte Prettier-configuratie: we gebruiken de standaardinstellingen
van de vastgelegde versie, waaronder twee spaties, dubbele quotes en puntkomma's.
Het lintproject genereert geen JavaScript (`noEmit`) en breidt bewust geen
Nuxt-tsconfig uit. Daardoor hoeft ESLint voor shared-code niet de hele app met
gegenereerde declaraties te laden. `types: []` voorkomt automatisch geladen
ambient typepakketten; de bibliotheken ES2022 en DOM zijn wel beschikbaar.

## Welke regels gelden waar?

`withNuxt(...)` combineert de gegenereerde basis met onze configuratieblokken.
Een bestand krijgt alle blokken waarvan het `files`-patroon overeenkomt.
Deze projectregels komen dus boven op de bestaande Nuxt-regels:

| Blok in `eslint.config.mjs` | Bereik | Toegevoegde controle |
| --- | --- | --- |
| `project/typescript-policy` | Alle niet genegeerde TS/TSX/MTS/CTS- en Vue-bestanden, ook tests, scripts en toekomstige E2E-/lintregelbestanden. | Geen expliciete `any`, `@ts-ignore` of `@ts-nocheck`; `@ts-expect-error` vereist minimaal tien tekens uitleg. |
| `project/browser-boundaries` | TS/JS/Vue in `app`, TS/JS in `shared`. | Geen statische runtime-imports of re-exports van servercode, server-only pakketten of Node-built-ins. |
| `project/shared-boundaries` | TS/JS in `shared`. | Dezelfde grenzen, plus geen app-code of Nuxt-appimports zoals `#app` en `#imports`. |
| `project/shared-type-safety` | Alleen `shared/**/*.ts`. | Vier regels die type-informatie nodig hebben; zie hieronder. |

Daarnaast zijn ongebruikte ESLint-suppressies fouten. Gegenereerde bestanden en
andere Nuxt-ignores vallen onder de basisconfiguratie; onze extra ignores zijn
`coverage/**`, `playwright-report/**` en `test-results/**`.

De vier typed regels hebben ieder een eigen taak:

| Regel (`@typescript-eslint/…`) | Voorbeeld van een probleem |
| --- | --- |
| `no-floating-promises` | Een promise wordt gestart zonder afhandeling. |
| `no-misused-promises` | Een async callback wordt gebruikt waar de ontvanger een callback met `void` verwacht. |
| `no-unsafe-assignment` | Een waarde met type `any`, bijvoorbeeld uit `JSON.parse`, stroomt ongecontroleerd verder. |
| `no-unsafe-member-access` | Code leest bijvoorbeeld `.payload` van een waarde met type `any`. |

Deze vier regels gelden momenteel **alleen voor shared TypeScript**. De
syntactische regels gelden wel voor alle bovengenoemde TS/Vue-scopes. Een brede
proef vond 182 typed diagnostics in de overige code; verdere invoering is gekoppeld
aan het herstellen van die runtimecontracten (Task 4). Een geslaagde lintcontrole
betekent dus niet dat alle promises of alle onveilige waarden in de app en server
zijn gecontroleerd. Evenmin bewijst het lintproject welke bestanden het aparte
`pnpm typecheck` controleert.

## Importgrenzen met voorbeelden

Browsercode mag gedeelde code importeren. Type-only imports uit servercode en
server-only pakketten zijn toegestaan voor bestaande DTO's en interfacetypen:

```ts
// Toegestaan in app-code: de type-import bevat geen server-runtimecode.
import type { Legend } from "~~/server/database/schema";
import type { H3Event } from "h3";

// Afgewezen in app en shared.
import { getDb } from "~~/server/utils/db";
import fs from "node:fs";
export { default as mail } from "nodemailer";

// Afgewezen in shared: shared mag niet van de Nuxt-app afhangen.
import { useState } from "#imports";
```

Ook Node-imports zonder `node:`-prefix, zoals `fs/promises`, zijn verboden. Voor
Node-built-ins geldt geen uitzondering voor type-only imports. Server-only
pakketten zijn expliciet opgesomd in `serverPackages`; deze lijst is geen
automatische analyse van alle transitieve dependencies.

De regels controleren statische imports en re-exports. Ze controleren geen
dynamische imports, `require`-aanroepen of de inhoud van netwerkberichten.
Runtimevalidatie en autorisatietests blijven daarvoor nodig.

## Waarom formatteert Prettier maar vijf bestanden?

De bestaande repository is niet overal op dezelfde manier opgemaakt. We beginnen
met een beperkte lijst om een grote diff met alleen opmaak te voorkomen:

- `eslint.config.mjs`
- `tsconfig.eslint.json`
- `tests/eslintConfig.test.ts`
- `app/composables/useMapResize.ts`
- `server/api/profile.post.ts`

ESLint controleert wel de hele niet genegeerde checkout. Deze lijst beperkt
uitsluitend Prettier. Breid hem stapsgewijs uit en wijzig beide commando's in
`package.json` samen; neem de bijbehorende opmaakwijzigingen bewust in de diff op.

## Beleid aanpassen of een fout onderzoeken

1. Bekijk de effectieve regels voor het concrete bestand:

   ```bash
   pnpm exec eslint --print-config app/components/Map.client.vue
   pnpm exec eslint --print-config shared/types/WebSocketMessages.ts
   ```

2. Wijzig het juiste projectblok in `eslint.config.mjs`. Flat config combineert
   regelopties niet inhoudelijk: een later blok vervangt de eerdere instelling
   voor dezelfde regel. Daarom herhaalt `project/shared-boundaries` de volledige
   lijst voor `no-restricted-imports`, inclusief de browsergrenzen.
3. Voeg toegestane én verboden voorbeelden toe aan `tests/eslintConfig.test.ts`.
   Typed voorbeelden gebruiken een bestaand shared-pad, zodat het bestand in het
   lintproject valt. Als een bestand buiten dat project valt, breid dan bewust
   zowel het typed `files`-patroon als het lintproject uit.
4. Voer de gerichte tests en controle uit:

   ```bash
   pnpm exec vitest run tests/eslintConfig.test.ts
   pnpm lint
   ```

Ontbreekt `.nuxt/eslint.config.mjs`, voer dan `pnpm exec nuxt prepare` uit.
Bewerk dat gegenereerde bestand niet: een volgende prepare-stap overschrijft het.
De backslashes voor `#app`, `#imports` en `#server` in importpatronen zijn bewust:
zonder escape kan de patroonverwerking `#` als commentaar behandelen.

## Uitzonderingen en bewust niet toegevoegde regels

De Quill-blot in `app/utils/streetViewEmbedBlot.ts` heeft één lokale, uitgelegde
`any`-uitzondering. `Quill.import` levert geen bruikbaar constructortype voor deze
uitbreiding. Verwijder de uitzondering zodra de wrapper een bruikbaar type
exporteert of een geteste adapter dit vervangt. Er is één registratiemodule en
geen herhaald verkeerd gebruik; daarom is er geen extra Quill-importregel.
`IBounds` gebruikt structurele guards op `unknown`; map-resize en de profiel-IP-helper
hebben concrete types. Hun eerdere `any`-uitzonderingen zijn verwijderd.

Er is geen eigen ESLint-plugin. De voorgestelde regel tegen WebSocket-messagecasts
wacht op een validerende decoder: één spelling van een cast verbieden valideert
geen payload. De voorgestelde auth-guardregel is ook niet toegevoegd. Beschermde
mutaties gebruiken de gedeelde `requireUserSession`-/`requireAdminSession`-guards;
`issueRoutes`, `adminRoutes` en `serviceRoutes` testen het 401/403-gedrag, inclusief
categorie- en tekstmutaties vóór databasewerk.

De beoordeelde guardset omvat issue-, categorie-, tekst-, tag- en
admin-gebruikermutaties en Street View parsing. Login, refresh, wachtwoordcontrole,
reset request/confirm en de Matomo-profielproxy hebben eigen publieke contracten.
Een syntactische regel zou die autorisatiecontroles niet vervangen. Omdat er geen
custom regel is, zijn RuleTester-cases voor een eigen plugin niet van toepassing;
de effectieve-configtests bewaken het aangenomen lintbeleid.
