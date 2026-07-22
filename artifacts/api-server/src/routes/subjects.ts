import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  subjectsTable,
  teachersTable,
  teacherSubjectsTable,
  teacherGradeLevelsTable,
  coursesTable,
  studentCoursesTable,
} from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

async function getTeacherGradeLevels(teacherId: number): Promise<string[]> {
  const rows = await db
    .select({ gradeLevel: teacherGradeLevelsTable.gradeLevel })
    .from(teacherGradeLevelsTable)
    .where(eq(teacherGradeLevelsTable.teacherId, teacherId));
  return rows.map((r) => r.gradeLevel);
}

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.name);
  res.json(subjects);
});

// GET /subjects/:id — subject detail with stats + teachers
router.get("/subjects/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, id));
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  // Teachers who teach this subject
  const teacherRows = await db
    .select({
      id: teachersTable.id,
      fullName: teachersTable.fullName,
      avatarUrl: teachersTable.avatarUrl,
      bio: teachersTable.bio,
      phone: teachersTable.phone,
      username: teachersTable.username,
      isActive: teachersTable.isActive,
    })
    .from(teacherSubjectsTable)
    .innerJoin(teachersTable, eq(teacherSubjectsTable.teacherId, teachersTable.id))
    .where(eq(teacherSubjectsTable.subjectId, id));

  const teachers = await Promise.all(
    teacherRows.map(async (t) => ({
      ...t,
      gradeLevels: await getTeacherGradeLevels(t.id),
    }))
  );

  // Courses count
  const [{ count: coursesCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(coursesTable)
    .where(eq(coursesTable.subjectId, id));

  // Students count (unique students in courses for this subject)
  const subjectCourses = await db
    .select({ id: coursesTable.id })
    .from(coursesTable)
    .where(eq(coursesTable.subjectId, id));

  let studentsCount = 0;
  if (subjectCourses.length > 0) {
    const courseIds = subjectCourses.map((c) => c.id);
    const rows = await db
      .select({ studentId: studentCoursesTable.studentId })
      .from(studentCoursesTable)
      .where(inArray(studentCoursesTable.courseId, courseIds));
    studentsCount = new Set(rows.map((r) => r.studentId)).size;
  }

  res.json({
    ...subject,
    teachers,
    teachersCount: teachers.length,
    coursesCount,
    studentsCount,
  });
});

router.post("/subjects", requireAdmin, async (req, res): Promise<void> => {
  const { name, icon, gradeLevel, gradeLevels, description, imageUrl } = req.body;
  if (!name) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [subject] = await db.insert(subjectsTable).values({
    name,
    gradeLevel: gradeLevel || "",
    gradeLevels: gradeLevels || null,
    icon: icon || null,
    description: description || null,
    imageUrl: imageUrl || null,
  }).returning();
  res.status(201).json(subject);
});

router.patch("/subjects/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, icon, gradeLevel, gradeLevels, description, imageUrl } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (icon !== undefined) updates.icon = icon || null;
  if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel;
  if (gradeLevels !== undefined) updates.gradeLevels = gradeLevels || null;
  if (description !== undefined) updates.description = description || null;
  if (imageUrl !== undefined) updates.imageUrl = imageUrl || null;

  const [subject] = await db.update(subjectsTable).set(updates).where(eq(subjectsTable.id, id)).returning();
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  res.json(subject);
});

router.delete("/subjects/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(subjectsTable).where(eq(subjectsTable.id, id));
  res.sendStatus(204);
});

export default router;
