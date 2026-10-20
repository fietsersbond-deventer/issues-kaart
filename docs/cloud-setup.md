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

De HTTP-controle start tijdelijk de productiebuild op 127.0.0.1:3000, controleert
homepage, loginpagina, issues-API en adminlogin en stopt zijn eigen server.
Poort 3000 moet vrij zijn. De login maakt een refresh-token in de lokale DB.
E2E gebruikt een eigen tijdelijke database, SMTP-opvanger en poort 3100; zie
[browsertests](e2e.md). Chromium-installatie vereist netwerktoegang en kan op
Linux rootrechten nodig hebben voor systeemlibraries. Rapporten staan in
`playwright-report/` en `test-results/`.

Cloudimages kunnen de pnpm-store cachen op OS, architectuur, Node en lockfile.
De taakfase heeft schrijfrechten voor checkout/cache/tijdelijke map en lokale
sockets nodig. Geef netwerk-/proxyrechten via de runner; wijzig hiervoor geen
lockfile. Er wordt geen deployment gestart.
