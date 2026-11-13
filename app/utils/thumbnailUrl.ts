/** Voegt grootteparameters toe zodat de image-endpoint een kleine versie levert. */
export function thumbnailUrl(imageUrl: string, size = 300): string {
  return `${imageUrl}${imageUrl.includes("?") ? "&" : "?"}width=${size}&height=${size}`;
}
