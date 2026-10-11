import type { RouterConfig } from "@nuxt/schema";
import { stringifyQuery } from "vue-router";

export default {
  // Keep "+" (tag separator) readable in the URL instead of %2B.
  stringifyQuery: (query) => stringifyQuery(query).replace(/%2B/gi, "+"),
} satisfies RouterConfig;
