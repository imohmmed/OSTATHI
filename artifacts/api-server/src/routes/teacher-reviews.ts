import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { teacherReviewsTable, teachersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

// POST /teacher-reviews — anyone can submit (public)
router.post("/teacher-reviews", async (req, res): Promise<void> => {
  const { teacherId, liked, reason, studentName } = req.body;
  if (!teacherId || liked === undefined) {
    res.status(400).json({ error: "teacherId and liked are required" });
    return;
  }
  const [review] = await db.insert(teacherReviewsTable).values({
    teacherId: Number(teacherId),
    liked: Boolean(liked),
    reason: reason?.trim() || null,
    studentName: studentName?.trim() || null,
  }).returning();
  res.status(201).json(review);
});

// GET /teacher-reviews — admin only, returns all reviews with teacher name
router.get("/teacher-reviews", requireAdmin, async (req, res): Promise<void> => {
  const teacherId = req.query.teacherId ? Number(req.query.teacherId) : undefined;

  const rows = await db
    .select({
      id: teacherReviewsTable.id,
      teacherId: teacherReviewsTable.teacherId,
      liked: teacherReviewsTable.liked,
      reason: teacherReviewsTable.reason,
      studentName: teacherReviewsTable.studentName,
      createdAt: teacherReviewsTable.createdAt,
      teacherName: teachersTable.fullName,
    })
    .from(teacherReviewsTable)
    .leftJoin(teachersTable, eq(teacherReviewsTable.teacherId, teachersTable.id))
    .where(teacherId ? eq(teacherReviewsTable.teacherId, teacherId) : undefined)
    .orderBy(desc(teacherReviewsTable.createdAt));

  res.json(rows);
});

// DELETE /teacher-reviews/:id — admin only
router.delete("/teacher-reviews/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(teacherReviewsTable).where(eq(teacherReviewsTable.id, id));
  res.sendStatus(204);
});

export default router;
