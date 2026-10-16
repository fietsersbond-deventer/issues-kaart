import type { Map as OLMap } from "ol";
import type { Ref } from "vue";
import { easeOut } from "ol/easing";
import { useDebounceFn } from "@vueuse/core";
import { fromLonLat } from "ol/proj";
import type { BBox } from "geojson";
import {
  focusKey,
  resolveFocusTarget,
  type FocusTarget,
} from "~/utils/mapFocusTarget";
import { transformBboxToOpenLayers } from "~/utils/getIssuesBbox";

type Padding = [number, number, number, number];

interface RefitOptions {
  /** show the overview (filter or area) instead of the selected issue */
  overview?: boolean;
  duration?: number;
}

/**
 * The only place that moves the map view. The URL (issue id, tag, cat)
 * decides the target; see resolveFocusTarget.
 */
export function useMapFocus(
  mapRef: Ref<{ map?: OLMap } | null | undefined>,
  padding: Ref<Padding>,
  mapSize: Ref<[number, number]>,
) {
  const { issue, selectedId } = storeToRefs(useSelectedIssue());
  const { isLoaded } = storeToRefs(useIssues());
  const { selectedIssues } = useSelectedIssues();
  const { selectedTags } = storeToRefs(useTagFilters());
  const { visibleCategoryIds, isShowingAllCategories } =
    storeToRefs(useCategoryFilters());
  const { isEditing } = useIsEditing();
  const { mobile } = useDisplay();
  const { bbox: areaBbox } = useCurrentArea();

  const prefer = ref<"issue" | "filter">("issue");
  const defaultDuration = 1000;

  const filterActive = computed(
    () => !isShowingAllCategories.value || selectedTags.value.length > 0,
  );

  const filterId = computed(
    () =>
      `${[...selectedTags.value].sort().join("+")}|${
        isShowingAllCategories.value
          ? "all"
          : [...visibleCategoryIds.value].sort((a, b) => a - b).join(",")
      }`,
  );

  // Selecting an issue and changing the filter in one navigation: the issue wins.
  let issueChangedThisTick = false;
  watch(
    selectedId,
    () => {
      prefer.value = "issue";
      issueChangedThisTick = true;
      nextTick(() => (issueChangedThisTick = false));
    },
    { flush: "sync" },
  );
  watch(
    filterId,
    () => {
      if (!issueChangedThisTick) prefer.value = "filter";
    },
    { flush: "sync" },
  );

  const target = computed<FocusTarget | undefined>(() => {
    if (!isLoaded.value) return undefined;
    return resolveFocusTarget({
      prefer: prefer.value,
      areaBbox,
      selectedId: selectedId.value,
      issue: issue.value as { id?: number; geometry?: never } | null,
      filterActive: filterActive.value,
      selectedIssues: selectedIssues.value,
    });
  });

  const key = computed(() => target.value && focusKey(target.value));

  function fit(t: FocusTarget) {
    const view = mapRef.value?.map?.getView();
    if (!view) return;
    const extent = transformBboxToOpenLayers(t.bbox as BBox);
    const maxZoom =
      t.type === "area"
        ? undefined
        : t.type === "issue" && t.isPoint
          ? Math.max(view.getZoom() ?? 0, 15)
          : 17;
    view.cancelAnimations();
    view.fit(extent, {
      padding: padding.value,
      maxZoom,
      duration: defaultDuration,
      easing: easeOut,
    });
  }

  let appliedKey: string | undefined;
  let initialized = false;

  function apply(force = false) {
    const t = target.value;
    if (!t || !initialized || !mapRef.value?.map) return;
    const k = key.value!;
    if (!force && k === appliedKey) return;
    // the first fit has nothing to animate from
    const first = appliedKey === undefined;
    appliedKey = k;
    fit(t);
  }

  // coalesces issues loading, websocket bursts and tag+cat changes into one move
  const schedule = useDebounceFn(() => apply(), 150);

  watch(key, (k) => {
    if (isEditing.value) {
      // own edits must not move the map
      appliedKey = k;
      return;
    }
    schedule();
  });

  function fitInitialView(map: OLMap) {
    const view = map.getView();
    if (areaBbox) {
      view.fit(transformBboxToOpenLayers(areaBbox), { padding: padding.value });
    } else {
      const { map: config } = useRuntimeConfig().public;
      view.setCenter(
        fromLonLat([
          parseFloat(String(config.centerLon)),
          parseFloat(String(config.centerLat)),
        ]),
      );
      view.setZoom(parseInt(String(config.initialZoom)));
    }
  }

  // start on the area (or configured center) as soon as the map has a size
  watch(
    [() => mapRef.value?.map, mapSize],
    ([map, [width, height]]) => {
      if (!map || !width || !height || initialized) return;
      initialized = true;
      map.updateSize();
      fitInitialView(map);
      schedule();
    },
    { immediate: true },
  );

  // follows dragging of the mobile bottom sheet and control overlays
  const refitSoon = useDebounceFn(
    () => {
      if (isEditing.value) return;
      apply(true);
    },
    80,
    { maxWait: 150 },
  );

  // the legend re-reports its size after every filter change; equal values must not cut the animation
  watch(
    () => padding.value.join(","),
    () => {
      const map = mapRef.value?.map;
      if (!initialized || !map) return;
      if (appliedKey === undefined) fitInitialView(map);
      else refitSoon();
    },
  );

  watch(mapSize, () => {
    if (!target.value) return;
    fit(target.value);
  });

  function refit(options: RefitOptions = {}) {
    if (options.overview) prefer.value = "filter";
    if (appliedKey === undefined && !options.overview) return;
    return refitSoon();
  }

  return { refit };
}
