import { inject, provide } from "vue";
// https://github.com/developit/mitt
import mitt, { type Emitter } from "mitt";

export type MapEvents = {
  clearFeature: undefined;
  startPoint: undefined;
  startPolygon: undefined;
  startLine: undefined;
};
/**
 * @example 
 * 
 * onMounted(async () => {
 *   map = await useMap().injectMap();
 * });

 */
export function useMapEventBus() {
  const provideKey = "map-eventbus";

  function provideEventBus() {
    const eventBus = mitt<MapEvents>();
    provide(provideKey, eventBus);
    return eventBus;
  }

  // request map, map is not required
  function injectMapEventBus() {
    return inject<Emitter<MapEvents>>(provideKey);
  }

  return { provide: provideEventBus, inject: injectMapEventBus };
}
