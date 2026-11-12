<script setup lang="ts">
definePageMeta({
  middleware: () => {
    // Permanent (301): "/" heeft geen eigen content en hoort niet als losse
    // pagina naast /kaart geïndexeerd te worden.
    return navigateTo("/kaart", { redirectCode: 301 });
  },
  render() {
    return null;
  },
});
</script>
