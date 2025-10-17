import { getDb } from "~~/server/utils/db";
import { extractImageUrl } from "~~/server/utils/extractImageUrl";

/**
 * Flexible endpoint to fetch issues with optional field selection
 * Query parameters:
 * - fields: comma-separated list of fields to return (e.g., "id,title,color,geometry")
 *   If not specified, returns all fields
 *
 * Examples:
 * - /api/issues?fields=id,title,color,geometry (for map view)
 * - /api/issues?fields=id,title,legend_id,legend_name,created_at (for admin list)
 * - /api/issues (for full data)
 */
export default defineEventHandler(async (event) => {
  const db = getDb();
  const query = getQuery(event);
  const requestedFields = query.fields ? String(query.fields).split(",") : null;

  // Define available fields and their SQL expressions
  const availableFields = {
    id: "i.id",
    title: "i.title",
    description: "i.description",
    legend_id: "i.legend_id",
    legend_name: "l.name as legend_name",
    color: "l.color",
    geometry: "i.geometry",
    created_at: "i.created_at",
    imageUrl: "i.description", // Special field - will be processed
  };

  let selectFields: string;
  let includeGeometry = true;
  let includeImageUrl = false;

  if (requestedFields && requestedFields.length > 0) {
    // Validate and build SELECT clause from requested fields
    const validFields = requestedFields.filter(
      (field) => field.trim() in availableFields
    );

    if (validFields.length === 0) {
      throw createError({
        statusCode: 400,
        message: "No valid fields specified",
      });
    }

    // Check if imageUrl is requested
    includeImageUrl = validFields.includes("imageUrl");

    // Build select fields, replacing imageUrl with description temporarily
    const sqlFields = validFields.map((field) => {
      if (field.trim() === "imageUrl") {
        return "i.description"; // We'll process this after fetching
      }
      return availableFields[field.trim() as keyof typeof availableFields];
    });

    selectFields = [...new Set(sqlFields)].join(", "); // Remove duplicates

    includeGeometry = validFields.includes("geometry");
  } else {
    // Return all fields if none specified
    selectFields = `i.id, i.title, i.description, i.legend_id,
     l.name as legend_name, l.color,
     i.geometry, i.created_at`;
  }

  const rows = db
    .prepare(
      `SELECT ${selectFields}
     FROM issues i 
     LEFT JOIN legend l ON i.legend_id = l.id 
     ORDER BY i.created_at DESC`
    )
    .all();

  // Process results
  return rows.map((issue) => {
    const result: Record<string, unknown> = { ...issue };

    // Parse geometry if included
    if (includeGeometry && typeof issue.geometry === "string") {
      result.geometry = JSON.parse(issue.geometry);
    }

    // Add imageUrl if requested (returns URL path, not actual data)
    if (includeImageUrl && typeof issue.description === "string") {
      // Check if issue has an image in description
      const hasImage = extractImageUrl(issue.description) !== null;
      result.imageUrl = hasImage ? `/api/issues/${issue.id}/image` : null;

      // Remove description from result if it wasn't explicitly requested
      if (requestedFields && !requestedFields.includes("description")) {
        delete result.description;
      }
    }

    return result;
  });
});
