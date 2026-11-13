export function parseSearchTerms(search: string): string[] {
  const terms: string[] = [];
  let currentTerm = "";
  let insideQuotes = false;

  for (const character of search) {

    if (character === '"') {
      insideQuotes = !insideQuotes;
    } else if (/\s/.test(character) && !insideQuotes) {
      if (currentTerm) {
        terms.push(currentTerm);
        currentTerm = "";
      }
    } else {
      currentTerm += character;
    }
  }

  if (currentTerm) {
    terms.push(currentTerm);
  }

  return terms;
}
