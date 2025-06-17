/**
 * Calculate center coordinates from bounding box
 */
export function calculateCenterFromBounds(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
}) {
  return {
    lat: (bounds.south + bounds.north) / 2,
    lon: (bounds.west + bounds.east) / 2,
  };
}
