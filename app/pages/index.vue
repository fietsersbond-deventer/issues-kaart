<template>
  <div class="flex min-h-[calc(100vh-73px)]">
    <!-- <USlideover
      :model-value="true"
      side="left"
      :overlay="false"
      :prevent-close="true"
      class="!fixed !w-80"
    >
      <template #header>
        <h2 class="text-xl font-bold">Fietsersbond Deventer</h2>
      </template>

      <div class="p-4">
        <UButton variant="soft" block> Nieuwe melding </UButton>

        <nav class="mt-6">
        </nav>
      </div>
    </USlideover> -->

    <!-- Main map area -->
    <main class="flex-1 ml-80">
      <Map />
    </main>
  </div>
</template>

<style>
@import "leaflet/dist/leaflet.css";

.leaflet-container {
  height: 100%;
}
</style>
