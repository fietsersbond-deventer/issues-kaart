import type { H3Event, EventHandlerRequest } from "h3";

export function requireUserSession(event: H3Event<EventHandlerRequest>) {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }
}

export function requireAdminSession(event: H3Event<EventHandlerRequest>) {
  const user = event.context.user;
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }
  if (user.role !== "admin") {
    throw createError({
      statusCode: 403,
      message: "Admin access required",
    });
  }
}
