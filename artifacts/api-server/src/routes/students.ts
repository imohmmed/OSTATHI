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

// Student courses — returns:
//   1. Courses explicitly enrolled (studentCoursesTable)
//   2. Published courses whose gradeLevel matches the student's gradeLevel
// Deduplication handled in JS.
router.get("/students/:id/courses", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  // Fetch student to get their grade level
  const [student] = await db.select({ gradeLevel: studentsTable.gradeLevel })
    .from(studentsTable).where(eq(studentsTable.id, id));

  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  const courseFields = {
    id: coursesTable.id,
    title: coursesTable.title,
    description: coursesTable.description,
    thumbnailUrl: coursesTable.thumbnailUrl,
    subjectId: coursesTable.subjectId,
    subjectName: subjectsTable.name,
    gradeLevel: coursesTable.gradeLevel,
    teacherId: coursesTable.teacherId,
    teacherName: teachersTable.fullName,
    isPublished: coursesTable.isPublished,
    createdAt: coursesTable.createdAt,
  };

  // 1. Explicitly enrolled courses
  const enrolled = await db.select(courseFields)
    .from(studentCoursesTable)
    .innerJoin(coursesTable, eq(studentCoursesTable.courseId, coursesTable.id))
    .leftJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .leftJoin(teachersTable, eq(coursesTable.teacherId, teachersTable.id))
    .where(eq(studentCoursesTable.studentId, id));

  // 2. Published courses matching student's grade level
  const byGrade = student.gradeLevel
    ? await db.select(courseFields)
        .from(coursesTable)
        .leftJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
        .leftJoin(teachersTable, eq(coursesTable.teacherId, teachersTable.id))
        .where(and(eq(coursesTable.isPublished, true), eq(coursesTable.gradeLevel, student.gradeLevel)))
    : [];

  // Deduplicate by course id
  const seen = new Set<number>();
  const merged = [...enrolled, ...byGrade].filter(c => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });

  res.json(merged.map(c => ({ ...c, lessonsCount: 0, studentsCount: 0 })));
});

// ── GET /students/:id/activity-summary ───────────────────────────────────────
// Returns lesson progress, stats, last activity — for teacher to view student behavior
router.get("/students/:id/activity-summary", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  // Fetch student basic info
  const [student] = await db
    .select({
      id: studentsTable.id,
      fullName: studentsTable.fullName,
      gradeLevel: studentsTable.gradeLevel,
      isActive: studentsTable.isActive,
      lastSeenAt: studentsTable.lastSeenAt,
      createdAt: studentsTable.createdAt,
    })
    .from(studentsTable)
    .where(eq(studentsTable.id, id));

  if (!student) { res.status(404).json({ error: "Student not found" }); return; }

  // All lesson progress for this student — joined with lesson + course info
  const progressRows = await db
    .select({
      lessonId: lessonVideoProgressTable.lessonId,
      positionSeconds: lessonVideoProgressTable.positionSeconds,
      completed: lessonVideoProgressTable.completed,
      updatedAt: lessonVideoProgressTable.updatedAt,
      lessonTitle: lessonsTable.title,
      lessonType: lessonsTable.type,
      lessonDuration: lessonsTable.duration,
      lessonOrder: lessonsTable.order,
      courseId: lessonsTable.courseId,
      courseTitle: coursesTable.title,
      teacherName: teachersTable.fullName,
    })
    .from(lessonVideoProgressTable)
    .innerJoin(lessonsTable, eq(lessonVideoProgressTable.lessonId, lessonsTable.id))
    .innerJoin(coursesTable, eq(lessonsTable.courseId, coursesTable.id))
    .innerJoin(teachersTable, eq(coursesTable.teacherId, teachersTable.id))
    .where(eq(lessonVideoProgressTable.studentId, id))
    .orderBy(desc(lessonVideoProgressTable.updatedAt));

  // Stats
  const totalOpened = progressRows.length;
  const totalCompleted = progressRows.filter(r => r.completed).length;

  // Last activity: max updatedAt across all progress rows, or lastSeenAt from login
  const lastProgressDate = progressRows.length > 0 ? progressRows[0].updatedAt : null;
  const lastActivity =
    lastProgressDate && student.lastSeenAt
      ? new Date(lastProgressDate) > new Date(student.lastSeenAt) ? lastProgressDate : student.lastSeenAt
      : lastProgressDate ?? student.lastSeenAt ?? null;

  // Group by course
  const courseMap: Record<number, {
    courseId: number;
    courseTitle: string;
    teacherName: string;
    lessonsOpened: number;
    lessonsCompleted: number;
    lastAccessAt: Date | null;
    lessons: typeof progressRows;
  }> = {};

  for (const row of progressRows) {
    if (!courseMap[row.courseId]) {
      courseMap[row.courseId] = {
        courseId: row.courseId,
        courseTitle: row.courseTitle,
        teacherName: row.teacherName,
        lessonsOpened: 0,
        lessonsCompleted: 0,
        lastAccessAt: null,
        lessons: [],
      };
    }
    courseMap[row.courseId].lessonsOpened++;
    if (row.completed) courseMap[row.courseId].lessonsCompleted++;
    // Track last access per course
    const rowDate = new Date(row.updatedAt);
    if (!courseMap[row.courseId].lastAccessAt || rowDate > courseMap[row.courseId].lastAccessAt!) {
      courseMap[row.courseId].lastAccessAt = rowDate;
    }
    courseMap[row.courseId].lessons.push(row);
  }

  // Fetch total lessons per course (all published lessons)
  const activeCourseIds = Object.keys(courseMap).map(Number);
  let totalLessonsPerCourse: Record<number, { total: number; byType: Record<string, number> }> = {};

  if (activeCourseIds.length) {
    const allLessons = await db
      .select({ courseId: lessonsTable.courseId, type: lessonsTable.type })
      .from(lessonsTable)
      .where(inArray(lessonsTable.courseId, activeCourseIds));

    for (const l of allLessons) {
      if (!totalLessonsPerCourse[l.courseId]) {
        totalLessonsPerCourse[l.courseId] = { total: 0, byType: {} };
      }
      totalLessonsPerCourse[l.courseId].total++;
      totalLessonsPerCourse[l.courseId].byType[l.type] =
        (totalLessonsPerCourse[l.courseId].byType[l.type] ?? 0) + 1;
    }
  }

  const courseActivity = Object.values(courseMap).map(ca => ({
    ...ca,
    totalLessons: totalLessonsPerCourse[ca.courseId]?.total ?? 0,
    lessonsByType: totalLessonsPerCourse[ca.courseId]?.byType ?? {},
    openedByType: ca.lessons.reduce<Record<string, number>>((acc, l) => {
      acc[l.lessonType] = (acc[l.lessonType] ?? 0) + 1;
      return acc;
    }, {}),
    completedByType: ca.lessons.filter(l => l.completed).reduce<Record<string, number>>((acc, l) => {
      acc[l.lessonType] = (acc[l.lessonType] ?? 0) + 1;
      return acc;
    }, {}),
  }));

  res.json({
    student,
    stats: { totalOpened, totalCompleted, lastActivity },
    courseActivity,
    recentActivity: progressRows.slice(0, 20),
  });
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
