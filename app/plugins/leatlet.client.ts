import "leaflet-editable";
import "leaflet.path.drag";

export default defineNuxtPlugin(() => {
  // Leaflet.Editable is afhankelijk van window.$L. Deze wordt niet gezet door @vue-leaflet/vue-leaflet

  // @ts-ignore
  window.$L = L;
});
