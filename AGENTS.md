# Instructies voor agents

## Communicatie

- Communiceer kort en feitelijk. Vermijd opsmuk en onnodig jargon.
- Alle variables en functie namen moeten in het Engels geschreven worden.
- Schrijf commitberichten en PR's in het Nederlands. Gebruik Engels voor technische beschrijvingen als Nederlands onnatuurlijk klinkt; behoud namen in code en commando's.

## Lokale ontwikkeling en controles

- Gebruik de Node.js-versie uit `.nvmrc` (`nvm use`) en pnpm 10.11.0.
- Installeren: `pnpm install --frozen-lockfile`.
- Maak `.env` op basis van `.env.example` zonder een bestaande `.env` te overschrijven. Stel lokale geheimen in en laat `NUXT_DB_PATH` verwijzen naar het absolute pad van een lokale SQLite-database. Voer daarna `pnpm run migrate` uit.

## Control lokale versie

- Starten: `pnpm run dev`; open `http://localhost:3000`.
- Inloggen: `http://localhost:3000/login`, met een account in de lokale database. Werkende lokaleinloggegevens mag in `.data/local-login.json` worden gevonden.

## Run unit tests

- Tests eenmalig: `pnpm run test:run`; automatisch bij wijzigingen: `pnpm run test`; gericht testen: `pnpm exec vitest run tests/<bestand>.test.ts`.
- Lint- en formattercontrole: `pnpm run lint`. Automatisch corrigeren: `pnpm run lint:fix`; controleer daarna de diff. Typecontrole: `pnpm run typecheck`.
- Zie [linting en formatteren](docs/linting.md) voor configuratie, bereik en onderhoud. Lees dit document voordat je lintregels of de formatterconfiguratie wijzigt.
- Zie [testen](docs/testing.md) voor testconfiguratie, isolatie en coverage-eisen.

### TDD

- Voer vóór oplevering van codewijzigingen relevante tests, lint- en typecontroles uit. Vermeld de resultaten en welke controles niet zijn uitgevoerd.
- Schrijf geen specifike test voor een issue of een bug. Schrijf liever nieuwe testen in bestande unit test suites. Als er echt geen andere tests zijn, dan mag je wel een nieuwe bestand maken.
- Implementeer de kleinste wijziging die de test laat slagen. Verbeter daarna de codestructuur terwijl de tests blijven slagen.
- Test waarneembaar gedrag en relevante randgevallen. Behoud bij bugfixes de regressietest. Wijzigingen die alleen documentatie betreffen vereisen geen nieuwe tests.

## Commits

- Volg [Conventional Commits 1.0.0-beta.2](https://www.conventionalcommits.org/en/v1.0.0-beta.2/#specification): `<type>[optionele scope]: <Nederlandse beschrijving>`.
- Gebruik `feat` voor nieuwe functionaliteit, `fix` voor bugfixes en passende typen zoals `docs`, `test`, `refactor` of `chore` voor overige wijzigingen.
- Voorbeeld: `fix(kaart): herstel de weergave van markers`.
- Scheid een optionele toelichting en voettekst met lege regels. Beschrijf incompatibele wijzigingen in een toelichting of voettekst die begint met `BREAKING CHANGE: `. Voeg waar relevant verwijzingen naar issues toe.

## PR-sjabloon

Gebruik dit sjabloon in het Nederlands; gebruik Engels voor technische beschrijvingen als dat duidelijker is. Vermeld wanneer testen of screenshots niet van toepassing zijn.

```markdown
## Context

<!-- Probleem, doel en gerelateerd issue. -->

## Technische wijzigingen

<!-- Wat is gewijzigd en waarom. -->

## Testen

<!-- Uitgevoerde commando's en resultaten; vermeld niet-uitgevoerde checks. -->

## Screenshots

<!-- Voor/na bij zichtbare wijzigingen, anders n.v.t. -->
```
