# Nulmeting en herstel van kwaliteitscontroles

## Nulmeting op 18 oktober 2026

Basis: upstream `main`, commit `258e1ab474171e9aed88c806188d2f2258fffaa0`.
PR #133 was nog niet samengevoegd en maakt geen deel uit van deze wijziging.

De meting gebruikte Node 22.20.0, pnpm 10.11.0 en de bestaande installatie
volgens de lockfile. Nuxt waarschuwde dat deze Node-versie te oud was.

| Controle | Voor herstel | Na herstel |
| --- | --- | --- |
| `pnpm lint` | 45 fouten en 3 waarschuwingen; exitcode 1 | Geen fouten of waarschuwingen |
| `pnpm typecheck` | 47 TypeScript-diagnoses; exitcode 2 | Geen TypeScript-fouten |
| `pnpm test:run` | 116 tests in 11 bestanden geslaagd | 133 tests in 15 bestanden geslaagd |
| `pnpm test:coverage` | Geslaagd | Geslaagd; alle dekkingspercentages hoger |
| `pnpm build` | Geslaagd met waarschuwingen | Geslaagd met resterende waarschuwingen |

| Dekking | Voor | Na |
| --- | --- | --- |
| Statements | 66,01% | 69,87% |
| Branches | 64,55% | 66,81% |
| Functies | 71,57% | 74,78% |
| Regels | 67,24% | 70,95% |

De volledige lokale logs en afzonderlijke TypeScript-diagnoses staan in
`.local/baseline/`. Dat is een genegeerde lokale werkmap; deze samenvatting
maakt de resultaten ook beschikbaar voor reviewers.

## Oorzaken en oplossingen

- **Lint las TypeScript niet goed.** TypeScript ontbrak als directe dependency.
  Daardoor schakelde Nuxt ESLint de TypeScript-parser niet in. Na het toevoegen
  van de al gebruikte versie verschenen 24 echte lintfouten en 18 waarschuwingen.
  Die vervolgmeting staat afzonderlijk in de lokale logs.
- **Lint vond ongebruikte code en ongeldige templates.** Ongebruikte imports en
  variabelen zijn verwijderd; componentnamen, slotnamen, HTML-tags en sleutels
  zijn gecorrigeerd. De kleine kaartvoorbeelden hebben nu een eigen component,
  zodat hun template geen probleem meer heeft met de scope van de buitenste lus.
- **Typen beschreven alleen opgeslagen onderwerpen.** De selectie en kaartlijst
  bevatten ook concepten en gedeeltelijke kaartgegevens. Die verschillen staan
  nu in de typen, inclusief een nog ontbrekende of gewiste conceptgeometrie.
  Een controle op een bestaand ID veronderstelt niet langer dat alle detailvelden
  aanwezig zijn. Het formulier accepteert ook een concept.
- **Externe typen werden verkeerd gebruikt.** Vuetify-slots leveren de eigenlijke
  categorie via `item.raw`. WebSocket-peers gebruiken het type uit `crossws` en
  berichten krijgen hun type van de handler. Gebruikersgegevens gebruiken het
  bestaande gedeelde type. SQLite-resultaten beschrijven de geselecteerde kolommen.
- **Losse configuratie hoorde niet bij actieve modules.** Instellingen voor
  Nuxt Content en de niet geladen migratiemodule zijn verwijderd. Ook de
  configuratie voor de al uitgeschakelde rate-limitmodule is verwijderd;
  deze PR schakelt geen rate limiting aan of uit. De ongebruikte `nuxt-mdi`-module
  is verwijderd omdat de meegeleverde Vue-code niet typecheckt; de gebruikte
  Vuetify- en Nuxt Icon-weergave blijft bestaan.
- **Enkele fouten hadden merkbaar gedrag.** Bij verwijdering van het geselecteerde
  onderwerp leest de app nu het ID uit het bericht en gaat terug naar de kaart.
  Categorieën worden correct weergegeven. Zoekresultaten worden als tekst escaped
  voordat de app eigen markeringstags toevoegt; tekst kan daardoor geen HTML uitvoeren.
  Voor deze wijzigingen zijn eerst het bestaande gedrag en daarna falende
  regressietests vastgelegd.
- **Bewuste HTML-weergave blijft mogelijk.** Introductietekst en omschrijvingen
  worden op de server gevalideerd of gesanitized. De lokale lintuitzonderingen
  verwijzen naar die verwerking. Zoekmarkeringen hebben een aparte, geteste
  escapingstap. De regel is niet globaal uitgezet.

## Controles uitvoeren

Gebruik de Node-versie uit `.nvmrc` (22.22.0) en pnpm 10.11.0:

```sh
nvm use
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test:run
pnpm test:coverage
pnpm build
```

Het herstel is gecontroleerd met Node 22.22.0 uit een tijdelijke lokale installatie,
zonder de systeeminstallatie van Node te veranderen. De frozen installatie is
geverifieerd op de bestaande checkout; dit is geen bewijs van een volledig nieuwe
checkout op een andere machine.

CI gebruikt dezelfde Node-versie, een frozen installatie, lint, typecheck, tests
met coverage en de productiebouw. Coverage voert de tests al uit; daarom draait
CI de gewone testsuite niet nogmaals. `pnpm lint` accepteert geen waarschuwingen.
Repository-instellingen voor verplichte checks zijn niet aangepast.

## Resterende meldingen en grenzen

De controles slagen, maar er zijn nog niet-blokkerende Nuxt/buildmeldingen:

- De bestaande rate-limitmodule ondersteunt Nuxt 4 niet en blijft uitgeschakeld.
- Vuetify en Nuxt bieden allebei een `useLayout`-auto-import aan.
- De CSS-minifier meldt bestaande `:deep`-selectors; de bundler meldt chunkgroottes
  en een dubbele statische/dynamische import in de authenticatiemodule.
- SQLite meldt dat de Node-API experimenteel is. De installatie meldt bestaande
  peer-dependencyverschillen voor onder andere authenticatie/mail en Pinia.

Die meldingen zijn geen TypeScript- of lintfouten en zijn niet verstopt door checks
uit te schakelen of gegenereerde Nuxt-configuratie te wijzigen. Het oplossen van
modulecompatibiliteit, bundeloptimalisatie en dependency-upgrades vraagt een
apart beoordeelde wijziging.

De lokale app op `http://localhost:3000/kaart` is daarnaast geopend en gerenderd;
na het laden waren er geen browserconsole-errors. Dit was een beperkte rooktest,
geen volledige browsertest van opslaan, verwijderen of authenticatie.
