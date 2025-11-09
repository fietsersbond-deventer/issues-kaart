<script setup lang="ts">
definePageMeta({
  middleware: () => {
    return navigateTo("/kaart");
  },
  render() {
    return null;
  },
});
</script>
