import bcrypt from "bcryptjs";

function hashPassword(password: string): string {
  const salt = bcrypt.genSaltSync(10);
  return bcrypt.hashSync(password, salt);
}

export default defineNitroPlugin(async () => {
  const adminEmail = process.env.NUXT_ADMIN_EMAIL;
  if (!adminEmail) {
    console.log("No admin email configured, skipping admin user creation");
    return;
  }

  const db = hubDatabase();

  try {
    // Check if admin user exists
    const adminUser = await db
      .prepare("SELECT id, role FROM users WHERE username = ?")
      .bind(adminEmail)
      .first();

    if (!adminUser) {
      // Create admin user with random password if doesn't exist
      const randomPassword = Buffer.from(Math.random().toString())
        .toString("hex")
        .slice(0, 16);
      const passwordHash = hashPassword(randomPassword);

      await db
        .prepare(
          "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)"
        )
        .bind(adminEmail, passwordHash, "admin")
        .run();

      console.log(`Created admin user ${adminEmail} with random password`);
    } else if (adminUser.role !== "admin") {
      // Update role to admin if user exists but isn't admin
      await db
        .prepare("UPDATE users SET role = ? WHERE username = ?")
        .bind("admin", adminEmail)
        .run();

      console.log(`Updated user ${adminEmail} to admin role`);
    }
  } catch (error) {
    console.error("Error ensuring admin user:", error);
  }
});
