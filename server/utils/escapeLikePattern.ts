// Escape LIKE wildcards so search terms are matched literally.
export function escapeLikePattern(term: string): string {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}
