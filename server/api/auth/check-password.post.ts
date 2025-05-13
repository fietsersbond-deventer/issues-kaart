import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

// Initialize zxcvbn with English language
const options = {
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
};

zxcvbnOptions.setOptions(options);

export default defineEventHandler(async (event) => {
  const { password } = await readBody(event);

  if (!password) {
    throw createError({
      statusCode: 400,
      message: 'Password is required',
    });
  }

  const result = zxcvbn(password);

  return {
    score: result.score,
    feedback: result.feedback,
    minimumScore: 3,
    isStrong: result.score >= 3,
  };
});