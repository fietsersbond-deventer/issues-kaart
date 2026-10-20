import type { Issue } from "~~/shared/types/Issue";
import type { Ref } from "vue";
import type VectorSource from "ol/source/Vector";
import type { Feature } from "ol";
import type { SelectEvent } from "ol/interaction/Select";
import type { ModifyEvent } from "ol/interaction/Modify";
import { GeoJSON } from "ol/format";
import type { LineString, Point, Polygon } from "ol/geom";
import type Layer from "ol/layer/Layer";

export function useMapIssueInteractions(
  onFeatureClicked: () => void,
  source: Ref<VectorSource<Feature<Point | LineString | Polygon>> | undefined> = shallowRef(undefined),
  isDrawing: Ref<boolean> = ref(false),
) {
  const { issue: selectedIssue, selectedId } = storeToRefs(useSelectedIssue());
  const { selectedIssues } = useSelectedIssues();
  const { isEditing } = useIsEditing();
  const route = useRoute();
  const modifyEnabled = computed(() => Boolean(
    isEditing.value && !isDrawing.value && selectedId.value !== null
    && selectedIssue.value?.id === selectedId.value,
  ));

  function navigateToIssue(issue: Pick<Issue, "id">) {
    const { query } = route;
    navigateTo({ path: `/kaart/${issue.id}`, query });
  }

  const selectedFeatures = useEditableMapFeatures(source, selectedId, modifyEnabled);

  // ol Select stops at the first hit that fails `filter`, so exclude the layer instead
  function isNotAreaLayer(layer: Layer) {
    return layer.getClassName() !== "area-layer";
  }

  function onFeatureSelect(event: SelectEvent) {
    const issueId = event.selected[0]?.get("id");
    if (typeof issueId !== "number" || !Number.isSafeInteger(issueId) || issueId <= 0
      || issueId === selectedId.value) return;
    selectedId.value = issueId;
    navigateToIssue({ id: issueId });
    onFeatureClicked();
  }

  function onModifyEnd(event: ModifyEvent) {
    const writer = new GeoJSON();
    const feature = event.features.item(0);
    if (!feature) {
      console.warn("No feature modified");
      return;
    }
    const geoJSON = writer.writeFeatureObject(feature, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:3857",
    });

    // Update selectedIssue geometry
    selectedIssue.value!.geometry = geoJSON.geometry as Issue["geometry"];

    // ALSO update the geometry in the issues array (which the map renders from)
    // This prevents the map from reverting to the old geometry
    const issueIndex = selectedIssues.value.findIndex(
      (i) => "id" in i && i.id === selectedId.value,
    );
    if (issueIndex !== -1) {
      selectedIssues.value[issueIndex]!.geometry = geoJSON.geometry as Issue["geometry"];
    }
  }

  return {
    selectedId,
    selectedIssues,
    selectedFeatures,
    modifyEnabled,
    isNotAreaLayer,
    onFeatureSelect,
    onModifyEnd,
  };
}
