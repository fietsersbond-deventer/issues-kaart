import OpenLayersMap from "vue3-openlayers";

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(OpenLayersMap, { debug: false });
});
