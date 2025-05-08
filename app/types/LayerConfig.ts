export type ConfigTileLayer = {
  type: "tile";
  url: string;
};

export type ConfigWMTSLayer = {
  type: "wmts";
  layer: string;
  url: string;
  style?: string;
  format?: string;
  tilematrixset?: string;
  version?: string;
};

export type ConfigWMSLayer = {
  type: "wms";
  url: string;
  layers: string;
  format?: string;
};

export type ConfigLayer = (
  | ConfigTileLayer
  | ConfigWMTSLayer
  | ConfigWMSLayer
) & { name: string; visible: boolean; attribution: string };
