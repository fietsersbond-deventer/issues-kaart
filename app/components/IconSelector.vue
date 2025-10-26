<template>
  <div>
    <v-row>
      <v-col cols="12" :md="categoryOptions.length > 1 ? 9 : 12">
        <v-text-field
          v-model="searchQuery"
          label="Zoek iconen"
          prepend-inner-icon="mdi-magnify"
          clearable
          density="compact"
        />
      </v-col>
      <v-col v-if="categoryOptions.length > 1" cols="12" md="3">
        <v-select
          v-model="selectedCategory"
          :items="categoryOptions"
          label="Tag"
          density="compact"
          clearable
        />
      </v-col>
    </v-row>

    <v-row v-if="selectedIcon && !paginatedIcons.includes(selectedIcon)">
      <v-col cols="12" class="text-center">
        <v-chip color="primary" variant="outlined" class="cursor-pointer" @click="showSelectedIcon">
          <LegendIndicator 
            :legend="{ icon: selectedIcon, color: previewColor }" 
            :size="16" 
            class="mr-2"
          />
          Huidig geselecteerd (klik om te tonen)
        </v-chip>
      </v-col>
    </v-row>

    <v-row v-if="loading">
      <v-col cols="12" class="text-center">
        <v-progress-circular indeterminate />
        <p class="mt-2">{{ loadingMessage }}</p>
      </v-col>
    </v-row>

    <v-row v-else>
      <v-col cols="12">
        <div class="icon-grid">
          <v-tooltip
            v-for="icon in paginatedIcons"
            :key="icon"
            :text="icon"
            location="top"
          >
            <template #activator="{ props }">
              <v-btn
                v-bind="props"
                :variant="selectedIcon === icon ? 'elevated' : 'text'"
                :color="selectedIcon === icon ? 'primary' : undefined"
                size="large"
                class="icon-button ma-1"
                @click="selectIcon(icon)"
              >
                <ValidatedIcon
                  :icon="icon"
                  size="24"
                  @icon-not-found="handleIconNotFound"
                />
              </v-btn>
            </template>
          </v-tooltip>
        </div>
      </v-col>
    </v-row>

    <v-row v-if="totalPages > 1">
      <v-col cols="12" class="d-flex justify-center">
        <v-pagination
          v-model="currentPage"
          :length="totalPages"
          :total-visible="7"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <p class="text-caption text-center">
          {{ validIcons.length }} iconen beschikbaar
          <span v-if="validIcons.length !== paginatedIcons.length">
            - {{ paginatedIcons.length }} weergegeven
          </span>
        </p>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import {
  searchIcons,
  getTagOptions,
  getIconsByTag,
  type MdiIcon,
} from "@/utils/getAllMdiIcons";
import ValidatedIcon from "@/components/ValidatedIcon.vue";
import LegendIndicator from "@/components/LegendIndicator.vue";

interface Props {
  previewColor?: string;
}

const { previewColor = '#666666' } = defineProps<Props>();

const selectedIcon = defineModel<string | undefined>({ required: true });

const searchQuery = ref("");
const selectedCategory = ref<string | undefined>();
const currentPage = ref(1);
const iconsPerPage = 50;
const loading = ref(false);
const loadingMessage = ref("Loading all MDI icons...");
const allIcons = ref<MdiIcon[]>([]);
const missingIcons = ref(new Set<string>());

// Available categories (now using tags)
const categoryOptions = computed(() => {
  if (!allIcons.value.length) return [];

  return getTagOptions(allIcons.value);
});

// Base icon set to work with
const baseIcons = computed(() => {
  if (allIcons.value.length > 0) {
    return allIcons.value.map((icon) => icon.name);
  }
  return [];
});

// Filter icons based on search and tag
const filteredIcons = computed(() => {
  let icons = baseIcons.value;

  // Apply tag filter if we have the full icon set
  if (selectedCategory.value && allIcons.value.length > 0) {
    const tagIcons = getIconsByTag(allIcons.value, selectedCategory.value);
    icons = tagIcons.map((icon) => icon.name);
  }

  // Apply search filter
  if (searchQuery.value) {
    if (allIcons.value.length > 0) {
      const searchResults = searchIcons(allIcons.value, searchQuery.value);
      icons = searchResults.map((icon) => icon.name);
    } else {
      const query = searchQuery.value.toLowerCase();
      icons = icons.filter((icon) => icon.toLowerCase().includes(query));
    }
  }

  return icons;
});

// For display purposes (to prevent UI freeze with too many icons)
const displayedIcons = computed(() => {
  const maxIcons = 1000; // Limit to 1000 icons max
  return filteredIcons.value.slice(0, maxIcons);
});

// Filter out missing icons
const validIcons = computed(() => {
  return displayedIcons.value.filter((icon) => !missingIcons.value.has(icon));
});

// Pagination
const totalPages = computed(() => {
  return Math.ceil(validIcons.value.length / iconsPerPage);
});

const paginatedIcons = computed(() => {
  const start = (currentPage.value - 1) * iconsPerPage;
  const end = start + iconsPerPage;
  return validIcons.value.slice(start, end);
});

// Load all icons on mount
onMounted(async () => {
  loading.value = true;
  loadingMessage.value = "Loading all MDI icons...";

  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/Templarian/MaterialDesign/master/meta.json"
    );
    const icons = await response.json();

    allIcons.value = icons.map(
      (icon: {
        name: string;
        tags?: string[];
        category?: string;
        aliases?: string[];
      }) => ({
        name: `mdi-${icon.name}`,
        tags: icon.tags || [],
        category: icon.category || "uncategorized",
        aliases: icon.aliases || [],
      })
    );
  } catch (error) {
    console.error("Failed to load full icon set:", error);
    loadingMessage.value = "Failed to load icons";
  } finally {
    loading.value = false;
  }
});

const showSelectedIcon = () => {
  if (selectedIcon.value) {
    const iconIndex = filteredIcons.value.indexOf(selectedIcon.value);
    if (iconIndex >= 0) {
      currentPage.value = Math.floor(iconIndex / ICONS_PER_PAGE) + 1;
    }
  }
};

// Reset pagination when filters change
watch([searchQuery, selectedCategory], () => {
  currentPage.value = 1;
});

// Ensure selected icon is visible when component loads or selection changes
watch(
  [validIcons, selectedIcon],
  () => {
    if (selectedIcon.value && validIcons.value.length > 0) {
      const selectedIndex = validIcons.value.indexOf(selectedIcon.value);
      if (selectedIndex !== -1) {
        // Calculate which page the selected icon is on
        const pageWithSelection = Math.floor(selectedIndex / iconsPerPage) + 1;
        currentPage.value = pageWithSelection;
      }
    }
  },
  { immediate: true }
);

function selectIcon(icon: string) {
  // Toggle: if the same icon is clicked, deselect it
  if (selectedIcon.value === icon) {
    selectedIcon.value = undefined;
  } else {
    selectedIcon.value = icon;
  }
}

function handleIconNotFound(iconName: string) {
  missingIcons.value.add(iconName);
  console.warn(`Icon not found: ${iconName}`);
}
</script>

<style scoped>
.icon-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  max-height: 400px;
  overflow-y: auto;
}

.icon-button {
  min-width: 48px !important;
  min-height: 48px !important;
}
</style>
