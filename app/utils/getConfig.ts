import type { ConfigLayer } from "~/types/LayerConfig";

export function getConfig(): {
  baseLayers: ConfigLayer[];
} {
  return {
    baseLayers: [
      {
        type: "stadia",
        name: "licht",
        layer: "alidade_smooth",
        attributions: `© <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, © <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>, © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>`,
        // visible: true,
      },
      {
        type: "wms",
        name: "Luchtfoto",
        url: "https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0",
        layers: "Actueel_ortho25",
        format: "image/jpeg",
        attributions: '&copy; <a href="https://www.kadaster.nl">Kadaster</a>',
        // visible: true,
      },
      {
        type: "xyz",
        name: "Fietskaart",
        url: "https://a.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
        attributions:
          '&copy; <a href="http://opencyclemap.org">OpenCycleMap</a>',
        visible: true,
      },
      // {
      //   type: "tile",
      //   name: "Kaart",
      //   url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      //   attribution:
      //     '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      //   visible: false,
      // },
    ],
  };
}
