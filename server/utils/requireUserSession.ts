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
