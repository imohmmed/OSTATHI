import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  studentsTable,
  studentCoursesTable,
  coursesTable,
  subjectsTable,
  teachersTable,
} from "@workspace/db";
import { eq, ilike, and, or } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

router.get("/students", requireAdmin, async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const gradeLevel = req.query.gradeLevel as string | undefined;

  let query = db.select().from(studentsTable);
  const conditions = [];
  if (search) {
    conditions.push(or(
      ilike(studentsTable.fullName, `%${search}%`),
      ilike(studentsTable.username, `%${search}%`),
      ilike(studentsTable.phone, `%${search}%`)
    ));
  }
  if (gradeLevel) {
    conditions.push(eq(studentsTable.gradeLevel, gradeLevel));
  }

  const students = conditions.length > 0
    ? await db.select().from(studentsTable).where(and(...conditions))
    : await db.select().from(studentsTable);

  res.json(students.map(s => ({
    ...s,
    password: undefined,
  })));
});

router.post("/students", requireAdmin, async (req, res): Promise<void> => {
  const { fullName, phone, gradeLevel, username, password, parentName, parentPhone, notes } = req.body;
  if (!fullName || !phone || !gradeLevel || !username || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [student] = await db.insert(studentsTable).values({
    fullName, phone, gradeLevel, username, password,
    parentName: parentName || null,
    parentPhone: parentPhone || null,
    notes: notes || null,
  }).returning();
  res.status(201).json({ ...student, password: undefined });
});

router.get("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json({ ...student, password: undefined });
});

router.patch("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { fullName, phone, gradeLevel, username, password, parentName, parentPhone, isActive, notes } = req.body;
  const updates: Record<string, any> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel;
  if (username !== undefined) updates.username = username;
  if (password !== undefined) updates.password = password;
  if (parentName !== undefined) updates.parentName = parentName || null;
  if (parentPhone !== undefined) updates.parentPhone = parentPhone || null;
  if (isActive !== undefined) updates.isActive = isActive;
  if (notes !== undefined) updates.notes = notes || null;

  const [student] = await db.update(studentsTable).set(updates).where(eq(studentsTable.id, id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json({ ...student, password: undefined });
});

router.delete("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(studentsTable).where(eq(studentsTable.id, id));
  res.sendStatus(204);
});

// Student courses
router.get("/students/:id/courses", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const assignments = await db
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      description: coursesTable.description,
      thumbnailUrl: coursesTable.thumbnailUrl,
      subjectId: coursesTable.subjectId,
      subjectName: subjectsTable.name,
      teacherId: coursesTable.teacherId,
      teacherName: teachersTable.fullName,
      isPublished: coursesTable.isPublished,
      createdAt: coursesTable.createdAt,
    })
    .from(studentCoursesTable)
    .innerJoin(coursesTable, eq(studentCoursesTable.courseId, coursesTable.id))
    .leftJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .leftJoin(teachersTable, eq(coursesTable.teacherId, teachersTable.id))
    .where(eq(studentCoursesTable.studentId, id));

  res.json(assignments.map(c => ({ ...c, lessonsCount: 0, studentsCount: 0 })));
});

router.post("/students/:id/courses", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { courseId } = req.body;
  if (!courseId) {
    res.status(400).json({ error: "courseId is required" });
    return;
  }
  await db.insert(studentCoursesTable).values({ studentId: id, courseId }).onConflictDoNothing();
  const [course] = await db
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      description: coursesTable.description,
      thumbnailUrl: coursesTable.thumbnailUrl,
      subjectId: coursesTable.subjectId,
      subjectName: subjectsTable.name,
      teacherId: coursesTable.teacherId,
      teacherName: teachersTable.fullName,
      isPublished: coursesTable.isPublished,
      createdAt: coursesTable.createdAt,
    })
    .from(coursesTable)
    .leftJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .leftJoin(teachersTable, eq(coursesTable.teacherId, teachersTable.id))
    .where(eq(coursesTable.id, courseId));

  res.status(201).json({ ...course, lessonsCount: 0, studentsCount: 0 });
});

export default router;
