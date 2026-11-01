import { ZxcvbnFactory } from "@zxcvbn-ts/core";
import * as zxcvbnCommonPackage from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";

const options = {
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  translations: zxcvbnEnPackage.translations,
};
const zxcvbn = new ZxcvbnFactory(options);

export function testPassword(password: string) {
  const result = zxcvbn.check(password);

  return {
    score: result.score,
    feedback: result.feedback,
    minimumScore: 3,
    isStrong: result.score >= 3,
  };
}
