import { toRaw } from "vue";
import { Feature } from "ol";
import { Point, LineString, Polygon } from "ol/geom";
import type VectorSource from "ol/source/Vector";
import type { MapIssue, NewIssue } from "~~/shared/types/Issue";
import {
  getFeatureProperties,
  toPointCoords,
  toLineCoords,
  toPolygonCoords,
} from "./issueMapGeometry";

type Item = MapIssue | NewIssue;
type EditableFeature = Feature<Point | LineString | Polygon>;

/** Own native OL objects; Vue only tracks the collection of issue records. */
export function createIssueFeatureSync(source: VectorSource<EditableFeature>) {
  const records = new Map<
    number | string,
    { issue: Item; geometry: Item["geometry"]; feature: EditableFeature }
  >();
  return (issues: Item[]) => {
    const keep = new Set<number | string>();
    const added: EditableFeature[] = [];
    for (const item of issues) {
      const issue = toRaw(item);
      if (!issue.geometry) continue;
      const id = issue.id ?? "draft";
      keep.add(id);
      let record = records.get(id);
      if (record?.issue === issue && record.geometry === issue.geometry)
        continue;
      if (!record) {
        const existing = source.getFeatureById(id) as EditableFeature | null;
        const feature = existing ?? new Feature<Point | LineString | Polygon>();
        feature.setId(id);
        record = { issue, geometry: undefined, feature };
        records.set(id, record);
        if (!existing) added.push(feature);
      }
      if (record.geometry !== issue.geometry) {
        const geometry =
          issue.geometry.type === "Point"
            ? new Point(toPointCoords(issue))
            : issue.geometry.type === "LineString"
              ? new LineString(toLineCoords(issue))
              : new Polygon(toPolygonCoords(issue));
        record.feature.setGeometry(geometry);
      }
      record.feature.setProperties(getFeatureProperties(issue));
      record.issue = issue;
      record.geometry = issue.geometry;
    }
    for (const [id, record] of records) {
      if (!keep.has(id)) {
        source.removeFeature(record.feature);
        records.delete(id);
      }
    }
    if (added.length) source.addFeatures(added);
  };
}
