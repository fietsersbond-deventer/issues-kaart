import bcrypt from "bcryptjs";
import type { User } from "~~/server/database/schema";

function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event);

  if (!username || !password) {
    throw createError({
      statusCode: 400,
      message: "Username and password are required",
    });
  }

  try {
    const passwordHash = hashPassword(password);
    console.log("Generated password hash:", passwordHash);
    console.log("Hash length:", passwordHash.length);

    // Ensure the hash is properly encoded
    const user: User | null = await hubDatabase()
      .prepare(
        "INSERT INTO users (username, password_hash) VALUES (?1, ?2) RETURNING id, username, password_hash, created_at"
      )
      .bind(username, passwordHash)
      .first();

    // Verify the stored hash matches what we generated
    console.log("Stored hash:", user.password_hash);
    console.log("Stored hash length:", user.password_hash.length);

    // Test verification immediately after creation
    const verifyHash = await bcrypt.compare(password, user.password_hash);
    console.log("Immediate verify result:", verifyHash);

    return {
      id: user.id,
      username: user.username,
      created_at: user.created_at,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("unique constraint")) {
      throw createError({
        statusCode: 409,
        message: "Username already exists",
      });
    }
    throw error;
  }
});
