export type ConfigTileLayer = {
  type: "xyz";
  url: string;
};

export type ConfigWMTSLayer = {
  type: "wmts";
  layer: string;
  url: string;
  style?: string;
  format?: string;
  matrixSet?: string;
  version?: string;
  styles?: string;
};

export type ConfigStadiaSLayer = {
  type: "stadia";
  layer:
    | "alidade_smooth"
    | "alidade_smooth_dark"
    | "outdoors"
    | "stamen_terrain"
    | "stamen_terrain_background"
    | "stamen_terrain_lines"
    | "stamen_toner_background"
    | "stamen_toner"
    | "stamen_toner_lines"
    | "stamen_toner_lite"
    | "stamen_watercolor"
    | "osm_brigh";
};

export type ConfigWMSLayer = {
  type: "wms";
  url: string;
  layers: string;
  format?: string;
  styles?: string;
};

export type ConfigLayer = (
  | ConfigTileLayer
  | ConfigWMTSLayer
  | ConfigWMSLayer
  | ConfigStadiaSLayer
) & {
  name: string;
  visible?: boolean;
  attributions: string;
  projection?: string;
};
