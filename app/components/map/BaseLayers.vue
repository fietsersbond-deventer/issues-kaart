<template>
  <ol-tile-layer
    ref="light"
    title="Licht"
    :visible="preferredLayer === 'Licht'"
    :base-layer="true"
  >
    <ol-source-xyz
      url="https://cartodb-basemaps-{a-d}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png?key=cb1_2g3h_1_01ad081dc8ac0a49f3be7436"
      attributions='© <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href= "https://carto.com/about-carto/">CARTO</a>'
    />
  </ol-tile-layer>

  <ol-tile-layer
    ref="fietskaart"
    title="Fiets"
    :visible="preferredLayer === 'Fiets'"
    :base-layer="true"
  >
    <ol-source-xyz
      url="https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png"
      attributions='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="http://opencyclemap.org">OpenCycleMap</a>'
    />
  </ol-tile-layer>

  <ol-tile-layer
    ref="luchtfoto"
    title="Foto"
    :visible="preferredLayer === 'Foto'"
    :base-layer="true"
  >
    <ol-source-wmts
      ref="luchtfoto-source"
      url="https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0?TILEMATRIXSET=EPSG:28992"
      layer="Actueel_ortho25"
      :projection="rdProjection"
      attributions='&copy; <a href="https://www.kadaster.nl">Kadaster</a>'
      format="image/png"
      style="default"
    />
  </ol-tile-layer>

  <ol-tile-layer
    ref="lufolabels"
    title="Straatnamen"
    :visible="preferredLayer === 'Foto'"
  >
    <ol-source-wmts
      ref="lufolabels-source"
      url="https://service.pdok.nl/kadaster/brt-achtergrondkaart/wmts/v2_0?TILEMATRIXSET=EPSG:28992"
      layer="labels"
      :projection="rdProjection"
      format="image/png"
      style="default"
    />
  </ol-tile-layer>
</template>

<script setup lang="ts">
import { register } from "ol/proj/proj4.js";
import proj4 from "proj4";
import Projection from "ol/proj/Projection";

// Layer preference management
const { preferredLayer, watchLayerVisibility } = useMapLayerPreference();

// Observe the same layer and source refs as the original map component.
const luchtfotoSource = useTemplateRef("luchtfoto-source");
const light = useTemplateRef("light");
const fietskaart = useTemplateRef("fietskaart");

// Watch for layer visibility changes and update preferred layer
watchLayerVisibility(light, "Licht");
watchLayerVisibility(fietskaart, "Fiets");
watchLayerVisibility(luchtfotoSource, "Foto");

proj4.defs(
  "EPSG:28992",
  "+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +towgs84=565.417,50.3319,465.552,-0.398957,0.343988,-1.8774,4.0725 +units=m +no_defs",
);
register(proj4);
const rdProjection = new Projection({
  code: "EPSG:28992",
  extent: [-285401.92, 22598.08, 595401.92, 903401.92],
});
</script>
