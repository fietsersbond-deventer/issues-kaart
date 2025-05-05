import { inject, provide } from "vue";
import type { Map } from "leaflet";

/**
 * @example 
 * 
 * onMounted(async () => {
 *   map = await useMap().injectMap();
 * });

 */
export function useMap() {
  const mapKey = "map";

  function provideMap(map: Promise<Map>) {
    provide(mapKey, map);
  }

  // injects map into the component, map is required if not error
  function injectMap<T = Map>() {
    const map = inject<Promise<T>>(mapKey);
    // if (!map) throw new Error("No map provided yet");
    return map;
  }

  // request map, map is not required
  function requestMap<T = Map>() {
    return inject<Promise<T>>(mapKey);
  }

  return { provideMap, injectMap, requestMap };
}
