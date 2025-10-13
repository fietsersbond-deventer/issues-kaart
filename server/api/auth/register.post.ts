import bcrypt from "bcryptjs";
import type { User } from "~~/server/database/schema";
import { getDb } from "~~/server/utils/db";

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
    const db = getDb();
    // Insert user
    const insertStmt = db.prepare(
      "INSERT INTO users (username, password_hash) VALUES (?, ?)"
    );
    const result = insertStmt.run(username, passwordHash);

    // Fetch user
    const selectStmt = db.prepare(
      "SELECT id, username, password_hash, created_at FROM users WHERE id = ?"
    );
    const user = selectStmt.get(result.lastInsertRowid);

    if (!user) {
      throw createError({
        statusCode: 500,
        message: "Failed to create user",
      });
    }

    // Verify the stored hash matches what we generated
    console.log("Stored hash:", user.password_hash);
    if (typeof user.password_hash === "string") {
      console.log("Stored hash length:", user.password_hash.length);
      // Test verification immediately after creation
      const verifyHash = await bcrypt.compare(password, user.password_hash);
      console.log("Immediate verify result:", verifyHash);
    }

    return {
      id: user.id,
      username: user.username,
      created_at: user.created_at,
    };
  } catch (error: any) {
    if (error instanceof Error && error.message.includes("unique constraint")) {
      throw createError({
        statusCode: 409,
        message: "Username already exists",
      });
    }
    throw error;
  }
});
