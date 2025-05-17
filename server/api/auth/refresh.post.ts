import { generateAccessToken, verifyRefreshToken } from "../../utils/tokenUtils";

export default defineEventHandler(async (event) => {
  const { refreshToken } = await readBody(event);

  if (!refreshToken) {
    throw createError({
      statusCode: 400,
      message: "Refresh token is verplicht",
    });
  }

  try {
    const user = await verifyRefreshToken(refreshToken);
    const accessToken = await generateAccessToken(user);

    return {
      token: accessToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  } catch (error) {
    throw createError({
      statusCode: 401,
      message: "Ongeldige refresh token",
    });
  }
});
