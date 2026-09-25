/**
 * Parsing/building helpers voor het omzetten van een Google Maps Street View
 * deel-link naar (1) een eenmalig zelf-gehoste statische voorvertoning en
 * (2) een zelf-opgebouwde embed-URL zonder API-key, zodat een bezoeker van de
 * kaart pas contact maakt met Google op het moment dat hij/zij zelf op de
 * voorvertoning klikt (AVG: geen ongevraagd datatransport naar de VS).
 */

export interface StreetViewParams {
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  fov: number;
  panoId: string;
}

// Hosts waar een geplakte link (of één van de tussenliggende redirects) naartoe
// mag verwijzen. Alles buiten deze lijst wordt geweigerd (SSRF-bescherming).
const ALLOWED_SHARE_LINK_HOSTS = new Set([
  "goo.gl",
  "maps.app.goo.gl",
  "google.com",
  "www.google.com",
  "google.nl",
  "www.google.nl",
]);

const THUMBNAIL_HOST = "streetviewpixels-pa.googleapis.com";

const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 5000;
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

// Google weigert het standaard fetch User-Agent van Node (leeg/curl-achtig) met
// een 403 - zowel bij het volgen van de deel-link-redirect als bij het ophalen
// van de thumbnail. Door een "gewone browser" User-Agent mee te sturen werkt
// het weer.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36";

// Bijv. @52.1833412,6.0548965,10a,75y,49.61h,90t - de "a" achter het derde
// getal betekent dat dit een Street View-positie is (i.p.v. "z" voor een
// gewoon kaart-zoomniveau). De vijf haakjes-groepen leveren op:
// lat, lng, fov ("y"), heading ("h") en tilt ("t").
const STREETVIEW_URL_PATTERN =
  /@(-?\d+\.?\d*),(-?\d+\.?\d*),\d+\.?\d*a,(\d+\.?\d*)y,(-?\d+\.?\d*)h,(-?\d+\.?\d*)t/;
// Herkent een gewone (niet-Street View) kaartlocatie, bijv. "...,15z" - gebruikt
// om een duidelijkere foutmelding te geven dan "kon geen Street View data vinden".
const MAP_ZOOM_URL_PATTERN = /@(-?\d+\.?\d*),(-?\d+\.?\d*),\d+\.?\d*z/;
// Het foto-id van de panorama staat verderop in de URL, in het "data=" gedeelte,
// als "!1s<pano-id>!2e0".
const PANO_ID_PATTERN = /!1s([\w-]{15,30})!2e0/;
// Komt overeen met een @lat,lng coördinaat-segment, ongeacht waar dat in de URL
// staat. Google's redirect-doel kan zowel /maps/@... zijn als
// /maps/place/<naam>/@... - dus we zoeken alleen naar het coördinatenpatroon
// zelf, niet naar een vast pad-voorvoegsel.
const HAS_COORDS_PATTERN = /@-?\d+\.?\d*,-?\d+\.?\d*,/;

/**
 * Volgt redirects stap-voor-stap (nooit via fetch's automatische
 * redirect: "follow"), zodat elke tussenstap z'n hostname gecontroleerd kan
 * worden tegen de allowlist. Dit voorkomt SSRF via een kwaadwillende
 * redirect-keten (bijv. een link die na een paar hops naar een interne server
 * of naar een phishing-domein wijst).
 *
 * Let op: zodra een URL met een @lat,lng-segment gevonden wordt, stoppen we
 * direct met verder volgen. Als we die URL namelijk zelf nog een keer zouden
 * ophalen (in de veronderstelling dat het nog geen "eindstation" is), stuurt
 * Google - wanneer er geen sessie-cookie aanwezig is - door naar
 * consent.google.com (het EU-cookiemuur-scherm). Dat domein staat niet op de
 * allowlist, waardoor de link ten onrechte geweigerd zou worden.
 */
export async function resolveShareLink(url: string): Promise<string> {
  let current: URL;
  try {
    current = new URL(url);
  } catch {
    throw new Error("Dit is geen geldige URL");
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (current.protocol !== "https:") {
      throw new Error("Alleen https-links worden ondersteund");
    }
    if (!ALLOWED_SHARE_LINK_HOSTS.has(current.hostname)) {
      throw new Error("Alleen Google Maps links worden ondersteund");
    }
    if (HAS_COORDS_PATTERN.test(current.toString())) {
      // We hebben genoeg data gevonden om verder te gaan - niet nog een keer
      // fetchen, anders lopen we tegen de Google-cookiemuur aan (zie hierboven).
      return current.toString();
    }
    if (hop === MAX_REDIRECTS) {
      break;
    }

    // redirect: "manual" i.p.v. "follow", zodat we zelf de Location-header
    // kunnen uitlezen én controleren vóórdat we die volgen.
    const response = await fetch(current.toString(), {
      redirect: "manual",
      headers: { "User-Agent": BROWSER_USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (response.status < 300 || response.status >= 400) {
      // Geen redirect (3xx) én geen herkenbare Street View-URL: geef het op.
      throw new Error("Kon geen Street View positie vinden via deze link");
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error("Kon de link niet herleiden");
    }
    current = new URL(location, current);
  }

  throw new Error("Te veel omleidingen bij het herleiden van de link");
}

/**
 * Haalt lat/lng/heading/pitch/fov/panoId uit een herleide
 * google.com/maps/@...-URL.
 */
export function parseStreetViewUrl(url: string): StreetViewParams {
  const match = STREETVIEW_URL_PATTERN.exec(url);
  if (!match) {
    if (MAP_ZOOM_URL_PATTERN.test(url)) {
      // Dit ís een geldige Google Maps-link, maar geen Street View-positie
      // (gewoon een kaart-zoomniveau) - geef een gerichte foutmelding.
      throw new Error(
        "Dit is een gewone kaartlocatie, geen Street View positie. Open Street View en deel die link.",
      );
    }
    throw new Error("Kon geen Street View gegevens herkennen in deze link");
  }

  const panoMatch = PANO_ID_PATTERN.exec(url);
  const panoId = panoMatch?.[1];
  if (!panoId) {
    throw new Error("Kon geen Street View foto-id herkennen in deze link");
  }

  // TypeScript weet niet dat deze capture-groepen altijd gevuld zijn omdat de
  // regex hierboven al succesvol gematcht heeft - vandaar de cast.
  const [, lat, lng, fov, heading, tilt] = match as unknown as [
    string,
    string,
    string,
    string,
    string,
    string,
  ];

  return {
    lat: Number(lat),
    lng: Number(lng),
    heading: Number(heading),
    // Empirisch geverifieerd tegen de "grondwaarheid"-pitch die Google zelf
    // meestuurt in het "!6s<thumbnail-url>"-onderdeel van echte, herleide
    // links: tilt=90 (recht vooruit) -> pitch=0, tilt>90 (omhoog kijken) ->
    // negatieve pitch, tilt<90 (omlaag kijken) -> positieve pitch.
    // Dus NIET "tilt - 90" (dat gaf het omgekeerde teken), maar "90 - tilt".
    pitch: 90 - Number(tilt),
    fov: Number(fov),
    panoId,
  };
}

/**
 * Bouwt de URL voor Google's (interne, niet-gedocumenteerde) thumbnail-dienst.
 * Hiervoor is GEEN API-key nodig - dit is dezelfde dienst die Google's eigen
 * mobiele/"tactile" Maps-client gebruikt om panorama-thumbnails op te halen.
 */
export function buildStreetViewThumbnailUrl(
  panoId: string,
  heading: number,
  pitch: number,
  width = 640,
  height = 400,
): string {
  const params = new URLSearchParams({
    cb_client: "maps_sv.tactile",
    w: String(width),
    h: String(height),
    pitch: String(pitch),
    panoid: panoId,
    yaw: String(heading),
  });
  return `https://${THUMBNAIL_HOST}/v1/thumbnail?${params.toString()}`;
}

/**
 * Haalt de thumbnail-afbeelding eenmalig op, server-side, en geeft die terug
 * als data-URL zodat die rechtstreeks in de opgeslagen omschrijving gezet kan
 * worden. Een bezoeker van de kaart vraagt deze afbeelding dus NOOIT zelf bij
 * Google op - dat gebeurt alleen hier, één keer, vanaf onze server.
 */
export async function fetchThumbnailAsDataUrl(
  thumbnailUrl: string,
): Promise<string> {
  // Extra check: ook al is deze URL door onszelf opgebouwd, controleer alsnog
  // dat het protocol/domein exact klopt voordat we er iets mee ophalen
  // (defense in depth).
  const parsed = new URL(thumbnailUrl);
  if (parsed.protocol !== "https:" || parsed.hostname !== THUMBNAIL_HOST) {
    throw new Error("Ongeldige bron voor de voorvertoning");
  }

  const response = await fetch(parsed.toString(), {
    headers: { "User-Agent": BROWSER_USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error("Kon de Street View voorvertoning niet ophalen");
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    throw new Error("Onverwacht bestandstype voor de voorvertoning");
  }

  // Grootte begrenzen (op basis van header én werkelijke bytelengte) om
  // misbruik als "willekeurige-bestanden-proxy" of geheugenoverbelasting te
  // voorkomen.
  const contentLength = Number(response.headers.get("content-length") ?? "0");
  if (contentLength > MAX_THUMBNAIL_BYTES) {
    throw new Error("De voorvertoning is te groot");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_THUMBNAIL_BYTES) {
    throw new Error("De voorvertoning is te groot");
  }

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

/**
 * Bouwt de "verouderde" (niet-gedocumenteerde, geen API-key vereist) Street
 * View embed-URL op - hetzelfde formaat dat Google's eigen "Kaart insluiten"
 * HTML-generator produceert. Wordt pas gebruikt zodra een bezoeker écht op de
 * voorvertoning klikt.
 */
export function buildEmbedPbUrl(params: StreetViewParams): string {
  const { lat, lng, heading, pitch, panoId } = params;
  // Let op: het `4f`-veld van de embed gebruikt het TEGENOVERGESTELDE teken
  // t.o.v. de `pitch`-parameter van de thumbnail-dienst hierboven (empirisch
  // geverifieerd: thumbnail-pitch=-36 = omhoog kijken, maar diezelfde waarde
  // 1-op-1 doorgeven aan `4f` liet de embed juist omlaag kijken). Vandaar de
  // negatie hieronder.
  const embedPitch = -pitch;
  // Let op: het `5f`-veld van de embed is GEEN gezichtsveld in graden zoals de
  // "fov"/"y"-waarde uit de deel-link - het is een intern zoomniveau, waarbij
  // een KLEINERE waarde een BREDER beeld geeft (empirisch: zoomniveau ≈
  // clamp(5f - 1, 0, ongeveer 3)). Onze "fov" (bijv. 75) in dit veld stoppen
  // gaf daardoor een extreem ingezoomde, verkeerde weergave (werd geclampt
  // naar het maximale zoomniveau). We gebruiken daarom altijd een vaste,
  // brede waarde (1 = zoomniveau 0) i.p.v. de niet-compatibele fov-waarde.
  const embedZoomLevel = 1;
  const pb = `!1m0!3m2!1sen!2sus!4v0!6m8!1m7!1s${panoId}!2m2!1d${lat}!2d${lng}!3f${heading}!4f${embedPitch}!5f${embedZoomLevel}`;
  return `https://www.google.com/maps/embed?pb=${pb}`;
}
