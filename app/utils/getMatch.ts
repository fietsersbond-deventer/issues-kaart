function snippetAround(
  string: string,
  index: number,
  termLength: number,
  whitespaces: number,
) {
  const _ws = [" ", "\t"];

  let whitespace = 0;
  let rightLimit;
  let leftLimit;

  // right trim index
  for (
    rightLimit = index + termLength;
    whitespace < whitespaces;
    rightLimit++
  ) {
    if (rightLimit >= string.length) {
      break;
    }
    if (_ws.indexOf(string.charAt(rightLimit)) >= 0) {
      whitespace += 1;
    }
  }

  whitespace = 0;
  // left trim index
  for (leftLimit = index; whitespace < whitespaces; leftLimit--) {
    if (leftLimit < 0) {
      break;
    }
    if (_ws.indexOf(string.charAt(leftLimit)) >= 0) {
      whitespace += 1;
    }
  }
  return {
    snippet: `...${string.substring(leftLimit + 1, rightLimit)}...`,
    end: rightLimit,
  };
}

export function getMatch(string: string, term: string, whitespaces = 4) {
  return getMatches(string, term, whitespaces)[0];
}

// Returns a snippet for every (non-overlapping) occurrence of term in string.
export function getMatches(string: string, term: string, whitespaces = 4) {
  if (!term) return [];
  const lowerString = string.toLowerCase();
  const lowerTerm = term.toLowerCase();

  const snippets: string[] = [];
  let searchFrom = 0;
  while (searchFrom <= string.length) {
    const index = lowerString.indexOf(lowerTerm, searchFrom);
    if (index < 0) break;

    const { snippet, end } = snippetAround(
      string,
      index,
      term.length,
      whitespaces,
    );
    snippets.push(snippet);
    searchFrom = Math.max(end, index + term.length);
  }
  return snippets;
}
