import type { Issue } from "~~/shared/types/Issue";
import { toValue, type MaybeRefOrGetter } from "vue";

/**
 * Registreer reactieve Open Graph- en Twitter-metadata voor een onderwerppagina.
 *
 * Roep dit eenmaal aan tijdens de setup van de pagina, met het onderwerp of een
 * ref/getter ervoor. De callback van useHead leest steeds de actuele waarde.
 * Laden, vervangen en wissen van het onderwerp werken daardoor dezelfde
 * metadataregistratie bij, in plaats van telkens een nieuwe toe te voegen.
 *
 * Tijdens SSR wacht useSelectedIssue via onServerPrefetch op het laadverzoek.
 * De metadata komt daardoor al in de eerste HTML-response terecht, in plaats
 * van pas na hydration in de browser. Crawlers hebben die eerste HTML nodig.
 */
export function useIssueOpenGraph(source: MaybeRefOrGetter<Issue | null>) {
  const requestURL = useRequestURL();
  const baseUrl = requestURL.origin;
  const { organization } = useRuntimeConfig().public;

  useHead(() => {
    const issue = toValue(source);
    // Een nog niet geladen onderwerp of nieuw concept heeft geen socialmediapreview.
    // Een lege registratie verwijdert ook de eerdere metadata als de selectie wordt gewist.
    if (!issue) return {};

    const title = issue.title || "Onderwerp";
    const description = issue.description
      ? issue.description.replace(/<[^>]*>/g, "").substring(0, 200)
      : "Bekijk dit onderwerp op de kaart";

    const url = `${baseUrl}/kaart/${issue.slug || issue.id}`;
    const imageUrl = issue.imageUrl
      ? `${issue.imageUrl}${issue.imageUrl.includes("?") ? "&" : "?"}width=1200&height=630&maxBytes=1000000`
      : null;
    const fullImageUrl = imageUrl ? `${baseUrl}${imageUrl}` : null;

    const meta = [
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: organization.name },
      { name: "description", content: description },
    ];

    // Only add image meta tags if imageUrl exists
    if (fullImageUrl) {
      meta.push(
        { property: "og:image", content: fullImageUrl },
        { property: "og:image:type", content: "image/jpeg" },
        { property: "og:image:alt", content: title },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: fullImageUrl },
      );
    }

    return {
      title,
      meta,
    };
  });
}
