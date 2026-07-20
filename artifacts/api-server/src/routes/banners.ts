import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bannersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

// Public — get active banners ordered
router.get("/banners", async (_req, res): Promise<void> => {
  const banners = await db
    .select()
    .from(bannersTable)
    .where(eq(bannersTable.isActive, true))
    .orderBy(asc(bannersTable.orderIndex));
  res.json(banners);
});

// Admin — get all banners
router.get("/admin/banners", requireAdmin, async (_req, res): Promise<void> => {
  const banners = await db.select().from(bannersTable).orderBy(asc(bannersTable.orderIndex));
  res.json(banners);
});

// Admin — create banner
router.post("/admin/banners", requireAdmin, async (req, res): Promise<void> => {
  const { imageUrl, linkUrl, orderIndex } = req.body;
  if (!imageUrl) { res.status(400).json({ error: "imageUrl مطلوب" }); return; }
  const [banner] = await db.insert(bannersTable).values({
    imageUrl,
    linkUrl: linkUrl || null,
    orderIndex: orderIndex ?? 0,
    isActive: true,
  }).returning();
  res.status(201).json(banner);
});

// Admin — update banner
router.put("/admin/banners/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { imageUrl, linkUrl, orderIndex, isActive } = req.body;
  const updates: Record<string, any> = {};
  if (imageUrl !== undefined) updates.imageUrl = imageUrl;
  if (linkUrl !== undefined) updates.linkUrl = linkUrl || null;
  if (orderIndex !== undefined) updates.orderIndex = orderIndex;
  if (isActive !== undefined) updates.isActive = isActive;
  const [banner] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, id)).returning();
  if (!banner) { res.status(404).json({ error: "البانر غير موجود" }); return; }
  res.json(banner);
});

// Admin — delete banner
router.delete("/admin/banners/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(bannersTable).where(eq(bannersTable.id, id));
  res.sendStatus(204);
});

export default router;
