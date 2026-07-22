import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  studentsTable,
  studentCoursesTable,
  coursesTable,
  subjectsTable,
  teachersTable,
} from "@workspace/db";
import { eq, ilike, and, or, inArray, sql, desc } from "drizzle-orm";
import {
  lessonsTable,
  lessonVideoProgressTable,
  lessonReactionsTable,
} from "@workspace/db";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

// GET /students — list with teacher & subject names
router.get("/students", requireAdmin, async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const gradeLevel = req.query.gradeLevel as string | undefined;

  const conditions: any[] = [];
  if (search) {
    conditions.push(or(
      ilike(studentsTable.fullName, `%${search}%`),
      ilike(studentsTable.username, `%${search}%`),
      ilike(studentsTable.phone, `%${search}%`),
    ));
  }
  if (gradeLevel) {
    conditions.push(eq(studentsTable.gradeLevel, gradeLevel));
  }

  const rows = await db
    .select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      phone: studentsTable.phone,
      email: studentsTable.email,
      gradeLevel: studentsTable.gradeLevel,
      username: studentsTable.username,
      teacherId: studentsTable.teacherId,
      subjectId: studentsTable.subjectId,
      parentName: studentsTable.parentName,
      parentPhone: studentsTable.parentPhone,
      isActive: studentsTable.isActive,
      notes: studentsTable.notes,
      lastSeenAt: studentsTable.lastSeenAt,
      createdAt: studentsTable.createdAt,
      teacherName: teachersTable.fullName,
      subjectName: subjectsTable.name,
    })
    .from(studentsTable)
    .leftJoin(teachersTable, eq(studentsTable.teacherId, teachersTable.id))
    .leftJoin(subjectsTable, eq(studentsTable.subjectId, subjectsTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  res.json(rows);
});

// POST /students
router.post("/students", requireAdmin, async (req, res): Promise<void> => {
  const { fullName, phone, email, gradeLevel, username, password, teacherId, subjectId, parentName, parentPhone, notes } = req.body;
  if (!fullName || !phone || !gradeLevel || !username || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [student] = await db.insert(studentsTable).values({
    fullName, phone, gradeLevel, username, password,
    email: email || null,
    teacherId: teacherId ? Number(teacherId) : null,
    subjectId: subjectId ? Number(subjectId) : null,
    parentName: parentName || null,
    parentPhone: parentPhone || null,
    notes: notes || null,
  }).returning();
  res.status(201).json({ ...student, password: undefined });
});

// GET /students/:id
router.get("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [row] = await db
    .select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      phone: studentsTable.phone,
      email: studentsTable.email,
      gradeLevel: studentsTable.gradeLevel,
      username: studentsTable.username,
      teacherId: studentsTable.teacherId,
      subjectId: studentsTable.subjectId,
      parentName: studentsTable.parentName,
      parentPhone: studentsTable.parentPhone,
      isActive: studentsTable.isActive,
      notes: studentsTable.notes,
      lastSeenAt: studentsTable.lastSeenAt,
      createdAt: studentsTable.createdAt,
      teacherName: teachersTable.fullName,
      subjectName: subjectsTable.name,
    })
    .from(studentsTable)
    .leftJoin(teachersTable, eq(studentsTable.teacherId, teachersTable.id))
    .leftJoin(subjectsTable, eq(studentsTable.subjectId, subjectsTable.id))
    .where(eq(studentsTable.id, id));

  if (!row) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json(row);
});

// PATCH /students/:id
router.patch("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { fullName, phone, email, gradeLevel, username, password, teacherId, subjectId, parentName, parentPhone, isActive, notes } = req.body;
  const updates: Record<string, any> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email || null;
  if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel;
  if (username !== undefined) updates.username = username;
  if (password !== undefined) updates.password = password;
  if (teacherId !== undefined) updates.teacherId = teacherId ? Number(teacherId) : null;
  if (subjectId !== undefined) updates.subjectId = subjectId ? Number(subjectId) : null;
  if (parentName !== undefined) updates.parentName = parentName || null;
  if (parentPhone !== undefined) updates.parentPhone = parentPhone || null;
  if (isActive !== undefined) updates.isActive = isActive;
  if (notes !== undefined) updates.notes = notes || null;

  const [updated] = await db.update(studentsTable).set(updates).where(eq(studentsTable.id, id)).returning();
  if (!updated) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const [row] = await db
    .select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      phone: studentsTable.phone,
      email: studentsTable.email,
      gradeLevel: studentsTable.gradeLevel,
      username: studentsTable.username,
      teacherId: studentsTable.teacherId,
      subjectId: studentsTable.subjectId,
      parentName: studentsTable.parentName,
      parentPhone: studentsTable.parentPhone,
      isActive: studentsTable.isActive,
      notes: studentsTable.notes,
      lastSeenAt: studentsTable.lastSeenAt,
      createdAt: studentsTable.createdAt,
      teacherName: teachersTable.fullName,
      subjectName: subjectsTable.name,
    })
    .from(studentsTable)
    .leftJoin(teachersTable, eq(studentsTable.teacherId, teachersTable.id))
    .leftJoin(subjectsTable, eq(studentsTable.subjectId, subjectsTable.id))
    .where(eq(studentsTable.id, id));

  res.json({ ...row, password: undefined });
});

// DELETE /students/:id
router.delete("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(studentsTable).where(eq(studentsTable.id, id));
  res.sendStatus(204);
});

// GET /students/:id/courses
router.get("/students/:id/courses", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [student] = await db.select({ gradeLevel: studentsTable.gradeLevel })
    .from(studentsTable).where(eq(studentsTable.id, id));
  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const assigned = await db
    .select({
      id: coursesTable.id,
      title: coursesTable.title,
      thumbnailUrl: coursesTable.thumbnailUrl,
      isPublished: coursesTable.isPublished,
      subjectName: subjectsTable.name,
      teacherName: teachersTable.fullName,
    })
    .from(studentCoursesTable)
    .innerJoin(coursesTable, eq(studentCoursesTable.courseId, coursesTable.id))
    .leftJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .leftJoin(teachersTable, eq(coursesTable.teacherId, teachersTable.id))
    .where(eq(studentCoursesTable.studentId, id));

  res.json(assigned);
});

export default router;
