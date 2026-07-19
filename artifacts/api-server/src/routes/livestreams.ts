import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { livestreamsTable, teachersTable, coursesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

router.get("/livestreams", requireAdmin, async (req, res): Promise<void> => {
  const status = req.query.status as string | undefined;

  const streams = await db
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
      createdAt: livestreamsTable.createdAt,
    })
    .from(livestreamsTable)
    .leftJoin(teachersTable, eq(livestreamsTable.teacherId, teachersTable.id))
    .leftJoin(coursesTable, eq(livestreamsTable.courseId, coursesTable.id))
    .where(status ? eq(livestreamsTable.status, status) : undefined);

  res.json(streams);
});

router.post("/livestreams", requireAdmin, async (req, res): Promise<void> => {
  const { title, description, teacherId, courseId, scheduledAt } = req.body;
  if (!title || !teacherId || !courseId || !scheduledAt) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [stream] = await db.insert(livestreamsTable).values({
    title,
    description: description || null,
    teacherId,
    courseId,
    scheduledAt: new Date(scheduledAt),
    status: "scheduled",
  }).returning();

  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, teacherId));
  const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, courseId));

  res.status(201).json({ ...stream, teacherName: teacher?.fullName ?? null, courseName: course?.title ?? null });
});

router.patch("/livestreams/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { title, description, status, scheduledAt } = req.body;
  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description || null;
  if (status !== undefined) {
    updates.status = status;
    if (status === "ended") updates.endedAt = new Date();
  }
  if (scheduledAt !== undefined) updates.scheduledAt = new Date(scheduledAt);

  const [stream] = await db.update(livestreamsTable).set(updates).where(eq(livestreamsTable.id, id)).returning();
  if (!stream) {
    res.status(404).json({ error: "Livestream not found" });
    return;
  }
  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, stream.teacherId));
  const [course] = await db.select({ title: coursesTable.title }).from(coursesTable).where(eq(coursesTable.id, stream.courseId));

  res.json({ ...stream, teacherName: teacher?.fullName ?? null, courseName: course?.title ?? null });
});

router.delete("/livestreams/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(livestreamsTable).where(eq(livestreamsTable.id, id));
  res.sendStatus(204);
});

export default router;
