import { computed, ref, shallowRef, watch, onScopeDispose } from "vue";
import type { Ref } from "vue";
import type { Map as OLMap } from "ol";
import { transformExtent } from "ol/proj";
import type { MapIssue, NewIssue } from "~~/shared/types/Issue";

/** Fetch only full geometries intersecting the settled map viewport. */
export function useMapViewportIssues(
  mapRef: Ref<{ map?: OLMap } | null | undefined>,
  selectedIssues: Ref<(MapIssue | NewIssue)[]>,
  selectedId: Ref<number | null> = ref(null),
) {
  const store = useIssues();
  const { viewportRevision } = storeToRefs(store);
  const loaded = shallowRef<Map<number, MapIssue>>(new Map());
  const error = shallowRef("");
  const extent = shallowRef("");
  const filter = computed(() => {
    const ids = [
      ...new Set(
        selectedIssues.value
          .map((issue) => issue.legend_id)
          .filter((id): id is number => typeof id === "number"),
      ),
    ].sort((a, b) => a - b);
    if (!selectedIssues.value.length) return "";
    return selectedIssues.value.some((issue) => issue.legend_id == null)
      ? "all"
      : ids.join(",");
  });
  watch(
    () => mapRef.value?.map,
    (map, _, onCleanup) => {
      if (!map) return;
      function update() {
        const size = map!.getSize();
        if (!size?.[0] || !size[1]) return;
        const view = map!.getView();
        if (!view.getCenter() || view.getResolution() === undefined) return;
        const bounds = transformExtent(
          view.calculateExtent(size),
          "EPSG:3857",
          "EPSG:4326",
        );
        const clamped = [
          Math.max(-180, bounds[0]!),
          Math.max(-90, bounds[1]!),
          Math.min(180, bounds[2]!),
          Math.min(90, bounds[3]!),
        ];
        if (
          clamped.every(Number.isFinite) &&
          clamped[0]! < clamped[2]! &&
          clamped[1]! < clamped[3]!
        )
          extent.value = clamped.join(",");
      }
      map.on("moveend", update);
      map.on("change:size", update);
      update();
      onCleanup(() => {
        map.un("moveend", update);
        map.un("change:size", update);
      });
    },
    { immediate: true },
  );

  let controller: AbortController | undefined;
  onScopeDispose(() => controller?.abort());
  watch(
    [extent, filter, viewportRevision],
    async ([bbox, cat], _, onCleanup) => {
      controller?.abort();
      if (!bbox || !cat) {
        loaded.value = new Map();
        return;
      }
      const request = new AbortController();
      controller = request;
      onCleanup(() => request.abort());
      try {
        const rows = await $fetch<MapIssue[]>("/api/issues", {
          query: {
            fields: "id,geometry",
            bbox,
            ...(cat === "all" ? {} : { cat }),
          },
          signal: request.signal,
        });
        if (request.signal.aborted) return;
        loaded.value = new Map(rows.map((issue) => [issue.id, issue]));
        error.value = "";
      } catch {
        if (!request.signal.aborted)
          error.value =
            "Kaartobjecten laden mislukt. Verplaats de kaart om opnieuw te proberen.";
      }
    },
    { immediate: true },
  );

  const issues = computed(() =>
    selectedIssues.value.flatMap((issue) => {
      // The selected editor record contains the exact geometry and takes precedence.
      if (
        issue.geometry &&
        (issue.id === undefined || issue.id === selectedId.value)
      )
        return [issue];
      const geometry =
        issue.id === undefined
          ? undefined
          : loaded.value.get(issue.id)?.geometry;
      return geometry ? [{ ...issue, geometry }] : [];
    }),
  );
  return { issues, error };
}
