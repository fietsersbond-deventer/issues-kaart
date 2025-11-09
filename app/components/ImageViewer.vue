<template>
  <div class="image-viewer" @click="handleImageClick">
    <slot />

    <v-dialog
      v-model="showImageDialog"
      :width="imageDialogWidth"
      class="image-dialog"
    >
      <v-card v-if="selectedImage" class="image-card">
        <img :src="selectedImage" class="dialog-image" />
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
const showImageDialog = ref(false);
const selectedImage = ref<string | null>(null);
const imageDialogWidth = ref<string>("90%");
const { mobile } = useDisplay();

// Handle image clicks to open dialog
function handleImageClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.tagName === "IMG" && !mobile.value) {
    const img = target as HTMLImageElement;
    selectedImage.value = img.src;

    // Get image dimensions to adjust dialog size
    const tempImg = new Image();
    tempImg.onload = () => {
      const maxWidth = window.innerWidth * 0.9;
      const maxHeight = window.innerHeight * 0.9;
      let dialogWidth = Math.min(tempImg.width, maxWidth);

      // Adjust if height would exceed max
      if (tempImg.height > maxHeight) {
        const ratio = maxHeight / tempImg.height;
        dialogWidth = Math.min(tempImg.width * ratio, maxWidth);
      }

      imageDialogWidth.value = `${Math.round(dialogWidth)}px`;
    };
    tempImg.src = img.src;

    showImageDialog.value = true;
  }
}
</script>

<style scoped>
.image-viewer {
  display: contents;
}

.image-card {
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
</style>
