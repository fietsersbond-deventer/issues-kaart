import type { Geometry } from "geojson";
import { center } from "@turf/center";
import toBbox from "@turf/bbox";
import { getDb } from "~~/server/utils/db";
import { escapeLikePattern } from "~~/server/utils/escapeLikePattern";
import { parseSearchTerms } from "~~/app/utils/parseSearchTerms";

const MAX_RESULTS = 5;

/**
 * Lichte zoekfunctie over onderwerpen voor de Gazetteer-zoekbalk. Vindt
 * onderwerpen op titel/tags en levert meteen een locatie (centroid + bbox),
 * zodat ze net als PDOK-resultaten direct op de kaart getoond kunnen worden.
 */
export default defineEventHandler(async (event) => {
  const db = getDb();
  const search = String(getQuery(event).search ?? "");
  const searchTerms = parseSearchTerms(search);
  if (searchTerms.length === 0) return [];

  const conditions = searchTerms.map(
    () =>
      `(i.title LIKE ? ESCAPE '\\' COLLATE NOCASE OR EXISTS (
        SELECT 1 FROM issue_tags it JOIN tags t ON t.id = it.tag_id
        WHERE it.issue_id = i.id AND (
          t.description LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR t.label LIKE ? ESCAPE '\\' COLLATE NOCASE
          OR t.tag LIKE ? ESCAPE '\\' COLLATE NOCASE
        )
      ))`,
  );
  const likeParams = searchTerms.flatMap((term) => {
    const pattern = `%${escapeLikePattern(term)}%`;
    return [pattern, pattern, pattern, pattern];
  });

  const rows = db
    .prepare(
      `SELECT i.id, i.slug, i.title, i.geometry
       FROM issues i
       WHERE ${conditions.join(" OR ")}
       ORDER BY COALESCE(i.updated_at, i.created_at) DESC
       LIMIT ?`,
    )
    .all(...likeParams, MAX_RESULTS) as {
    id: number;
    slug: string;
    title: string;
    geometry: string;
  }[];

  return rows.map((row) => {
    const geometry = JSON.parse(row.geometry) as Geometry;
    const feature = { type: "Feature" as const, properties: {}, geometry };
    const [lon, lat] = center(feature).geometry.coordinates as [number, number];
    const [west, south, east, north] = toBbox(feature) as [
      number,
      number,
      number,
      number,
    ];
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      lat,
      lon,
      boundingbox: { south, west, north, east },
      geometry,
    };
  });
});
