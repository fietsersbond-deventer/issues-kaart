/**
 * Parse bounds from runtime config ensuring proper number conversion
 */
export function parseLocationBounds(config: {
  locationBounds: {
    west: string | number;
    south: string | number;
    east: string | number;
    north: string | number;
  };
}) {
  return {
    west: parseFloat(String(config.locationBounds.west)),
    south: parseFloat(String(config.locationBounds.south)),
    east: parseFloat(String(config.locationBounds.east)),
    north: parseFloat(String(config.locationBounds.north)),
  };
}
