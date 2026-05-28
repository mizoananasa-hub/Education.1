import app from "./app";
import { logger } from "./lib/logger";
import { db, adminsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function ensureAdminExists() {
  try {
    const existing = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.username, "admin"))
      .limit(1);

    if (existing.length > 0) {
      logger.info({ username: "admin" }, "Admin account already exists");
      return;
    }

    const passwordHash = await bcrypt.hash("Admin@Learnova1", 12);
    await db.insert(adminsTable).values({ username: "admin", passwordHash });
    logger.info({ username: "admin" }, "Admin account created successfully");
  } catch (err) {
    logger.error({ err }, "Failed to ensure admin exists");
  }
}

async function start() {
  await ensureAdminExists();

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

start();
