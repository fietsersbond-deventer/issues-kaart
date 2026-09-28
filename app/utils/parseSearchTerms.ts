export function parseSearchTerms(search: string): string[] {
  const terms: string[] = [];
  let currentTerm = "";
  let insideQuotes = false;

  for (let index = 0; index < search.length; index++) {
    const character = search[index];

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
