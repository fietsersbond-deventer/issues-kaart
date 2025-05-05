<template>
  <div />
</template>
<script setup lang="ts">
import type {
  Marker,
  Polygon,
  Polyline,
  FitBoundsOptions,
  LeafletKeyboardEvent,
  Map,
} from "leaflet";
import { latLng as createLatLng, DomEvent } from "leaflet";

const eventBus = useMapEventBus().inject();
if (!eventBus) throw new Error("No eventBus provided yet");
const mapPromise = useMap().injectMap();
const editableFeature = useEditableFeature().inject();
let map: Map | null | undefined = null;

const layerRef = shallowRef<Polygon | Polyline | Marker | null>(null);

const editableEnabledStyle = computed(() => ({
  color: "blue",
  opacity: 0.75,
  fillOpacity: 0.5,
}));

const editableDisabledStyle = computed(() => ({
  ...editableEnabledStyle.value,
  fillOpacity: 0.05,
}));

const previousEditState = ref<null | boolean>(null);

watch(layerRef, (newValue, oldValue) => {
  if (oldValue) {
    map?.removeLayer(oldValue);
  }
});

function disableEditOnEsc({ originalEvent }: LeafletKeyboardEvent) {
  if (originalEvent.keyCode !== 27) return;
  layerRef.value?.disableEdit();
  previousEditState.value = false;
}

function addMapHandlers() {
  if (!map) return;

  // handler to disable editing using esc key
  map.on("keyup", disableEditOnEsc);
}

function removeMapHandlers() {
  if (!map) return;
  map.off("keyup", disableEditOnEsc);
}

function startPolygon() {
  if (!map) return;
  editableFeature.editable.value = false;
  editableFeature.type.value = POLYGON;
  map.editTools.startPolygon(undefined, editableDisabledStyle.value);
}

function startPoint() {
  if (!map) return;
  editableFeature.editable.value = false;
  editableFeature.type.value = POINT;
  map.editTools.startMarker();
}

function startLine() {
  if (!map) return;
  editableFeature.editable.value = false;
  editableFeature.type.value = LINE;
  map.editTools.startPolyline();
}

function zoomToFeature(options: { noZoom?: boolean } & FitBoundsOptions = {}) {
  if (!map) return;
  if (editableFeature.type.value === POINT) {
    const coordinates = editableFeature.feature.value?.geometry
      ?.coordinates as [number, number];
    if (!coordinates) return;
    const [x, y] = coordinates;

    map.flyTo([y, x]);
  } else {
    if (!editableFeature.bounds) return;
    const { west, south, east, north } = editableFeature.bounds;
    map.flyToBounds(
      [
        [south, west],
        [north, east],
      ],
      {
        animate: false, // default false
        ...options,
        // nozoom verplaatst de kaart zonder te zoomen
        maxZoom: options.noZoom ? map.getZoom() : options.maxZoom,
      }
    );
  }
}

function coordsToLatLngs(coordinates: any[]) {
  // if we get an array of polylines, go 1 level deeper
  // if the length of the first element of coordinates[0] !== 2
  // then it's not a coordinate but a polyline
  const depth = coordinates[0][0].length !== 2 ? 2 : 1;
  // @ts-ignore
  const coordsToLatLngs = $L.GeoJSON.coordsToLatLngs;
  return coordsToLatLngs(coordinates, depth);
}

function setPolygon(editable: boolean) {
  if (!map || !editableFeature.coordinates) return;
  const latLngs = coordsToLatLngs(editableFeature.coordinates);
  // @ts-ignore
  const polygon = map.editTools.createPolygon(
    latLngs,
    editable ? editableEnabledStyle.value : editableDisabledStyle.value
  );
  polygon.addTo(map);
  editableFeature.type.value = POLYGON;
  if (editable) polygon.enableEdit();
  return polygon;
}

function setPoint(editable: boolean) {
  if (!map || !editableFeature.coordinates) return;
  const [lng, lat] = editableFeature.coordinates as [number, number];
  const latLng = createLatLng([lat, lng]);
  // @ts-ignore
  const point = map.editTools.createMarker(latLng);
  point.addTo(map);
  editableFeature.type.value = POINT;
  if (editable) point.enableEdit();
  return point;
}

function setLine(editable: boolean) {
  if (!map || !editableFeature.coordinates) return;
  const latLngs = coordsToLatLngs(editableFeature.coordinates);
  // @ts-ignore
  const line = map.editTools.createPolyline(
    latLngs,
    editable ? editableEnabledStyle.value : editableDisabledStyle.value
  );
  line.addTo(map);
  editableFeature.type.value = LINE;
  if (editable) line.enableEdit();
  return line;
}

function onChangeFeatureLayer() {
  const layer = layerRef.value!;
  if (!layer) return;
  const feature = layer.toGeoJSON();
  editableFeature.setFeature(feature, true);
}

function removeLayer() {
  if (!map) return;
  map.editTools.stopDrawing();
  editableFeature.clearFeature();
  previousEditState.value = false;

  if (layerRef.value) {
    removeMapHandlers();
    // @ts-ignore
    map.removeLayer(layerRef.value);
    layerRef.value.off(); // remove all event listeners
    layerRef.value = null;
  }
}

function initFeature(editable: boolean) {
  const type = editableFeature.type;
  if (!type.value) return;

  addMapHandlers();

  if (type.value === POLYGON) {
    return setPolygon(editable);
  } else if (type.value === POINT) {
    return setPoint(editable);
  } else if (type.value === LINE) {
    return setLine(editable);
  } else {
    console.warn("Unknown type", type);
  }
}

// @ts-ignore
watch(editableFeature.feature, () => {
  if (!map) return;
  // Force stop drawing after geoJSON update, values can be entered via input fields
  // @ts-ignore
  map.editTools?.stopDrawing();
  // if there's an uneditable feature, remove the editable feature
  if (!editableFeature.editable.value) {
    layerRef.value = null;
  }

  initFeature(editableFeature.editable.value);
});

function addHandlers(layer: Polygon | Marker) {
  layer.on("editable:vertex:dragend", onChangeFeatureLayer);
  layer.on("editable:vertex:deleted", onChangeFeatureLayer);
  layer.on("editable:enable", () => {
    // @ts-ignore - setStyle does exist
    layer.setStyle?.(editableEnabledStyle.value);
  });
  layer.on("editable:disable", () => {
    // @ts-ignore - setStyle does exist
    layer.setStyle?.(editableDisabledStyle.value);
  });

  layer
    .on("dblclick", DomEvent.stop)
    .on("click", DomEvent.stop)
    .on("dblclick", () => {
      console.log("dblclick");
      layer.toggleEdit();
      previousEditState.value = !!layer.editEnabled();
    });
}

eventBus.on("startPolygon", startPolygon);
eventBus.on("startPoint", startPoint);
eventBus.on("startLine", startLine);
eventBus.on("zoomToFeature", (options = {}) => {
  zoomToFeature(options);
});
eventBus.on("clearFeature", removeLayer);

onUnmounted(() => {
  // if the map is moved out of the way, destroy handlers
  eventBus.off("startPolygon");
  eventBus.off("startPoint");
  eventBus.off("startLine");
  eventBus.off("zoomToFeature");
  eventBus.off("clearFeature");
});

onMounted(async () => {
  // a new rectangle/polygon is created.
  map = await mapPromise;
  if (!map) throw new Error("No map provided yet");
  map.on("editable:created", function ({ layer }: { layer: Polygon | Marker }) {
    layerRef.value = layer;
    addHandlers(layer);
    navigateTo("/kaart/new");
  });

  // as soon as the user finished drawing, store its coordinates
  map.on("editable:drawing:commit", onChangeFeatureLayer);

  // the feature was moved
  map.on("editable:dragend", onChangeFeatureLayer);

  // if we come back to the map (from e.g. the cart, or admin)
  // reset an already existing Area of Interest
  if (editableFeature.feature.value) {
    initFeature(editableFeature.editable.value);
  }
});
</script>
