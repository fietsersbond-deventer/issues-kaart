export default defineEventHandler(async (event) => {
  const path = getRequestPath(event);

  // Skip auth for public routes
  if (path.startsWith("/api/auth/") || !path.startsWith("/api/")) {
    return;
  }

  const token = getHeader(event, "authorization")?.replace("Bearer ", "");

  if (!token) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  try {
    const session = await verify(token);
    // Add user to event context
    event.context.user = session;
  } catch (error) {
    throw createError({
      statusCode: 401,
      message: "Invalid session",
    });
  }
});
