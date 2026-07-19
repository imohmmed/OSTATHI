import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  teachersTable,
  assistantsTable,
  teacherSubjectsTable,
  subjectsTable,
} from "@workspace/db";
import { eq, ilike, and, or, inArray } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

async function getTeacherSubjectIds(teacherId: number): Promise<number[]> {
  const rows = await db.select({ subjectId: teacherSubjectsTable.subjectId })
    .from(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, teacherId));
  return rows.map(r => r.subjectId);
}

router.get("/teachers", async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string, 10) : undefined;

  let teachers = search
    ? await db.select().from(teachersTable).where(or(
        ilike(teachersTable.fullName, `%${search}%`),
        ilike(teachersTable.username, `%${search}%`)
      ))
    : await db.select().from(teachersTable);

  if (subjectId) {
    const teacherIds = (await db.select({ teacherId: teacherSubjectsTable.teacherId })
      .from(teacherSubjectsTable).where(eq(teacherSubjectsTable.subjectId, subjectId)))
      .map(r => r.teacherId);
    teachers = teachers.filter(t => teacherIds.includes(t.id));
  }

  const result = await Promise.all(teachers.map(async t => ({
    ...t,
    password: undefined,
    subjectIds: await getTeacherSubjectIds(t.id),
  })));

  res.json(result);
});

router.post("/teachers", requireAdmin, async (req, res): Promise<void> => {
  const { fullName, phone, username, password, bio, avatarUrl, subjectIds } = req.body;
  if (!fullName || !phone || !username || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [teacher] = await db.insert(teachersTable).values({
    fullName, phone, username, password,
    bio: bio || "",
    avatarUrl: avatarUrl || null,
  }).returning();

  if (subjectIds?.length) {
    await db.insert(teacherSubjectsTable).values(
      subjectIds.map((sid: number) => ({ teacherId: teacher.id, subjectId: sid }))
    );
  }

  res.status(201).json({ ...teacher, password: undefined, subjectIds: subjectIds || [] });
});

router.get("/teachers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id));
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }
  const subjectIds = await getTeacherSubjectIds(id);
  res.json({ ...teacher, password: undefined, subjectIds });
});

router.patch("/teachers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { fullName, phone, username, password, bio, avatarUrl, subjectIds, isActive } = req.body;
  const updates: Record<string, any> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (username !== undefined) updates.username = username;
  if (password !== undefined) updates.password = password;
  if (bio !== undefined) updates.bio = bio;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl || null;
  if (isActive !== undefined) updates.isActive = isActive;

  const [teacher] = await db.update(teachersTable).set(updates).where(eq(teachersTable.id, id)).returning();
  if (!teacher) {
    res.status(404).json({ error: "Teacher not found" });
    return;
  }

  if (subjectIds !== undefined) {
    await db.delete(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, id));
    if (subjectIds.length) {
      await db.insert(teacherSubjectsTable).values(
        subjectIds.map((sid: number) => ({ teacherId: id, subjectId: sid }))
      );
    }
  }

  const updatedSubjectIds = await getTeacherSubjectIds(id);
  res.json({ ...teacher, password: undefined, subjectIds: updatedSubjectIds });
});

router.delete("/teachers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(teachersTable).where(eq(teachersTable.id, id));
  res.sendStatus(204);
});

// Assistants
router.get("/assistants", requireAdmin, async (req, res): Promise<void> => {
  const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string, 10) : undefined;
  const assistants = teacherId
    ? await db.select().from(assistantsTable).where(eq(assistantsTable.teacherId, teacherId))
    : await db.select().from(assistantsTable);

  const result = await Promise.all(assistants.map(async a => {
    const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, a.teacherId));
    return { ...a, password: undefined, teacherName: teacher?.fullName ?? null };
  }));

  res.json(result);
});

router.post("/assistants", requireAdmin, async (req, res): Promise<void> => {
  const { fullName, phone, username, password, teacherId } = req.body;
  if (!fullName || !phone || !username || !password || !teacherId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [assistant] = await db.insert(assistantsTable).values({ fullName, phone, username, password, teacherId }).returning();
  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, teacherId));
  res.status(201).json({ ...assistant, password: undefined, teacherName: teacher?.fullName ?? null });
});

router.patch("/assistants/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { fullName, phone, username, password, teacherId, isActive } = req.body;
  const updates: Record<string, any> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (username !== undefined) updates.username = username;
  if (password !== undefined) updates.password = password;
  if (teacherId !== undefined) updates.teacherId = teacherId;
  if (isActive !== undefined) updates.isActive = isActive;

  const [assistant] = await db.update(assistantsTable).set(updates).where(eq(assistantsTable.id, id)).returning();
  if (!assistant) {
    res.status(404).json({ error: "Assistant not found" });
    return;
  }
  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, assistant.teacherId));
  res.json({ ...assistant, password: undefined, teacherName: teacher?.fullName ?? null });
});

router.delete("/assistants/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(assistantsTable).where(eq(assistantsTable.id, id));
  res.sendStatus(204);
});

export default router;
