# Browsertests

Gebruik Node uit `.nvmrc` (`nvm use`) en pnpm 10.11.0:

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm test:e2e
```

`test:e2e` controleert eerst de typen van de Playwright-code, migreert een nieuwe
SQLite-database in de tijdelijke systeemmap, bouwt Nuxt en start de productie-server
op `http://127.0.0.1:3100`. Die poort moet vrij zijn; een bestaande server wordt
nooit hergebruikt. De database wordt bij afsluiten verwijderd. De eigen `.env`
en lokale database worden niet gebruikt voor de build of app-server. De
migratiecode kan `.env` laden, maar het databasepad staat vooraf vast in het proces.

Er is bewust één worker, zonder retries. Vóór **iedere test** worden de database
én de SMTP-uitvoer teruggezet. Een test kan dus afzonderlijk worden uitgevoerd;
mutaties uit eerdere tests zijn geen voorwaarde. Er zijn geen fixture-endpoints
in de applicatie. `.output/e2e-runtime.json` verbindt de testfixtures met de
unieke tijdelijke map van de launcher; fixtures weigeren paden daarbuiten.

Accounts: `admin@example.test` (admin), `user@example.test` en `reset@example.test`
(user), alle met wachtwoord `E2e-password-123!`. Er zijn twee categorieën, twee
tags en drie onderwerpen met point-, line- en polygon-geometrie. Deze gegevens
zijn uitsluitend voor tests. De reset-flow heeft een eigen account.

De launcher start een SMTP-opvanger op een vrije lokale poort. De echte reset-API
verstuurt mail via Nodemailer naar deze opvanger; de test leest de resetlink uit
de ontvangen mail. Er wordt geen externe mailprovider gebruikt. Alleen voor het
verlopen-tokengeval plaatst de test rechtstreeks een verlopen token in de test-DB.

Externe kaartafbeeldingen krijgen HTTP 204, Nominatim krijgt een lege lokale
response en overige externe HTTP-verzoeken worden afgebroken. App-API's blijven
echt, behalve één expliciete 503-injectie bij de foutscenario-test voor opslaan.
WebSockets verbinden met de echte server; de samenwerkingstests verbreken tijdelijk
het transport en laten de app zelf opnieuw verbinden. Ze fabriceren geen berichten.

## Page Object Model

De specs beschrijven scenario's en controleren zichtbaar gedrag, URL's en
persistente API-gegevens. UI-selectors en herbruikbare acties staan in:

- `e2e/pages/`: login, wachtwoordherstel, kaart, lijst en de vier beheerpagina's.
- `e2e/components/`: navigatie, onderwerpdetails, editor, kaartcanvas en filters.
- `e2e/support/`: tijdelijke runtimepaden, externe-service-isolatie, API-login,
  SMTP-uitvoer, verlopen resettokens en WebSocket-onderbreking.

Gebruik de testfixture `app` voor de huidige pagina. `createPages(page)` maakt
dezelfde objecten voor een extra tab. De factory-fixture `secondUser()` opent
een geïsoleerde context, blokkeert externe diensten en logt in als de tweede
gebruiker. De fixture sluit alle aangemaakte contexts na de test; een test mag
een context eerder sluiten om disconnectgedrag te controleren.

```ts
import { test, expect } from "./fixtures.js";

test("onderwerp bewerken", async ({ app }) => {
  await app.loginPage.login();
  await app.issueMap.editIssue(101);
  await app.issueMap.editor.title.fill("Nieuwe titel");
  await app.issueMap.editor.saveSuccessfully("PATCH");
  await expect(app.issueMap.details.heading("Nieuwe titel")).toBeVisible();
});
```

Page objects gebruiken compositie en benoemde locators; er is geen algemene
basisklasse. `loginPage.submit()` en `editor.submit()` eisen geen succes, zodat
negatieve scenario's dezelfde acties gebruiken. `loginPage.login()` en
`editor.saveSuccessfully()` wachten wel op een geslaagde overgang. Registreer
responsewachten en foutinjecties vóór de actie; houd scenarioassertions in de
spec. `editor.delete(false)` annuleert de native bevestiging en
`editor.delete(true)` accepteert die. Tekenen en markerselectie blijven echte
canvasinteracties, zonder Vue/Pinia-state te lezen.

## Flowgroepen

Er zijn vijftien scenario's voor de tien groepen:

| Groep | Bestand | Gedrag |
| --- | --- | --- |
| 1 | `e2e/auth.spec.ts` | Fout/geldig wachtwoord, sessiebehoud na herladen, uitloggen en verlies van toegang tot beheer |
| 2 | `e2e/issues.spec.ts` | Punt, lijn en vlak tekenen met muisklikken; categorie/tags; opslaan, herladen en persistente API-/lijstgegevens |
| 3 | `e2e/issues.spec.ts`, `e2e/navigation.spec.ts` | Tekst/categorie/tags/geometrie wijzigen; annuleren; verplichte titel; falende save behoudt concept; opslaan; mobiele editor |
| 4 | `e2e/navigation.spec.ts` | Lijst naar kaart, directe links, back/forward, onbekend ID, laagvoorkeur na herladen, extentknop en mobiel paneel |
| 5 | `e2e/navigation.spec.ts` | Lijstzoekopdracht/lege resultaten; gecombineerde categorie/tagfilters op kaart, reset, lege kaartselectie en URL-behoud bij klikken op werkelijk gerenderde marker |
| 6 | `e2e/collaboration.spec.ts` | Twee gebruikers, zichtbare lock-eigenaar, concurrerende editor, annuleren, reconnect en vrijgave na afsluiten |
| 7 | `e2e/collaboration.spec.ts` | Echte create/update/delete in een tweede browser; lijst/kaart/details verversen; gemiste update ophalen na reconnect; geen dubbele kaartitems |
| 8 | `e2e/issues.spec.ts` | Verwijderbevestiging annuleren/accepteren, persistent verdwijnen, unauthenticated mutaties en verboden admin-actie |
| 9 | `e2e/admin.spec.ts` | Rol wijzigen; categorie/tag/tekst beheren; ongeldige categorie en verwijdering van gebruikte categorie geweigerd; rolgrenzen |
| 10 | `e2e/password-reset.spec.ts` | Mail ontvangen, resetlink, nieuw wachtwoord, oud wachtwoord geweigerd, verlopen/hergebruikte/ongeldige links en gelijke melding voor onbekend account |

Groepen 4 en 5 draaien op desktop (1440×1000) en mobiel (390×844). De marker-test
zoekt de rode fixturemarker in de werkelijke canvaspixels en klikt die aan; hij
leest geen Vue/Pinia-state en gebruikt geen kaart-screenshot als enige bewijs.

De tests volgen de bestaande productrechten: categorieën en teksten zijn voor
alle ingelogde gebruikers beschikbaar; gebruikers- en tagbeheer zijn admin-only.
Vrije tekst zoeken staat in de lijst, categorie/tagfilters staan op de kaart.
Er is momenteel geen gedeelde vrije-tekst/categorie/tagfilter over beide pagina's;
de tests voegen zo'n nieuwe productfunctie niet toe. Ook reset-extent wordt via
de zichtbare knop getest, zonder een exacte zoomwaarde vast te leggen.

## Gerichte uitvoering en rapporten

```sh
pnpm test:e2e:ci                              # volledige headless reproductierun
pnpm test:e2e e2e/collaboration.spec.ts
pnpm test:e2e --grep '9 —'
pnpm test:e2e --repeat-each=2
pnpm typecheck:e2e
pnpm exec playwright show-report
```

De PR/MR-workflow voert lint, typechecks, unit-tests met coverage en de build uit.
Chromium installeren en E2E uitvoeren horen uitsluitend bij de deploymentpipeline;
de koppeling met die deploymenttrigger moet nog worden ingesteld. De lokale
HTML-/JUnit-rapporten, failure-screenshots en traces staan in `playwright-report/`
en `test-results/` (beide genegeerd door Git).

## Een pipelinefout lokaal reproduceren

1. Noteer de commit-SHA en de falende testnaam/bestandsregel uit de Actions-run.
   Gebruik die exacte commit in een aparte checkout; een nieuwere branch kan de
   fout al hebben veranderd.
2. Voer `nvm use`, `pnpm install --frozen-lockfile` en
   `pnpm exec playwright install chromium` uit. Node, pnpm, app en browser komen
   daarmee uit dezelfde vastgelegde versies als in de pipeline.
3. Download het artifact `playwright-results` uit die run en pak het uit in een
   aparte map, bijvoorbeeld `/tmp/issues-kaart-ci-failure`. Bewaar dit buiten
   `test-results/`: een nieuwe testrun maakt die lokale uitvoermap opnieuw aan.
4. Open het HTML-rapport en de trace van de falende test:

```sh
pnpm exec playwright show-report /tmp/issues-kaart-ci-failure/playwright-report
pnpm exec playwright show-trace /tmp/issues-kaart-ci-failure/test-results/<testmap>/trace.zip
```

De trace bevat de acties, DOM-snapshots en netwerkrequests op het foutmoment.
Daarmee kun je ook een fout onderzoeken die alleen op de Linux-runner optreedt.
Een lokale macOS- of Windows-run gebruikt hetzelfde scenario, maar is geen
exacte kopie van het Linux-besturingssysteem.

Herhaal vervolgens uitsluitend de falende test, eerst headless en daarna met
Playwright Inspector (vervang de voorbeeldnaam door de test uit het rapport):

```sh
pnpm test:e2e:ci e2e/collaboration.spec.ts --grep '6 —'
pnpm test:e2e:debug e2e/collaboration.spec.ts --grep '6 —'
```

`pnpm test:e2e:ci` voert standaard alle vijftien scenario's headless uit met één
worker, zonder retries en met de normale timeouts. Het gebruikt dezelfde
Playwright-configuratie en typecontrole als `test:e2e`, weigert `test.only` en
neemt voor iedere test een trace op, ook als die slaagt. Rapporten en traces
staan in `playwright-report/` en `test-results/`. Je kunt een bestand, `--grep`
of `--last-failed` meegeven om de reproductie te beperken. Dit commando is ook
het toekomstige ingangspunt voor de deploymentpipeline; er is nu geen
automatische E2E-run in CI.

`test:e2e:debug` opent Chromium en Inspector om acties stap voor stap uit te voeren;
de testtimeout staat in deze modus uit. De server heeft nog steeds maximaal
240 seconden om te bouwen en te starten. Beide commando's maken dezelfde
geïsoleerde fixtures, lokale SMTP-opvanger en productiebuild als de pipeline.
Er is geen bestaande lokale server of productiedatabase nodig.

Na een lokale mislukte run kun je de falende tests herhalen met
`pnpm test:e2e:ci --last-failed`, of interactief met
`pnpm test:e2e:debug --last-failed`. Dit gebruikt het lokale bestand
`test-results/.last-run.json`; het selecteert tests opnieuw en herstelt geen
oude database- of browsersessie. `pnpm test:e2e --headed` toont de browser zonder
stap-voor-stap Inspector.

De bestaande negatieve controle met een bewust verkeerd wachtwoord bevestigde
dat de loginflow faalt en screenshot/trace oplevert. Regressies in deze uitbreiding
zijn eerst rood en daarna groen getest in bestaande unit-suites: ontbrekende
onderwerpen, reconnect-herstel, realtime lijstresultaten, categorie-reactiviteit
en dubbele tags. De geldige browsertests blijven zonder skips of retries draaien.

Configuratie en transportonderbreking volgen de officiële Playwright-documentatie:
[webServer](https://playwright.dev/docs/test-webserver) en
[WebSocketRoute](https://playwright.dev/docs/api/class-websocketroute).
Vitest behoudt zijn standaard testpatronen en sluit `e2e/` uit.
