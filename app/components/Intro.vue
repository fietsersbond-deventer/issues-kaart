<template>
  <div class="pa-4 d-flex flex-column" style="height: 100%; position: relative">
    <div class="flex-grow-1">
      <h1 class="text-h4 mb-4">Welkom bij de Fietsersbond Deventer</h1>
      <v-card variant="flat" class="mb-4 pa-4">
        <p class="text-body-1 mb-4">
          Deze kaart toont alle onderwerpen waar we ons mee bezig houden.
        </p>
        <p class="text-body-1 mb-4">
          <strong>Om te beginnen:</strong>
        </p>
        <ul class="mb-4">
          <li class="mb-2">
            Klik op een onderwerp op de kaart om de details te bekijken
          </li>
          <li class="mb-2">Zoek een locatie met de zoekbalk linksboven</li>
          <li class="mb-2">
            Bekijk de legenda om te zien wat de kleuren betekenen
          </li>
        </ul>
      </v-card>
    </div>

    <div class="mt-4">
      <v-btn
        href="https://github.com/fietsersbond-deventer/issues-kaart"
        target="_blank"
        variant="text"
        color="primary"
        prepend-icon="mdi-github"
      />
    </div>
  </div>
</template>
