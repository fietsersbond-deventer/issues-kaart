import type { Geometry, LineString, Position } from "geojson";

type Mergeable = {
  geometry: Geometry;
  mergeKey?: string;
  sourceIndexes: number[];
};

/** Join degree-two endpoint chains only; branches and gaps remain separate. */
export function mergeLineSegments<T extends Mergeable>(issues: T[]): T[] {
  const result: T[] = [];
  const groups = new Map<string, T[]>();
  for (const issue of issues) {
    if (issue.geometry.type !== "LineString" || !issue.mergeKey) {
      result.push(issue);
      continue;
    }
    const group = groups.get(issue.mergeKey) ?? [];
    group.push(issue);
    groups.set(issue.mergeKey, group);
  }
  for (const group of groups.values()) {
    const edges = group.map(
      (issue) => (issue.geometry as LineString).coordinates,
    );
    const endpoints = new Map<string, number[]>();
    const ends = edges.map((coordinates, index) => {
      const keys = [
        JSON.stringify(coordinates[0]),
        JSON.stringify(coordinates.at(-1)),
      ] as const;
      for (const key of keys) {
        const adjacent = endpoints.get(key) ?? [];
        adjacent.push(index);
        endpoints.set(key, adjacent);
      }
      return keys;
    });
    // Duplicate segments must not become a spurious out-and-back closed road.
    const identities = new Map<string, number>();
    const blocked = new Set<string>();
    for (const [index, coordinates] of edges.entries()) {
      const forward = JSON.stringify(coordinates);
      const backward = JSON.stringify([...coordinates].reverse());
      const key = forward < backward ? forward : backward;
      if (identities.has(key))
        ends[index]!.forEach((endpoint) => blocked.add(endpoint));
      else identities.set(key, index);
    }
    const visited = new Uint8Array(group.length);
    const boundary = (endpoint: string) =>
      blocked.has(endpoint) || endpoints.get(endpoint)!.length !== 2;
    function walk(first: number, start: string) {
      const coordinates: Position[] = [];
      const sourceIndexes: number[] = [];
      let index = first,
        endpoint = start;
      while (!visited[index]) {
        visited[index] = 1;
        const edge = edges[index]!;
        const forward = ends[index]![0] === endpoint;
        if (forward) {
          for (let i = coordinates.length ? 1 : 0; i < edge.length; i++)
            coordinates.push(edge[i]!);
        } else {
          for (let i = edge.length - (coordinates.length ? 2 : 1); i >= 0; i--)
            coordinates.push(edge[i]!);
        }
        for (const source of group[index]!.sourceIndexes)
          sourceIndexes.push(source);
        endpoint = ends[index]![forward ? 1 : 0];
        if (boundary(endpoint)) break;
        const adjacent = endpoints.get(endpoint)!;
        const next = adjacent[0] === index ? adjacent[1]! : adjacent[0]!;
        if (visited[next]) break;
        index = next;
      }
      result.push({
        ...group[first]!,
        geometry: { type: "LineString", coordinates },
        sourceIndexes,
      });
    }
    for (let index = 0; index < group.length; index++) {
      if (visited[index]) continue;
      const [start, end] = ends[index]!;
      if (boundary(start)) walk(index, start);
      else if (boundary(end)) walk(index, end);
    }
    // The remaining components are closed rings, with no boundary endpoint.
    for (let index = 0; index < group.length; index++)
      if (!visited[index]) walk(index, ends[index]![0]);
  }
  return result;
}
