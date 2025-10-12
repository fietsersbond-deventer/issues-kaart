import { requireUserSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireUserSession(event);

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({
      statusCode: 400,
      message: "Legenda ID is verplicht",
    });
  }

  // Check if there are any issues using this legend before trying to delete
  const db = getDb();
  const usedByIssues = db
    .prepare("SELECT id, title FROM issues WHERE legend_id = ?")
    .all(id) as Array<{ id: number; title: string }>;

  if (usedByIssues.length > 0) {
    throw createError({
      statusCode: 400,
      message:
        "Dit legenda item kan niet worden verwijderd omdat het in gebruik is",
      data: { issues: usedByIssues },
    });
  }

  // If no issues are using it, we can delete the legend
  const result = db
    .prepare("DELETE FROM legend WHERE id = ? RETURNING id")
    .get(id) as { id: number } | undefined;

  if (!result) {
    throw createError({
      statusCode: 404,
      message: `Legenda item met ID ${id} kon niet worden gevonden`,
    });
  }

  return { success: true };
});
