import type { User } from "~~/server/database/schema";

export default defineEventHandler(async (event) => {
  const token = getHeader(event, "authorization")?.replace("Bearer ", "");

  if (!token) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  try {
    const session: User = await verifyToken(token);
    return {
      accessToken: token,
      user: {
        id: session.id,
        username: session.username,
      },
    };
  } catch {
    throw createError({
      statusCode: 401,
      message: "Invalid session",
    });
  }
});
