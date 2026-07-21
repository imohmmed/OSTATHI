/**
 * Mobile livestream routes (non-admin)
 * Teacher: create, start, end streams
 * Student/Teacher: list course streams, get stream info
 */
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { livestreamsTable, teachersTable, coursesTable, studentCoursesTable, studentsTable } from "@workspace/db";
import { eq, and, or, desc } from "drizzle-orm";

const router: IRouter = Router();

// ── GET /mobile/courses/:courseId/livestreams ──────────────────────────────
// Returns all livestreams for a course (upcoming + live + recent ended)
router.get("/mobile/courses/:courseId/livestreams", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);

  const streams = await db
    .select({
      id: livestreamsTable.id,
      title: livestreamsTable.title,
      description: livestreamsTable.description,
      teacherId: livestreamsTable.teacherId,
      teacherName: teachersTable.fullName,
      courseId: livestreamsTable.courseId,
      status: livestreamsTable.status,
      scheduledAt: livestreamsTable.scheduledAt,
      endedAt: livestreamsTable.endedAt,
      viewersCount: livestreamsTable.viewersCount,
      createdAt: livestreamsTable.createdAt,
    })
    .from(livestreamsTable)
    .leftJoin(teachersTable, eq(livestreamsTable.teacherId, teachersTable.id))
    .where(eq(livestreamsTable.courseId, courseId))
    .orderBy(desc(livestreamsTable.scheduledAt));

  res.json(streams);
});

// ── GET /mobile/livestreams/:id ───────────────────────────────────────────
router.get("/mobile/livestreams/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [stream] = await db
    .select({
      id: livestreamsTable.id,
      title: livestreamsTable.title,
      description: livestreamsTable.description,
      teacherId: livestreamsTable.teacherId,
      teacherName: teachersTable.fullName,
      courseId: livestreamsTable.courseId,
      courseName: coursesTable.title,
      status: livestreamsTable.status,
      scheduledAt: livestreamsTable.scheduledAt,
      endedAt: livestreamsTable.endedAt,
      viewersCount: livestreamsTable.viewersCount,
    })
    .from(livestreamsTable)
    .leftJoin(teachersTable, eq(livestreamsTable.teacherId, teachersTable.id))
    .leftJoin(coursesTable, eq(livestreamsTable.courseId, coursesTable.id))
    .where(eq(livestreamsTable.id, id));

  if (!stream) { res.status(404).json({ error: "Not found" }); return; }
  res.json(stream);
});

// ── POST /mobile/teacher/livestreams ─────────────────────────────────────
// Teacher creates a new livestream for a course
router.post("/mobile/teacher/livestreams", async (req, res): Promise<void> => {
  const { teacherId, courseId, title, scheduledAt, description } = req.body;
  if (!teacherId || !courseId || !title || !scheduledAt) {
    res.status(400).json({ error: "teacherId, courseId, title, scheduledAt are required" });
    return;
  }

  // Verify teacher owns the course
  const [course] = await db
    .select({ teacherId: coursesTable.teacherId })
    .from(coursesTable)
    .where(eq(coursesTable.id, parseInt(courseId)));
  if (!course || course.teacherId !== parseInt(teacherId)) {
    res.status(403).json({ error: "Not authorized" }); return;
  }

  const [stream] = await db.insert(livestreamsTable).values({
    title,
    description: description || null,
    teacherId: parseInt(teacherId),
    courseId: parseInt(courseId),
    scheduledAt: new Date(scheduledAt),
    status: "scheduled",
  }).returning();

  res.status(201).json(stream);
});

// ── PATCH /mobile/teacher/livestreams/:id/start ───────────────────────────
router.patch("/mobile/teacher/livestreams/:id/start", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { teacherId } = req.body;

  const [stream] = await db.select({ teacherId: livestreamsTable.teacherId }).from(livestreamsTable).where(eq(livestreamsTable.id, id));
  if (!stream) { res.status(404).json({ error: "Not found" }); return; }
  if (teacherId && stream.teacherId !== parseInt(teacherId)) { res.status(403).json({ error: "Not authorized" }); return; }

  const [updated] = await db.update(livestreamsTable).set({ status: "live" }).where(eq(livestreamsTable.id, id)).returning();
  res.json(updated);
});

// ── PATCH /mobile/teacher/livestreams/:id/end ─────────────────────────────
router.patch("/mobile/teacher/livestreams/:id/end", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { teacherId } = req.body;

  const [stream] = await db.select({ teacherId: livestreamsTable.teacherId }).from(livestreamsTable).where(eq(livestreamsTable.id, id));
  if (!stream) { res.status(404).json({ error: "Not found" }); return; }
  if (teacherId && stream.teacherId !== parseInt(teacherId)) { res.status(403).json({ error: "Not authorized" }); return; }

  const [updated] = await db.update(livestreamsTable)
    .set({ status: "ended", endedAt: new Date() })
    .where(eq(livestreamsTable.id, id))
    .returning();
  res.json(updated);
});

// ── DELETE /mobile/teacher/livestreams/:id ────────────────────────────────
router.delete("/mobile/teacher/livestreams/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { teacherId } = req.body;

  const [stream] = await db.select({ teacherId: livestreamsTable.teacherId }).from(livestreamsTable).where(eq(livestreamsTable.id, id));
  if (!stream) { res.status(404).json({ error: "Not found" }); return; }
  if (teacherId && stream.teacherId !== parseInt(teacherId)) { res.status(403).json({ error: "Not authorized" }); return; }

  await db.delete(livestreamsTable).where(eq(livestreamsTable.id, id));
  res.sendStatus(204);
});

export default router;
