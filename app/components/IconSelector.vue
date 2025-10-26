<template>
  <div>
    <v-row>
      <v-col cols="12">
        <v-text-field
          v-model="searchQuery"
          label="Zoek iconen"
          prepend-inner-icon="mdi-magnify"
          clearable
          density="compact"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <div class="icon-grid">
          <v-tooltip
            v-for="icon in filteredIcons"
            :key="icon"
            :text="icon"
            location="top"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                :icon="icon"
                :variant="selectedIcon === icon ? 'elevated' : 'text'"
                :color="selectedIcon === icon ? 'primary' : undefined"
                size="large"
                class="icon-button ma-1"
                @click="selectIcon(icon)"
              />
            </template>
          </v-tooltip>
        </div>
      </v-col>
    </v-row>

    <v-row v-if="selectedIcon">
      <v-col cols="12">
        <v-alert type="info" variant="tonal" density="compact">
          <div class="d-flex align-center">
            <v-icon :icon="selectedIcon" class="mr-2" />
            <span>Geselecteerd: {{ selectedIcon }}</span>
            <v-spacer />
            <v-btn
              size="small"
              variant="text"
              @click="clearSelection"
            >
              Wissen
            </v-btn>
          </div>
        </v-alert>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
const selectedIcon = defineModel<string | null>({ required: true });

const searchQuery = ref("");

// Curated list of transport and cycling related MDI icons
const transportIcons = [
  // Bicycle related
  "mdi-bicycle",
  "mdi-bike",
  "mdi-bike-fast",
  "mdi-bicycle-electric",
  "mdi-bicycle-basket",

  // Traffic and signs
  "mdi-traffic-light",
  "mdi-traffic-cone",
  "mdi-sign-pole",
  "mdi-road",
  "mdi-road-variant",

  // Infrastructure
  "mdi-bridge",
  "mdi-tunnel",
  "mdi-stairs",
  "mdi-escalator",
  "mdi-elevator",

  // Transportation
  "mdi-bus",
  "mdi-train",
  "mdi-tram",
  "mdi-car",
  "mdi-parking",

  // Safety and warnings
  "mdi-alert",
  "mdi-alert-triangle",
  "mdi-warning",
  "mdi-shield",
  "mdi-security",

  // Construction and maintenance
  "mdi-hammer",
  "mdi-wrench",
  "mdi-hard-hat",
  "mdi-cone",
  "mdi-barrier",

  // Nature and environment
  "mdi-tree",
  "mdi-flower",
  "mdi-water",
  "mdi-weather-sunny",
  "mdi-weather-rainy",

  // Locations and POI
  "mdi-map-marker",
  "mdi-home",
  "mdi-school",
  "mdi-hospital",
  "mdi-shopping",
  "mdi-office-building",

  // General useful icons
  "mdi-information",
  "mdi-check",
  "mdi-close",
  "mdi-star",
  "mdi-heart",
  "mdi-lightbulb",
];

const filteredIcons = computed(() => {
  if (!searchQuery.value) {
    return transportIcons;
  }
  
  const query = searchQuery.value.toLowerCase();
  return transportIcons.filter(icon => 
    icon.toLowerCase().includes(query)
  );
});

function selectIcon(icon: string) {
  selectedIcon.value = icon;
}

function clearSelection() {
  selectedIcon.value = null;
}
</script>

<style scoped>
.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.icon-button {
  min-width: 48px !important;
  min-height: 48px !important;
}
</style>