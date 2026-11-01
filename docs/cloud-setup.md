# Setup voor agents

Vereist: Bash, Node uit `.nvmrc`, pnpm uit `package.json#packageManager`, toegang
tot npm en toestemming voor lokale TCP/IPC-sockets. Als nvm aanwezig is, laadt
het setupscript dit automatisch. Installeer ontbrekende tools vooraf in het
cloudimage.

```sh
bash scripts/setup-agent.sh               # installeren, configureren, migreren, lokaal account
bash scripts/setup-agent.sh --validate    # ook lint, types, coverage, build en HTTP-login
bash scripts/setup-agent.sh --with-e2e    # ook Chromium + systeemlibraries en browsertests
```

Setup werkt vanuit iedere directory en stopt bij de eerste fout. Herhalen behoudt
`.env`, geheimen, accounts en bestaande data. Dependencies worden met de frozen
lockfile geïnstalleerd. Een nieuwe `.env` krijgt willekeurige geheimen, een
absoluut pad naar `.data/development.sqlite3` en een lokale `AUTH_ORIGIN`.
De lokale admincredentials staan in `.data/local-login.json`. Beide bestanden
worden met rechten 0600 aangemaakt en zijn genegeerd door Git.

Een bestaande `.env` wordt gecontroleerd en nooit herschreven. Het databasepad
moet rechtstreeks in de eigen `.data` liggen; afwijkende geërfde `NUXT_DB_PATH`,
symlinks en conflicterende accountgegevens geven een fout. Los die fout handmatig
op; het script reset geen wachtwoorden. Externe mail is niet geconfigureerd.

Na setup: `pnpm run dev`, open http://localhost:3000/login. Stop de devserver
vóór validatie: de build gebruikt dezelfde gegenereerde bestanden. Alleen
opnieuw valideren met de al geactiveerde toolchain:

```sh
bash scripts/validate-agent.sh
```

Voor de lokale productiebuild: `pnpm build` en daarna `pnpm start`.
Het startcommando draait de gebouwde server vanuit de projectmap en leest de
lokale `.env` als die bestaat. Reeds ingestelde omgevingsvariabelen gaan voor.
Zo blijven relatieve databasepaden en de migratiemappen gelijk aan development;
rechtstreeks starten vanuit `.output` verandert die paden. Gebruik voor een
deployment bij voorkeur een absoluut `NUXT_DB_PATH`.

De sitemap is bereikbaar op `/sitemap.xml`. De sitemapmodule bepaalt het
domein uit het binnenkomende verzoek; een extra omgevingsvariabele is niet nodig.
Zorg achter een reverse proxy voor de juiste publieke host en het HTTPS-protocol
in de doorgestuurde headers.
Alleen de homepage, kaart, lijst en opgeslagen onderwerp-slugs worden opgenomen.
De bron `/api/sitemap/urls` leest SQLite tijdens requests. In productie
wordt de sitemap maximaal 60 seconden gecachet; een nieuwe build is niet nodig.
Beheer, login, wachtwoordherstel en nieuwe concepten worden niet opgenomen.
`/robots.txt` verwijst naar de sitemap op hetzelfde domein.

Socialmediapreviews gebruiken `/api/issues/<id>/og-image`: Sharp verkleint de eerste
opgeslagen afbeelding proportioneel tot maximaal 1200 × 630 en levert JPEG van
maximaal 1.000.000 bytes. Er wordt niets bijgesneden of vergroot.
De originele afbeelding en omschrijving blijven ongewijzigd.
Transparantie wordt wit; EXIF-oriëntatie wordt toegepast. Een inhoudsafhankelijke
ETag en verplichte cachevalidatie voorkomen verouderde HTTP-cacheversies.
Ontbrekende afbeeldingen geven 404; ongeldige of niet-verwerkbare afbeeldingen
geven een expliciete fout. Bronafbeeldingen zijn begrensd op 40 miljoen pixels.

De HTTP-controle start tijdelijk de productiebuild op 127.0.0.1:3000, controleert
homepage, loginpagina, lijst, issues-API en adminlogin en stopt zijn eigen server.
Twee opeenvolgende ingelogde SSR-verzoeken naar de lijst controleren of de
geroteerde access- en refresh-tokens via cookies behouden blijven.
Poort 3000 moet vrij zijn. De login maakt een refresh-token in de lokale DB.
De auth-configuratie gebruikt `refreshOnlyToken: false`, omdat de backend bij
iedere refresh ook het refresh-token vervangt.
De WebSocket-composables delen hun verbinding via VueUse `createSharedComposable`
in de browser. Tijdens SSR blijft de status per verzoek gescheiden en wordt
geen WebSocket-verbinding geopend. De URL gebruikt de host van `useRequestURL`,
niet de huidige paginaroute of `window`.
De HTTP-controle stuurt ook een Chrome-user-agent en viewport-client-hints naar
de lijst en kaart. De directe H3-dependency blijft op versie 1, passend bij
Nitro 2; H3 2 is niet compatibel met de response-headerhelpers voor deze SSR-flow.
E2E gebruikt een eigen tijdelijke database, SMTP-opvanger en poort 3100; zie
[browsertests](e2e.md). Chromium-installatie vereist netwerktoegang en kan op
Linux rootrechten nodig hebben voor systeemlibraries. Rapporten staan in
`playwright-report/` en `test-results/`.

Cloudimages kunnen de pnpm-store cachen op OS, architectuur, Node en lockfile.
De taakfase heeft schrijfrechten voor checkout/cache/tijdelijke map en lokale
sockets nodig. Geef netwerk-/proxyrechten via de runner; wijzig hiervoor geen
lockfile. Er wordt geen deployment gestart.
