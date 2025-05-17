import { requireUserSession } from "~~/server/utils/requireUserSession";

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
  const usedByIssues = await hubDatabase()
    .prepare("SELECT id, title FROM issues WHERE legend_id = ?")
    .bind(id)
    .all<{ id: number; title: string }>();

  if (usedByIssues.results && usedByIssues.results.length > 0) {
    throw createError({
      statusCode: 400,
      message: "Dit legenda item kan niet worden verwijderd omdat het in gebruik is",
      data: { issues: usedByIssues.results }
    });
  }

  // If no issues are using it, we can delete the legend
  const result = await hubDatabase()
    .prepare("DELETE FROM legend WHERE id = ? RETURNING id")
    .bind(id)
    .first<{ id: number }>();

  if (!result) {
    throw createError({
      statusCode: 404,
      message: `Legenda item met ID ${id} kon niet worden gevonden`,
    });
  }

  return { success: true };
});
