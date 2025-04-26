import bcrypt from "bcrypt";

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event);

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: "Username and password are required",
    });
  }

  const result = await hubDatabase().query(
    "SELECT id, username, password_hash FROM users WHERE username = $1",
    [username]
  );

  const user = result.rows[0];
  if (!user) {
    throw createError({
      statusCode: 401,
      message: "Invalid credentials",
    });
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw createError({
      statusCode: 401,
      message: "Invalid credentials",
    });
  }

  // Create session
  const session = await sign({
    id: user.id,
    username: user.username,
  });

  return {
    user: {
      id: user.id,
      username: user.username,
    },
    session,
  };
});
