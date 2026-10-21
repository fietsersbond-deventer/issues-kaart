import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { loadAmsterdamImport } from "~~/server/utils/amsterdamImport";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  try {
    return await loadAmsterdamImport();
  } catch (error) {
    throw createError({
      statusCode: 502,
      message:
        error instanceof Error
          ? error.message
          : "Amsterdamse data laden mislukt",
    });
  }
});
