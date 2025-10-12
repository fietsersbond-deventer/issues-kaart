import { requireAdminSession } from "~~/server/utils/requireUserSession";
import { getDb } from "~~/server/utils/db";

export default defineEventHandler(async (event) => {
  requireAdminSession(event);

  const id = event.context.params?.id;
  const { username, name, role } = await readBody(event);

  if (!id) {
    throw createError({
      statusCode: 400,
      message: "User ID is required",
    });
  }

  if (!username) {
    throw createError({
      statusCode: 400,
      message: "Username is required",
    });
  }

  const db = getDb();

  try {
    const user = db
      .prepare(
        "UPDATE users SET username = ?, name = ?, role = ? WHERE id = ? RETURNING id, username, name, role, created_at"
      )
      .get(username, name || null, role, id) as
      | {
          id: number;
          username: string;
          name: string;
          role: string;
          created_at: string;
        }
      | undefined;

    if (!user) {
      throw createError({
        statusCode: 404,
        message: "User not found",
      });
    }

    return user;
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique constraint")) {
      throw createError({
        statusCode: 409,
        message: "Username already exists",
      });
    }
    throw error;
  }
});
