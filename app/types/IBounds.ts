export type IBoundsObject = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type IBoundsTuples = [[number, number], [number, number]];

export function isBoundsObject(arg: unknown): arg is IBoundsObject {
  return (
    typeof arg === "object" &&
    arg !== null &&
    "south" in arg &&
    typeof arg.south === "number" &&
    "west" in arg &&
    typeof arg.west === "number" &&
    "north" in arg &&
    typeof arg.north === "number" &&
    "east" in arg &&
    typeof arg.east === "number"
  );
}

export function isBoundsTuples(arg: unknown): arg is IBoundsTuples {
  return (
    Array.isArray(arg) &&
    arg.length === 2 &&
    Array.isArray(arg[0]) &&
    Array.isArray(arg[1]) &&
    arg[0].length === 2 &&
    arg[1].length === 2 &&
    typeof arg[0][0] === "number" &&
    typeof arg[0][1] === "number" &&
    typeof arg[1][0] === "number" &&
    typeof arg[1][1] === "number"
  );
}
