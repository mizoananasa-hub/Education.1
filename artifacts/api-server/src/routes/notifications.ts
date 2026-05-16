import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, or } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth.js";
import type { Request, Response } from "express";
import type { JwtPayload } from "../middlewares/auth.js";

const router = Router();
type AuthReq = Request & { user: JwtPayload };

router.get("/notifications", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;

  let rows;
  if (user.role === "student") {
    rows = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.userType, "student"), eq(notificationsTable.userId, user.id!)))
      .orderBy(notificationsTable.createdAt);
  } else {
    rows = await db.select().from(notificationsTable)
      .where(and(eq(notificationsTable.userType, "teacher"), eq(notificationsTable.teacherSubject, user.subject!)))
      .orderBy(notificationsTable.createdAt);
  }

  res.json(rows.reverse());
});

router.patch("/notifications/:id/read", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const id = parseInt(req.params.id as string, 10);
  await db.update(notificationsTable).set({ isRead: true }).where(eq(notificationsTable.id, id));
  res.json({ message: "Marked as read" });
});

router.patch("/notifications/read-all", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = (req as AuthReq).user;
  if (user.role === "student") {
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userType, "student"), eq(notificationsTable.userId, user.id!)));
  } else {
    await db.update(notificationsTable)
      .set({ isRead: true })
      .where(and(eq(notificationsTable.userType, "teacher"), eq(notificationsTable.teacherSubject, user.subject!)));
  }
  res.json({ message: "All marked as read" });
});

export default router;
