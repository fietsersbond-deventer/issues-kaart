import type { ExistingIssue, Issue } from "@/types/Issue";

/**
 * Set Open Graph metadata for an issue page
 */
export function useIssueOpenGraph(issue: ExistingIssue) {
  const requestURL = useRequestURL();
  const baseUrl = requestURL.origin;

  useHead(() => {
    const title = issue.title
      ? `${issue.title} - Fietsersbond`
      : "Nieuw onderwerp - Fietsersbond";

    const description = issue.description
      ? issue.description.replace(/<[^>]*>/g, "").substring(0, 200)
      : "Bekijk dit onderwerp op de Fietsersbond kaart";

    const url = `${baseUrl}/kaart/${issue.id}`;
    const imageUrl = issue.imageUrl;
    const fullImageUrl = imageUrl ? `${baseUrl}${imageUrl}` : null;

    const meta = [
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "Fietsersbond Deventer" },
      { name: "description", content: description },
    ];

    // Only add image meta tags if imageUrl exists
    if (fullImageUrl) {
      meta.push(
        { property: "og:image", content: fullImageUrl },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: fullImageUrl }
      );
    }

    return {
      title,
      meta,
    };
  });
}
