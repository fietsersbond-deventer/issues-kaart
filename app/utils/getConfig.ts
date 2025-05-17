import type { ConfigLayer } from "~/types/LayerConfig";

export function getConfig(): {
  baseLayers: ConfigLayer[];
} {
  return {
    baseLayers: [
      {
        type: "tile",
        name: "licht",
        url: "https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
        attribution: `© <a href="https://stadiamaps.com/" target="_blank">Stadia Maps</a>, © <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a>, © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>`,
        visible: true,
      },
      {
        type: "wms",
        name: "Luchtfoto",
        url: "https://service.pdok.nl/hwh/luchtfotorgb/wms/v1_0",
        layers: "Actueel_ortho25",
        format: "image/jpeg",
        attribution: '&copy; <a href="https://www.kadaster.nl">Kadaster</a>',
        visible: false,
      },
      {
        type: "tile",
        name: "Fietskaart",
        // url: "https://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png",
        url: "https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png",
        attribution:
          '&copy; <a href="http://opencyclemap.org">OpenCycleMap</a>',
        visible: false,
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
