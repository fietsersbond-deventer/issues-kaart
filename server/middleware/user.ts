import { verifyToken } from "../utils/verifyToken";

export default defineEventHandler(async (event) => {
  const token = getHeader(event, "authorization")?.replace("Bearer ", "");
  if (token) {
    try {
      const session = await verifyToken(token);
      event.context.user = session;
    } catch (e) {
      console.error(e);
      event.context.user = null;
    }
  } else {
    event.context.user = null;
  }
});
