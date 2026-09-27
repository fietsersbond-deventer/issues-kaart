export function getMatch(string: string, term: string, whitespaces = 4) {
  const index = string.toLowerCase().indexOf(term.toLowerCase());
  if (index >= 0) {
    var _ws = [" ", "\t"];

    var whitespace = 0;
    var rightLimit = 0;
    var leftLimit = 0;

    // right trim index
    for (
      rightLimit = index + term.length;
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
    return `...${string.substring(leftLimit + 1, rightLimit)}...`; // return match
  }
  return; // return nothing
}
