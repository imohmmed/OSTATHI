import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reviewsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const isPublished = req.query.isPublished !== undefined
    ? req.query.isPublished === "true"
    : undefined;

  const reviews = isPublished !== undefined
    ? await db.select().from(reviewsTable).where(eq(reviewsTable.isPublished, isPublished))
    : await db.select().from(reviewsTable);

  res.json(reviews);
});

router.post("/reviews", requireAdmin, async (req, res): Promise<void> => {
  const { studentName, studentPhone, rating, comment, isPublished } = req.body;
  if (!studentName || !comment || rating == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [review] = await db.insert(reviewsTable).values({
    studentName,
    studentPhone: studentPhone || null,
    rating: Number(rating),
    comment,
    isPublished: isPublished ?? false,
  }).returning();
  res.status(201).json(review);
});

router.patch("/reviews/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { studentName, studentPhone, rating, comment, isPublished } = req.body;
  const updates: Record<string, any> = {};
  if (studentName !== undefined) updates.studentName = studentName;
  if (studentPhone !== undefined) updates.studentPhone = studentPhone || null;
  if (rating !== undefined) updates.rating = Number(rating);
  if (comment !== undefined) updates.comment = comment;
  if (isPublished !== undefined) updates.isPublished = isPublished;

  const [review] = await db.update(reviewsTable).set(updates).where(eq(reviewsTable.id, id)).returning();
  if (!review) {
    res.status(404).json({ error: "Review not found" });
    return;
  }
  res.json(review);
});

router.delete("/reviews/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
  res.sendStatus(204);
});

export default router;
