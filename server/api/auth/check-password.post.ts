import { testPassword } from "~~/server/utils/testPassword";

export default defineEventHandler(async (event) => {
  const { password } = await readBody(event);

  if (!password) {
    throw createError({
      statusCode: 400,
      message: "Password is required",
    });
  }

  return testPassword(password);
});
