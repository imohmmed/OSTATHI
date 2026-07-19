import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

router.get("/notifications", requireAdmin, async (_req, res): Promise<void> => {
  const notifications = await db.select().from(notificationsTable).orderBy(notificationsTable.createdAt);
  res.json(notifications);
});

router.post("/notifications", requireAdmin, async (req, res): Promise<void> => {
  const { title, body, targetAudience } = req.body;
  if (!title || !body || !targetAudience) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [notification] = await db.insert(notificationsTable).values({
    title,
    body,
    targetAudience: targetAudience || "all",
    sentAt: new Date(),
  }).returning();
  res.status(201).json(notification);
});

router.delete("/notifications/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
  res.sendStatus(204);
});

export default router;
