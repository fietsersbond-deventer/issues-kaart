import type { FeatureCollection } from "geojson";
import type { AmsterdamImport } from "~~/shared/types/GeojsonImport";

const base = "https://maps.amsterdam.nl/open_geodata/";

export function parseAmsterdamLegend(text: string) {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const character = text[i];
    if (character === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (character === ";" || character === "\n")) {
      row.push(field.replace(/\r$/, ""));
      field = "";
      if (character === "\n") {
        if (row.some(Boolean)) rows.push(row);
        row = [];
      }
    } else field += character;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers =
    rows.shift()?.map((value) => value.replace(/^\uFEFF/, "")) ?? [];
  const rules = rows.map((values) =>
    Object.fromEntries(headers.map((key, index) => [key, values[index] ?? ""])),
  );
  if (
    !rules.length ||
    !["NAAM", "TABEL", "SELECTIEKOLOM", "SELECTIE", "OBJECTKLEUR"].every(
      (header) => headers.includes(header),
    )
  )
    throw new Error("Amsterdamse legenda heeft een onbekend formaat");
  return rules;
}

async function fetchText(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Leeg antwoord");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    bytes += part.value.byteLength;
    if (bytes > 25 * 1024 * 1024) {
      await reader.cancel();
      throw new Error("Bron is groter dan 25 MB");
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function loadAmsterdamImport(): Promise<AmsterdamImport> {
  const sourceUrl = `${base}legenda.php?LEGENDA=plushoofdnetten`;
  const rules = parseAmsterdamLegend(await fetchText(sourceUrl));
  const tables = [...new Set(rules.map((rule) => rule.TABEL!))];
  if (tables.length > 10 || tables.some((table) => !/^[A-Z0-9_]+$/.test(table)))
    throw new Error("Onverwachte datasets in de legenda");
  const warnings: string[] = [];
  const datasets = new Map<string, FeatureCollection>();
  for (const table of tables) {
    try {
      const data = JSON.parse(
        await fetchText(
          `${base}geojson_lnglat.php?KAARTLAAG=${encodeURIComponent(table)}&THEMA=plushoofdnetten`,
        ),
      );
      if (
        data?.type !== "FeatureCollection" ||
        !Array.isArray(data.features) ||
        !data.features.length
      )
        throw new Error("Geen objecten beschikbaar");
      datasets.set(table, data);
    } catch (error) {
      warnings.push(
        `${table}: bron niet beschikbaar (${error instanceof Error ? error.message : "onbekende fout"}).`,
      );
    }
  }
  if (!datasets.size) throw new Error("Geen Amsterdamse datasets beschikbaar");
  const categoryProperty = "Amsterdam kaartlaag";
  const features: FeatureCollection["features"] = [];
  const layers: AmsterdamImport["layers"] = [];
  for (const rule of rules) {
    const dataset = datasets.get(rule.TABEL!);
    if (!dataset) continue;
    const duplicateName =
      rules.filter((other) => other.NAAM === rule.NAAM).length > 1;
    const name = duplicateName
      ? `${rule.NAAM} (${rule.SELECTIEKOLOM})`
      : rule.NAAM!;
    let count = 0;
    for (const feature of dataset.features) {
      if (
        String(feature.properties?.[rule.SELECTIEKOLOM!] ?? "").trim() !==
        rule.SELECTIE
      )
        continue;
      features.push({
        ...feature,
        properties: { ...feature.properties, [categoryProperty]: name },
      });
      count++;
    }
    if (count)
      layers.push({
        name,
        color: /^#[0-9a-f]{6}$/i.test(rule.OBJECTKLEUR!)
          ? rule.OBJECTKLEUR!
          : "#2196F3",
      });
  }
  if (!features.length)
    throw new Error("Geen objecten komen overeen met de legenda");
  return {
    geojson: { type: "FeatureCollection", features },
    categoryProperty,
    titleProperty: "STT_NAAM",
    layers,
    sources: [...datasets].map(([table, data]) => ({
      table,
      features: data.features.length,
    })),
    sourceUrl,
    warnings,
  };
}
