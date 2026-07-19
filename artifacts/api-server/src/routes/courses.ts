import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  coursesTable,
  lessonsTable,
  quizzesTable,
  subjectsTable,
  teachersTable,
  studentCoursesTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

router.get("/courses", async (req, res): Promise<void> => {
  const subjectId = req.query.subjectId ? parseInt(req.query.subjectId as string, 10) : undefined;
  const teacherId = req.query.teacherId ? parseInt(req.query.teacherId as string, 10) : undefined;
  const isPublished = req.query.isPublished !== undefined
    ? req.query.isPublished === "true"
    : undefined;
  const isTrial = req.query.isTrial !== undefined
    ? req.query.isTrial === "true"
    : undefined;

  const conditions = [];
  if (subjectId) conditions.push(eq(coursesTable.subjectId, subjectId));
  if (teacherId) conditions.push(eq(coursesTable.teacherId, teacherId));
  if (isPublished !== undefined) conditions.push(eq(coursesTable.isPublished, isPublished));
  if (isTrial !== undefined) conditions.push(eq(coursesTable.isTrial, isTrial));

  const courses = await db
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
      isTrial: coursesTable.isTrial,
      createdAt: coursesTable.createdAt,
    })
    .from(coursesTable)
    .leftJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .leftJoin(teachersTable, eq(coursesTable.teacherId, teachersTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const result = await Promise.all(courses.map(async c => {
    const [{ count: lessonsCount }] = await db
      .select({ count: sql<number>`count(*)::int` }).from(lessonsTable).where(eq(lessonsTable.courseId, c.id));
    const [{ count: studentsCount }] = await db
      .select({ count: sql<number>`count(*)::int` }).from(studentCoursesTable).where(eq(studentCoursesTable.courseId, c.id));
    return { ...c, lessonsCount, studentsCount };
  }));

  res.json(result);
});

router.post("/courses", requireAdmin, async (req, res): Promise<void> => {
  const { title, description, thumbnailUrl, subjectId, teacherId, isPublished, isTrial } = req.body;
  if (!title || !subjectId || !teacherId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [course] = await db.insert(coursesTable).values({
    title,
    description: description || null,
    thumbnailUrl: thumbnailUrl || null,
    subjectId,
    teacherId,
    isPublished: isPublished ?? false,
    isTrial: isTrial ?? false,
  }).returning();

  const [subject] = await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, subjectId));
  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, teacherId));

  res.status(201).json({
    ...course,
    subjectName: subject?.name ?? null,
    teacherName: teacher?.fullName ?? null,
    lessonsCount: 0,
    studentsCount: 0,
  });
});

router.get("/courses/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

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
      isTrial: coursesTable.isTrial,
      createdAt: coursesTable.createdAt,
    })
    .from(coursesTable)
    .leftJoin(subjectsTable, eq(coursesTable.subjectId, subjectsTable.id))
    .leftJoin(teachersTable, eq(coursesTable.teacherId, teachersTable.id))
    .where(eq(coursesTable.id, id));

  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }

  const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.courseId, id)).orderBy(lessonsTable.order);
  res.json({ ...course, lessons });
});

router.patch("/courses/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { title, description, thumbnailUrl, subjectId, teacherId, isPublished, isTrial } = req.body;
  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description || null;
  if (thumbnailUrl !== undefined) updates.thumbnailUrl = thumbnailUrl || null;
  if (subjectId !== undefined) updates.subjectId = subjectId;
  if (teacherId !== undefined) updates.teacherId = teacherId;
  if (isPublished !== undefined) updates.isPublished = isPublished;
  if (isTrial !== undefined) updates.isTrial = isTrial;

  const [course] = await db.update(coursesTable).set(updates).where(eq(coursesTable.id, id)).returning();
  if (!course) {
    res.status(404).json({ error: "Course not found" });
    return;
  }
  const [subject] = await db.select({ name: subjectsTable.name }).from(subjectsTable).where(eq(subjectsTable.id, course.subjectId));
  const [teacher] = await db.select({ fullName: teachersTable.fullName }).from(teachersTable).where(eq(teachersTable.id, course.teacherId));
  const [{ count: lessonsCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(lessonsTable).where(eq(lessonsTable.courseId, id));
  const [{ count: studentsCount }] = await db.select({ count: sql<number>`count(*)::int` }).from(studentCoursesTable).where(eq(studentCoursesTable.courseId, id));

  res.json({ ...course, subjectName: subject?.name ?? null, teacherName: teacher?.fullName ?? null, lessonsCount, studentsCount });
});

router.delete("/courses/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.sendStatus(204);
});

// Lessons
router.get("/courses/:courseId/lessons", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  const lessons = await db.select().from(lessonsTable).where(eq(lessonsTable.courseId, courseId)).orderBy(lessonsTable.order);
  res.json(lessons);
});

router.post("/courses/:courseId/lessons", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.courseId) ? req.params.courseId[0] : req.params.courseId;
  const courseId = parseInt(raw, 10);
  const { title, type, contentUrl, contentText, order, duration, isPublished } = req.body;
  if (!title || !type) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [lesson] = await db.insert(lessonsTable).values({
    courseId,
    title,
    type: type || "video",
    contentUrl: contentUrl || null,
    contentText: contentText || null,
    order: order ?? 0,
    duration: duration || null,
    isPublished: isPublished ?? false,
  }).returning();
  res.status(201).json(lesson);
});

router.patch("/lessons/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { title, type, contentUrl, contentText, order, duration, isPublished } = req.body;
  const updates: Record<string, any> = {};
  if (title !== undefined) updates.title = title;
  if (type !== undefined) updates.type = type;
  if (contentUrl !== undefined) updates.contentUrl = contentUrl || null;
  if (contentText !== undefined) updates.contentText = contentText || null;
  if (order !== undefined) updates.order = order;
  if (duration !== undefined) updates.duration = duration || null;
  if (isPublished !== undefined) updates.isPublished = isPublished;

  const [lesson] = await db.update(lessonsTable).set(updates).where(eq(lessonsTable.id, id)).returning();
  if (!lesson) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  res.json(lesson);
});

router.delete("/lessons/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(lessonsTable).where(eq(lessonsTable.id, id));
  res.sendStatus(204);
});

// Quizzes
router.get("/lessons/:lessonId/quizzes", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.lessonId) ? req.params.lessonId[0] : req.params.lessonId;
  const lessonId = parseInt(raw, 10);
  const quizzes = await db.select().from(quizzesTable).where(eq(quizzesTable.lessonId, lessonId));
  res.json(quizzes);
});

router.post("/lessons/:lessonId/quizzes", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.lessonId) ? req.params.lessonId[0] : req.params.lessonId;
  const lessonId = parseInt(raw, 10);
  const { question, type, options, correctAnswer, explanation, points } = req.body;
  if (!question || !type) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [quiz] = await db.insert(quizzesTable).values({
    lessonId,
    question,
    type: type || "multiple_choice",
    options: options || [],
    correctAnswer: correctAnswer || null,
    explanation: explanation || null,
    points: points ?? 1,
  }).returning();
  res.status(201).json(quiz);
});

router.patch("/quizzes/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { question, type, options, correctAnswer, explanation, points } = req.body;
  const updates: Record<string, any> = {};
  if (question !== undefined) updates.question = question;
  if (type !== undefined) updates.type = type;
  if (options !== undefined) updates.options = options;
  if (correctAnswer !== undefined) updates.correctAnswer = correctAnswer || null;
  if (explanation !== undefined) updates.explanation = explanation || null;
  if (points !== undefined) updates.points = points;

  const [quiz] = await db.update(quizzesTable).set(updates).where(eq(quizzesTable.id, id)).returning();
  if (!quiz) {
    res.status(404).json({ error: "Quiz not found" });
    return;
  }
  res.json(quiz);
});

router.delete("/quizzes/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  await db.delete(quizzesTable).where(eq(quizzesTable.id, id));
  res.sendStatus(204);
});

export default router;
