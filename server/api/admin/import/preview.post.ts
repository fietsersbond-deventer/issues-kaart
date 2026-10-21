import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { prepareGeojsonImport } from "~~/server/utils/geojsonImport";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);
  try {
    return prepareGeojsonImport(await readBody(event)).preview;
  } catch (error) {
    throw createError({
      statusCode: 400,
      message: error instanceof Error ? error.message : "Ongeldige GeoJSON",
    });
  }
});
