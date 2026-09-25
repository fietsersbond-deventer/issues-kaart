import { loadQuill } from "@vueup/vue-quill";

/**
 * De waarde die in/uit een streetview-embed blot wordt gehaald - dit zijn
 * dezelfde velden die het `/api/streetview/parse`-endpoint teruggeeft.
 */
export interface StreetViewEmbedValue {
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  fov: number;
  panoId: string;
  previewDataUrl: string;
  embedSrc: string;
}

let registerPromise: Promise<void> | null = null;

/**
 * Registreert de "klik om te laden"-Street View-placeholder als een
 * volwaardige Quill-embed (blot), zodat deze de HTML<->Delta-conversie van
 * Quill overleeft.
 *
 * Waarom dit nodig is: Quill slaat NIETS als losse HTML op, maar zet alles om
 * naar zijn eigen interne "Delta"-model, opgebouwd uit door Quill herkende
 * bouwstenen ("blots": bold, image, video, enz.). Een gewone <div> met eigen
 * data-* attributen is voor Quill onbekend - die zou bij het invoegen via
 * `dangerouslyPasteHTML` gewoon weer verwijderd worden (met uitzondering van
 * de <img> erin, want "image" is wél een ingebouwd blot). Door zelf een blot
 * met de naam "streetviewEmbed" te registreren, leert Quill deze placeholder
 * wél herkennen, bewaren en correct terugschrijven naar HTML.
 *
 * Deze functie is memoized (registreert maar één keer, ook bij herhaaldelijk
 * aanroepen) en gebruikt bewust `@vueup/vue-quill`'s eigen `loadQuill()`
 * i.p.v. zelf het "quill"-pakket te importeren. Zo registreren we altijd op
 * exact dezelfde Quill-klasse/registry die de <QuillEditor>-component zelf
 * ook gebruikt - anders bestaat het risico dat twee verschillende
 * module-instanties van Quill door elkaar lopen en de registratie dus niet
 * zichtbaar is voor de daadwerkelijk actieve editor.
 *
 * Belangrijk: aanroepers moeten dit AWAITEN vóórdat ze content invoegen of
 * laten parsen die deze embed bevat - dus zowel bij het invoegen via de
 * "Invoegen"-knop, als (impliciet, via de vroege aanroep in EditForm) vóórdat
 * de editor een al opgeslagen omschrijving met een bestaande embed inleest.
 */
export function ensureStreetViewEmbedBlotRegistered(): Promise<void> {
  if (!registerPromise) {
    registerPromise = loadQuill().then((Quill) => {
      // "blots/block/embed" is Quill's eigen basisklasse voor blok-elementen
      // die als één geheel worden behandeld (net als Quill's ingebouwde
      // "video"-embed, die op dezelfde manier is opgebouwd). We casten naar
      // `any` omdat Quill's eigen types hier geen bruikbare generieke variant
      // van bieden.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const BlockEmbed = Quill.import("blots/block/embed") as any;

      class StreetViewEmbedBlot extends BlockEmbed {
        // De naam waarmee we deze embed straks aanroepen via
        // `quill.insertEmbed(index, "streetviewEmbed", waarde)`.
        static blotName = "streetviewEmbed";
        // Class + tag van het uiteindelijke DOM-element - moet overeenkomen
        // met wat sanitizeHtml.ts server-side toestaat voor `div.streetview-embed`.
        static className = "streetview-embed";
        static tagName = "DIV";

        // Bouwt het daadwerkelijke DOM-element op basis van de opgegeven
        // waarde: een <div> met alle data-* attributen (voor later gebruik
        // door useStreetViewEmbeds.ts) plus de al opgehaalde, statische
        // voorvertoning als <img>.
        static create(value: StreetViewEmbedValue) {
          const node: HTMLElement = super.create(value);
          node.setAttribute("data-lat", String(value.lat));
          node.setAttribute("data-lng", String(value.lng));
          node.setAttribute("data-heading", String(value.heading));
          node.setAttribute("data-pitch", String(value.pitch));
          node.setAttribute("data-fov", String(value.fov));
          node.setAttribute("data-pano-id", value.panoId);
          node.setAttribute("data-embed-src", value.embedSrc);

          const img = document.createElement("img");
          img.setAttribute("src", value.previewDataUrl);
          img.setAttribute("alt", "Street View voorvertoning");
          node.appendChild(img);

          return node;
        }

        // Het omgekeerde van create(): leest de waarde weer uit een bestaand
        // DOM-element - nodig zodat Quill (bijv. bij copy/paste binnen de
        // editor) de embed correct kan dupliceren/serialiseren.
        static value(node: HTMLElement): StreetViewEmbedValue {
          const img = node.querySelector("img");
          return {
            lat: Number(node.getAttribute("data-lat")),
            lng: Number(node.getAttribute("data-lng")),
            heading: Number(node.getAttribute("data-heading")),
            pitch: Number(node.getAttribute("data-pitch")),
            fov: Number(node.getAttribute("data-fov")),
            panoId: node.getAttribute("data-pano-id") ?? "",
            previewDataUrl: img?.getAttribute("src") ?? "",
            embedSrc: node.getAttribute("data-embed-src") ?? "",
          };
        }
      }

      Quill.register(StreetViewEmbedBlot);
    });
  }
  return registerPromise;
}
