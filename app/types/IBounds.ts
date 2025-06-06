/* eslint-disable @typescript-eslint/no-explicit-any */

export type IBoundsObject = {
  south: number;
  west: number;
  north: number;
  east: number;
};

export type IBoundsTuples = [[number, number], [number, number]];

export function isBoundsObject(arg: any): arg is IBoundsObject {
  return (
    arg.south !== undefined &&
    arg.west !== undefined &&
    arg.north !== undefined &&
    arg.east !== undefined
  );
}

export function isBoundsTuples(arg: any): arg is IBoundsTuples {
  return (
    arg.length === 2 &&
    arg[0].length === 2 &&
    arg[1].length === 2 &&
    typeof arg[0][0] === "number" &&
    typeof arg[0][1] === "number" &&
    typeof arg[1][0] === "number" &&
    typeof arg[1][1] === "number"
  );
}
