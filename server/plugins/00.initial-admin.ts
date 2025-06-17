// Track if admin initialization has been attempted
let adminInitialized = false;

export default defineNitroPlugin(async (nitroApp) => {
  // Add a hook that runs on the first request
  nitroApp.hooks.hook("request", async (event) => {
    // Only run once and only if we haven't checked yet
    if (adminInitialized) return;
    adminInitialized = true;

    // Get admin email from environment variables
    const adminEmail = process.env.NUXT_ADMIN_EMAIL;
    const adminName =
      process.env.NUXT_PUBLIC_ADMIN_NAME || "System Administrator";

    if (!adminEmail) {
      console.log("⚠️  No admin email provided - skipping admin creation");
      console.log("   Set NUXT_ADMIN_EMAIL to create initial admin");
      return;
    }

    try {
      const db = hubDatabase();

      // Check if any admin users already exist
      const adminCount = await db
        .prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'")
        .first<{ count: number }>();

      if (adminCount && adminCount.count > 0) {
        return;
      }

      // Check if this email already exists as any user
      const existingUser = await db
        .prepare("SELECT id, role FROM users WHERE username = ?")
        .bind(adminEmail)
        .first<{ id: number; role: string }>();

      if (existingUser) {
        if (existingUser.role !== "admin") {
          // Promote existing user to admin
          await db
            .prepare("UPDATE users SET role = ?, name = ? WHERE id = ?")
            .bind("admin", adminName, existingUser.id)
            .run();
          console.log(`✅ Promoted existing user ${adminEmail} to admin role`);
        } else {
          console.log(`✅ User ${adminEmail} already has admin role`);
        }
        return;
      }

      // Create new admin user - no password needed, will use reset flow
      const { randomBytes } = await import("crypto");
      const { default: bcrypt } = await import("bcryptjs");

      // Create temporary password that will be immediately invalidated
      const tempPassword = randomBytes(32).toString("hex");
      const salt = bcrypt.genSaltSync(10);
      const passwordHash = bcrypt.hashSync(tempPassword, salt);

      const result = await db
        .prepare(
          "INSERT INTO users (username, password_hash, name, role, created_at) VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP) RETURNING id, username, name, role"
        )
        .bind(adminEmail, passwordHash, adminName, "admin")
        .first<{ id: number; username: string; name: string; role: string }>();

      if (result) {
        console.log(
          `✅ Created initial admin account: ${result.username} (ID: ${result.id})`
        );
      } else {
        console.error("❌ Failed to create initial admin account");
      }
    } catch (error) {
      console.error("❌ Error creating initial admin account:", error);
    }
  });
});
