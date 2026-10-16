import {
  generateAccessToken,
  rotateRefreshToken,
} from "../../utils/tokenUtils";

export default defineEventHandler(async (event) => {
  const { refreshToken } = await readBody(event);

  if (!refreshToken) {
    throw createError({
      statusCode: 400,
      message: "Refresh token is verplicht",
    });
  }

  try {
    const { user, refreshToken: newRefreshToken } =
      rotateRefreshToken(refreshToken);
    const accessToken = await generateAccessToken(user);

    return {
      token: accessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  } catch {
    throw createError({
      statusCode: 401,
      message: "Ongeldige refresh token",
    });
  }
});
