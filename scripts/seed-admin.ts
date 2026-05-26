import bcrypt from "bcrypt";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seedAdmin() {
  const username = "admin";
  const password = "Admin@Learnova1";

  const existing = await db.select().from(adminsTable).where(eq(adminsTable.username, username)).limit(1);
  if (existing.length > 0) {
    console.log("Admin already exists:", username);
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await db.insert(adminsTable).values({ username, passwordHash });

  console.log("✅ Admin seeded successfully");
  console.log("   Username:", username);
  console.log("   Password:", password);
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error("Error seeding admin:", err);
  process.exit(1);
});
