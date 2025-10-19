interface OpenGraphOptions {
  title: string;
  description?: string;
  type?: "website" | "article";
  imageUrl?: string | null;
  url?: string;
}

/**
 * Composable to set Open Graph metadata for a page
 */
export function useOpenGraph(options: OpenGraphOptions) {
  const requestURL = useRequestURL();
  const baseUrl = requestURL.origin;

  const {
    title,
    type = "website",
    imageUrl = null,
    url = requestURL.href,
  } = options;

  const fullImageUrl = imageUrl ? `${baseUrl}${imageUrl}` : null;

  const meta = [
    { property: "og:title", content: title },
    { property: "og:type", content: type },
    { property: "og:url", content: url },
    { property: "og:site_name", content: "Fietsersbond Deventer" },
  ];

  // Only add image meta tags if imageUrl exists
  if (fullImageUrl) {
    meta.push({ property: "og:image", content: fullImageUrl });
  }

  useHead({
    title,
    meta,
  });
}
