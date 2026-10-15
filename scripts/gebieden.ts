/**
 * Manage app/assets/gebieden.geojson: the areas of the other Fietsersbond
 * map instances that are shown (and linked) on the map.
 *
 * Municipal boundaries come from CBS/PDOK (gemeente_gegeneraliseerd).
 *
 * Usage:
 *   pnpm gebieden list
 *   pnpm gebieden gemeenten [zoekterm]
 *   pnpm gebieden add <url> <gemeente> [gemeente...] [--name <naam>]
 *   pnpm gebieden remove <naam>
 *
 * `add` creates or replaces the area named --name (default: the first
 * municipality). Multiple municipalities are merged into one area, keeping
 * only the outer boundary.
 *
 * Examples:
 *   pnpm gebieden add https://zwolle.kaart.fietsersbond.nl/ Zwolle
 *   pnpm gebieden add https://rotterdam.kaart.fietsersbond.nl/ \
 *     Rotterdam Schiedam "Voorne aan Zee" --name Rotterdam
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import union from "@turf/union";
import { featureCollection } from "@turf/helpers";
import type {
  Feature,
  FeatureCollection,
  MultiPolygon,
  Polygon,
  Position,
} from "geojson";

const FILE = fileURLToPath(
  new URL("../app/assets/gebieden.geojson", import.meta.url),
);
const YEAR = process.env.CBS_YEAR ?? String(new Date().getFullYear());
const PDOK_URL =
  `https://service.pdok.nl/cbs/gebiedsindelingen/${YEAR}/wfs/v1_0` +
  "?request=GetFeature&service=WFS&version=2.0.0" +
  "&typeName=gebiedsindelingen:gemeente_gegeneraliseerd" +
  "&outputFormat=application/json&srsName=EPSG:4326";
// ~1 m precision is plenty for an overview map
const DECIMALS = 5;

type AreaProps = { name: string; areaUrl: string };
type AreaFeature = Feature<MultiPolygon, AreaProps>;
type Gemeente = Feature<Polygon | MultiPolygon, { statnaam: string }>;

function readAreas(): FeatureCollection<MultiPolygon, AreaProps> {
  return JSON.parse(readFileSync(FILE, "utf8"));
}

function writeAreas(areas: FeatureCollection<MultiPolygon, AreaProps>) {
  writeFileSync(FILE, JSON.stringify(areas, null, 2) + "\n");
}

async function fetchGemeenten(): Promise<Gemeente[]> {
  const res = await fetch(PDOK_URL);
  if (!res.ok) {
    throw new Error(
      `PDOK gaf ${res.status} voor jaar ${YEAR}; probeer CBS_YEAR=<jaar>`,
    );
  }
  const data = (await res.json()) as FeatureCollection;
  return data.features as Gemeente[];
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function findGemeente(gemeenten: Gemeente[], name: string): Gemeente {
  const match = gemeenten.find(
    (g) => normalize(g.properties.statnaam) === normalize(name),
  );
  if (match) return match;
  const suggestions = gemeenten
    .map((g) => g.properties.statnaam)
    .filter((n) => normalize(n).includes(normalize(name).slice(0, 4)));
  throw new Error(
    `Gemeente "${name}" niet gevonden.` +
      (suggestions.length ? ` Bedoel je: ${suggestions.join(", ")}?` : ""),
  );
}

function round(coords: Position[][][]): Position[][][] {
  const f = 10 ** DECIMALS;
  return coords.map((polygon) =>
    polygon.map((ring) =>
      ring.map(([x, y]) => [Math.round(x! * f) / f, Math.round(y! * f) / f]),
    ),
  );
}

function toMultiPolygon(geometry: Polygon | MultiPolygon): Position[][][] {
  return geometry.type === "Polygon"
    ? [geometry.coordinates]
    : geometry.coordinates;
}

function mergeGemeenten(gemeenten: Gemeente[]): Position[][][] {
  if (gemeenten.length === 1) return toMultiPolygon(gemeenten[0]!.geometry);
  const merged = union(featureCollection(gemeenten));
  if (!merged) throw new Error("Samenvoegen mislukt");
  return toMultiPolygon(merged.geometry);
}

async function add(args: string[]) {
  const nameIdx = args.indexOf("--name");
  let name: string | undefined;
  if (nameIdx !== -1) {
    name = args[nameIdx + 1];
    args.splice(nameIdx, 2);
  }
  const [url, ...names] = args;
  if (!url || !names.length) usage();
  const areaUrl = new URL(url!).href;
  name ??= names[0]!;

  const all = await fetchGemeenten();
  const selected = names.map((n) => findGemeente(all, n));

  const feature: AreaFeature = {
    type: "Feature",
    properties: { name, areaUrl },
    geometry: {
      type: "MultiPolygon",
      coordinates: round(mergeGemeenten(selected)),
    },
  };

  const areas = readAreas();
  const idx = areas.features.findIndex((f) => f.properties.name === name);
  if (idx === -1) areas.features.push(feature);
  else areas.features[idx] = feature;
  writeAreas(areas);

  console.log(
    `${idx === -1 ? "Toegevoegd" : "Vervangen"}: ${name} → ${areaUrl}\n` +
      `  gemeenten: ${selected.map((g) => g.properties.statnaam).join(", ")}`,
  );
}

function remove(name: string | undefined) {
  if (!name) usage();
  const areas = readAreas();
  const before = areas.features.length;
  areas.features = areas.features.filter((f) => f.properties.name !== name);
  if (areas.features.length === before) {
    throw new Error(`Gebied "${name}" niet gevonden`);
  }
  writeAreas(areas);
  console.log(`Verwijderd: ${name}`);
}

function list() {
  for (const f of readAreas().features) {
    console.log(`${f.properties.name.padEnd(25)} ${f.properties.areaUrl}`);
  }
}

async function listGemeenten(query?: string) {
  const names = (await fetchGemeenten())
    .map((g) => g.properties.statnaam)
    .filter((n) => !query || normalize(n).includes(normalize(query)))
    .sort((a, b) => a.localeCompare(b, "nl"));
  console.log(names.join("\n"));
}

function usage(): never {
  console.error(
    readFileSync(fileURLToPath(import.meta.url), "utf8")
      .match(/\/\*\*([\s\S]*?)\*\//)![1]!
      .replace(/^ \* ?/gm, ""),
  );
  process.exit(1);
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === "add") await add(rest);
  else if (command === "remove") remove(rest[0]);
  else if (command === "list") list();
  else if (command === "gemeenten") await listGemeenten(rest[0]);
  else usage();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
