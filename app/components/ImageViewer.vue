<template>
  <div class="image-viewer" @click="handleImageClick">
    <div ref="contentRef" class="image-viewer-content">
      <slot />
    </div>

    <v-dialog
      v-model="showImageDialog"
      :width="imageDialogWidth"
      class="image-dialog"
    >
      <v-card v-if="selectedImage" class="image-card">
        <img :src="selectedImage" class="dialog-image" />
        <template v-if="images.length > 1">
          <v-btn
            class="nav-btn nav-prev"
            icon="mdi-chevron-left"
            aria-label="Vorige foto"
            variant="tonal"
            @click.stop="showPrevious"
          />
          <v-btn
            class="nav-btn nav-next"
            icon="mdi-chevron-right"
            aria-label="Volgende foto"
            variant="tonal"
            @click.stop="showNext"
          />
        </template>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
const { selector = "img" } = defineProps<{
  /** CSS-selector voor de afbeeldingen die de lightbox openen. */
  selector?: string;
}>();

const showImageDialog = ref(false);
const imageDialogWidth = ref<string>("90%");
const contentRef = ref<HTMLElement | null>(null);
const images = ref<string[]>([]);
const currentIndex = ref(0);
const selectedImage = computed(() => images.value[currentIndex.value] ?? null);
const { mobile } = useVDisplay();

function handleImageClick(event: MouseEvent) {
  const target = event.target;
  if (
    !(target instanceof HTMLImageElement) ||
    mobile.value ||
    !contentRef.value?.contains(target) ||
    !target.matches(selector)
  ) {
    return;
  }

  // Afbeeldingen zonder src (komen voor in oude omschrijvingen) overslaan.
  const candidates = Array.from(
    contentRef.value.querySelectorAll<HTMLImageElement>(selector),
  ).filter((img) => img.src);
  if (!candidates.includes(target)) return;
  images.value = candidates.map((img) => img.src);
  currentIndex.value = candidates.indexOf(target);
  showImageDialog.value = true;
}

function showPrevious() {
  const count = images.value.length;
  currentIndex.value = (currentIndex.value - 1 + count) % count;
}

function showNext() {
  currentIndex.value = (currentIndex.value + 1) % images.value.length;
}

function handleKeydown(event: KeyboardEvent) {
  if (!showImageDialog.value || images.value.length < 2) return;
  if (event.key === "ArrowLeft") {
    event.preventDefault();
    showPrevious();
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    showNext();
  }
}

// Pas de dialoogbreedte aan op de afmetingen van de getoonde foto.
watch(selectedImage, (src) => {
  if (!src) return;
  const tempImg = new Image();
  tempImg.onload = () => {
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.9;
    let dialogWidth = Math.min(tempImg.width, maxWidth);

    if (tempImg.height > maxHeight) {
      const ratio = maxHeight / tempImg.height;
      dialogWidth = Math.min(tempImg.width * ratio, maxWidth);
    }

    imageDialogWidth.value = `${Math.round(dialogWidth)}px`;
  };
  tempImg.src = src;
});

onMounted(() => window.addEventListener("keydown", handleKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", handleKeydown));
</script>

<style scoped>
.image-viewer,
.image-viewer-content {
  display: contents;
}

.image-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 90vh;
  padding: 0;
  margin: 0;
}

.dialog-image {
  max-width: 100%;
  object-fit: contain;
  display: block;
}

.nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
}

.nav-prev {
  left: 8px;
}

.nav-next {
  right: 8px;
}
</style>
