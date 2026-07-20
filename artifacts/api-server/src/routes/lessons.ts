import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  lessonsTable,
  lessonReactionsTable,
  lessonVideoProgressTable,
} from "@workspace/db";
import { eq, and, count, sql } from "drizzle-orm";

const router: IRouter = Router();

// ── GET /lessons/:id/reactions?studentId=X ────────────────────────────────────
router.get("/lessons/:id/reactions", async (req, res): Promise<void> => {
  const lessonId = parseInt(req.params.id, 10);
  const studentId = req.query.studentId ? parseInt(req.query.studentId as string, 10) : null;

  const [likes] = await db
    .select({ count: count() })
    .from(lessonReactionsTable)
    .where(and(eq(lessonReactionsTable.lessonId, lessonId), eq(lessonReactionsTable.reaction, "like")));

  const [dislikes] = await db
    .select({ count: count() })
    .from(lessonReactionsTable)
    .where(and(eq(lessonReactionsTable.lessonId, lessonId), eq(lessonReactionsTable.reaction, "dislike")));

  let myReaction: string | null = null;
  if (studentId) {
    const [row] = await db
      .select({ reaction: lessonReactionsTable.reaction })
      .from(lessonReactionsTable)
      .where(and(eq(lessonReactionsTable.lessonId, lessonId), eq(lessonReactionsTable.studentId, studentId)));
    myReaction = row?.reaction ?? null;
  }

  res.json({ likes: Number(likes.count), dislikes: Number(dislikes.count), myReaction });
});

// ── POST /lessons/:id/react ───────────────────────────────────────────────────
// body: { studentId, reaction: 'like'|'dislike'|null }
router.post("/lessons/:id/react", async (req, res): Promise<void> => {
  const lessonId = parseInt(req.params.id, 10);
  const { studentId, reaction } = req.body;
  if (!studentId) { res.status(400).json({ error: "studentId required" }); return; }

  if (!reaction) {
    // Remove reaction
    await db.delete(lessonReactionsTable)
      .where(and(eq(lessonReactionsTable.lessonId, lessonId), eq(lessonReactionsTable.studentId, studentId)));
    res.json({ ok: true });
    return;
  }

  // Upsert
  await db.insert(lessonReactionsTable)
    .values({ lessonId, studentId, reaction })
    .onConflictDoUpdate({
      target: [lessonReactionsTable.lessonId, lessonReactionsTable.studentId],
      set: { reaction },
    });

  res.json({ ok: true });
});

// ── GET /lessons/:id/progress?studentId=X ────────────────────────────────────
router.get("/lessons/:id/progress", async (req, res): Promise<void> => {
  const lessonId = parseInt(req.params.id, 10);
  const studentId = req.query.studentId ? parseInt(req.query.studentId as string, 10) : null;
  if (!studentId) { res.json({ positionSeconds: 0, completed: false }); return; }

  const [row] = await db
    .select()
    .from(lessonVideoProgressTable)
    .where(and(eq(lessonVideoProgressTable.lessonId, lessonId), eq(lessonVideoProgressTable.studentId, studentId)));

  res.json({ positionSeconds: row?.positionSeconds ?? 0, completed: row?.completed ?? false });
});

// ── POST /lessons/:id/progress ────────────────────────────────────────────────
// body: { studentId, positionSeconds, completed? }
router.post("/lessons/:id/progress", async (req, res): Promise<void> => {
  const lessonId = parseInt(req.params.id, 10);
  const { studentId, positionSeconds, completed } = req.body;
  if (!studentId) { res.status(400).json({ error: "studentId required" }); return; }

  await db.insert(lessonVideoProgressTable)
    .values({ lessonId, studentId, positionSeconds: positionSeconds ?? 0, completed: completed ?? false })
    .onConflictDoUpdate({
      target: [lessonVideoProgressTable.lessonId, lessonVideoProgressTable.studentId],
      set: { positionSeconds: positionSeconds ?? 0, completed: completed ?? false },
    });

  res.json({ ok: true });
});

export default router;
