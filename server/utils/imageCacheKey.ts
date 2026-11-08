import { createHash } from "node:crypto";
import type { H3Event } from "h3";

/**
 * Cachesleutel voor afbeeldingen. Meerdere sites delen één cache maar hebben
 * eigen onderwerpen met dezelfde ID's, dus de sleutel bevat de hostname van het
 * request (achter een reverse proxy: X-Forwarded-Host).
 * Nitro gebruikt deze sleutel in plaats van de standaardsleutel (pad + query).
 */
export function imageCacheKey(event: H3Event): string {
  const host = getRequestHost(event, { xForwardedHost: true }).toLowerCase();
  const hash = (value: string) =>
    createHash("sha256").update(value).digest("hex").slice(0, 16);
  // Nitro verwijdert tekens buiten \w, dus punten en dubbele punten worden "_".
  // De hash voorkomt botsingen tussen bijvoorbeeld "a.b" en "a_b" en begrenst de lengte.
  const readableHost = host.replace(/\W/g, "_").slice(0, 60);
  return `image_${readableHost}_${hash(host).slice(0, 8)}_${hash(event.path)}`;
}
