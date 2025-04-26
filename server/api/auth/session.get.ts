import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.NUXT_JWT_SECRET || "your-secret-key";

async function verify(token: string) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) reject(err);
      resolve(decoded);
    });
  });
}

export default defineEventHandler(async (event) => {
  const token = getHeader(event, "authorization")?.replace("Bearer ", "");

  if (!token) {
    throw createError({
      statusCode: 401,
      message: "Unauthorized",
    });
  }

  try {
    const session = await verify(token);
    return session;
  } catch {
    throw createError({
      statusCode: 401,
      message: "Invalid session",
    });
  }
});
