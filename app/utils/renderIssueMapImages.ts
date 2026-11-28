import type { MapIssue } from "~~/shared/types/Issue";
import OlMap from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import XYZ from "ol/source/XYZ";
import VectorSource from "ol/source/Vector";
import GeoJSONFormat from "ol/format/GeoJSON";
import type { Feature } from "ol";
import { getIssueMapStyle } from "./issueMapStyle";

// PDOK base map in web mercator; PDOK allows CORS, so the canvas can be exported.
const BASE_MAP_URL =
  "https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png";
const RENDER_TIMEOUT = 15_000;
const ZOOM = 16;

type Options = {
  width?: number;
  height?: number;
  /** Called per issue as soon as its image is ready. */
  onImage: (id: number, dataUrl: string) => void;
};

/**
 * Renders a small map image (PNG data URL) per issue, one after another, using a
 * single map outside the visible page. Much lighter than a map per issue.
 */
export async function renderIssueMapImages(
  issues: MapIssue[],
  { width = 320, height = 240, onImage }: Options,
) {
  const target = document.createElement("div");
  Object.assign(target.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${width}px`,
    height: `${height}px`,
  });
  document.body.append(target);

  const source = new VectorSource();
  const map = new OlMap({
    target,
    controls: [],
    interactions: [],
    pixelRatio: 2,
    layers: [
      new TileLayer({
        source: new XYZ({ url: BASE_MAP_URL, crossOrigin: "anonymous" }),
      }),
      new VectorLayer({ source }),
    ],
    view: new View(),
  });
  const format = new GeoJSONFormat({
    dataProjection: "EPSG:4326",
    featureProjection: "EPSG:3857",
  });

  try {
    for (const issue of issues) {
      const feature = format.readFeature({
        type: "Feature",
        geometry: issue.geometry,
        properties: {},
      }) as Feature;
      feature.setStyle(getIssueMapStyle(feature, issue, true, ZOOM));
      source.clear();
      source.addFeature(feature);
      map.getView().fit(feature.getGeometry()!.getExtent(), {
        padding: [24, 24, 24, 24],
        maxZoom: ZOOM,
      });
      await renderComplete(map);
      const dataUrl = exportMapImage(map);
      if (dataUrl) onImage(issue.id, dataUrl);
    }
  } finally {
    map.setTarget(undefined);
    target.remove();
  }
}

function renderComplete(map: OlMap) {
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, RENDER_TIMEOUT);
    map.once("rendercomplete", () => {
      clearTimeout(timeout);
      resolve();
    });
    map.render();
  });
}

/**
 * Combines the layer canvases into one image at the map's pixel ratio, as in the
 * OpenLayers export example.
 */
export function exportMapImage(map: OlMap): string | null {
  const [width, height] = map.getSize() ?? [];
  const layerCanvases = map
    .getViewport()
    ?.querySelectorAll<HTMLCanvasElement>(".ol-layer canvas, canvas.ol-layer");
  if (!width || !height || !layerCanvases?.length) return null;

  const pixelRatio = map.getPixelRatio();
  const canvas = document.createElement("canvas");
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;
  const context = canvas.getContext("2d");
  if (!context) return null;

  for (const layerCanvas of layerCanvases) {
    if (!layerCanvas.width) continue;
    const container = layerCanvas.parentElement;
    context.globalAlpha = Number(
      container?.style.opacity || layerCanvas.style.opacity || 1,
    );
    // The CSS transform maps the layer canvas to CSS pixels; scale back up.
    const matrix = layerCanvas.style.transform
      .match(/^matrix\(([^(]*)\)$/)?.[1]
      ?.split(",")
      .map(Number) ?? [1 / pixelRatio, 0, 0, 1 / pixelRatio, 0, 0];
    const [a, b, c, d, e, f] = matrix.map((value) => value * pixelRatio) as [
      number,
      number,
      number,
      number,
      number,
      number,
    ];
    context.setTransform(a, b, c, d, e, f);
    context.drawImage(layerCanvas, 0, 0);
  }
  context.setTransform(1, 0, 0, 1, 0, 0);

  try {
    return canvas.toDataURL("image/png");
  } catch (error) {
    // A tainted canvas, e.g. when a tile came without CORS headers.
    console.error("Failed to export the map image:", error);
    return null;
  }
}
