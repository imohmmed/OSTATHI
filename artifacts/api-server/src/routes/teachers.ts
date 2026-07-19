import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  teachersTable,
  assistantsTable,
  teacherSubjectsTable,
  subjectsTable,
  coursesTable,
  studentCoursesTable,
  studentsTable,
} from "@workspace/db";
import { eq, ilike, and, or, inArray, sql } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

async function getTeacherSubjectIds(teacherId: number): Promise<number[]> {
  const rows = await db.select({ subjectId: teacherSubjectsTable.subjectId })
    .from(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, teacherId));
  return rows.map(r => r.subjectId);
}

async function getTeacherSubjects(teacherId: number) {
  return db
    .select({ id: subjectsTable.id, name: subjectsTable.name, icon: subjectsTable.icon, gradeLevel: subjectsTable.gradeLevel })
    .from(teacherSubjectsTable)
    .leftJoin(subjectsTable, eq(teacherSubjectsTable.subjectId, subjectsTable.id))
    .where(eq(teacherSubjectsTable.teacherId, teacherId));
}

async function getTeacherStudentCount(teacherId: number): Promise<number> {
  const teacherCourses = await db
    .select({ id: coursesTable.id })
    .from(coursesTable)
    .where(eq(coursesTable.teacherId, teacherId));
  if (!teacherCourses.length) return 0;
  const courseIds = teacherCourses.map(c => c.id);
  const rows = await db
    .select({ studentId: studentCoursesTable.studentId })
    .from(studentCoursesTable)
    .where(inArray(studentCoursesTable.courseId, courseIds));
  return new Set(rows.map(r => r.studentId)).size;
}

// GET /teachers — public list
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

// POST /teachers — admin only
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

// GET /teachers/:id — PUBLIC (used by mobile teacher detail page)
router.get("/teachers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id));
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }
  const [subjectIds, subjects, studentsCount] = await Promise.all([
    getTeacherSubjectIds(id),
    getTeacherSubjects(id),
    getTeacherStudentCount(id),
  ]);
  res.json({ ...teacher, password: undefined, subjectIds, subjects, studentsCount });
});

// PATCH /teachers/:id — admin only
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
  if (!teacher) { res.status(404).json({ error: "Teacher not found" }); return; }

  if (subjectIds !== undefined) {
    await db.delete(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, id));
    if (subjectIds.length) {
      await db.insert(teacherSubjectsTable).values(
        subjectIds.map((sid: number) => ({ teacherId: id, subjectId: sid }))
      );
    }
  }

  res.json({ ...teacher, password: undefined, subjectIds: subjectIds ?? await getTeacherSubjectIds(id) });
});

// DELETE /teachers/:id — admin only
router.delete("/teachers/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(teachersTable).where(eq(teachersTable.id, id));
  res.json({ ok: true });
});

// GET /teachers/:id/students — public (list of students enrolled in teacher's courses)
router.get("/teachers/:id/students", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const teacherCourses = await db
    .select({ id: coursesTable.id })
    .from(coursesTable)
    .where(eq(coursesTable.teacherId, id));

  if (!teacherCourses.length) { res.json([]); return; }

  const courseIds = teacherCourses.map(c => c.id);
  const enrollments = await db
    .select({ studentId: studentCoursesTable.studentId, courseId: studentCoursesTable.courseId })
    .from(studentCoursesTable)
    .where(inArray(studentCoursesTable.courseId, courseIds));

  const studentIds = [...new Set(enrollments.map(e => e.studentId))];
  if (!studentIds.length) { res.json([]); return; }

  const students = await db.select().from(studentsTable).where(inArray(studentsTable.id, studentIds));

  res.json(students.map(s => ({
    ...s,
    password: undefined,
    enrolledCourseIds: enrollments.filter(e => e.studentId === s.id).map(e => e.courseId),
  })));
});

// Teacher creates a course for themselves (no admin required)
router.post("/teachers/:id/courses", async (req, res): Promise<void> => {
  const teacherId = parseInt(req.params.id, 10);
  const { title, description, thumbnailUrl, subjectId } = req.body ?? {};
  if (!title || !subjectId) {
    res.status(400).json({ error: "title and subjectId required" });
    return;
  }
  const [course] = await db
    .insert(coursesTable)
    .values({ title, description: description || null, thumbnailUrl: thumbnailUrl || null, subjectId: Number(subjectId), teacherId, isPublished: false, isTrial: false })
    .returning();
  res.status(201).json(course);
});

// Assistants sub-resource
router.get("/teachers/:id/assistants", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const assistants = await db.select().from(assistantsTable).where(eq(assistantsTable.teacherId, id));
  res.json(assistants.map(a => ({ ...a, password: undefined })));
});

router.post("/teachers/:id/assistants", requireAdmin, async (req, res): Promise<void> => {
  const teacherId = parseInt(req.params.id, 10);
  const { fullName, phone, username, password } = req.body;
  if (!fullName || !phone || !username || !password) {
    res.status(400).json({ error: "Missing required fields" }); return;
  }
  const [assistant] = await db.insert(assistantsTable).values({ teacherId, fullName, phone, username, password }).returning();
  res.status(201).json({ ...assistant, password: undefined });
});

export default router;
