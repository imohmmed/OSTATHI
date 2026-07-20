import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import {
  studentsTable,
  teachersTable,
  teacherSubjectsTable,
  teacherGradeLevelsTable,
  subjectsTable,
  parentsTable,
  assistantsTable,
  coursesTable,
  messagesTable,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

// ── Mobile admin auth middleware ──────────────────────
function requireMobileAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers["x-admin-token"] as string | undefined;
  const adminPassword = (global as any).__adminPassword ?? process.env.ADMIN_PASSWORD ?? "admin123";
  if (!token || token !== adminPassword) {
    res.status(401).json({ error: "غير مصرح" });
    return;
  }
  next();
}

const router: IRouter = Router();

router.post("/mobile/login", async (req, res): Promise<void> => {
  const { username, password } = req.body ?? {};

  if (!username || !password) {
    res.status(400).json({ error: "اسم المستخدم وكلمة المرور مطلوبان" });
    return;
  }

  // ── طلاب ──────────────────────────────────────────
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.username, username));

  if (student && student.password === password) {
    if (!student.isActive) {
      res.status(403).json({ error: "الحساب غير مفعّل. تواصل مع الإدارة." });
      return;
    }
    res.json({
      id: student.id,
      fullName: student.fullName,
      phone: student.phone,
      role: "student",
      gradeLevel: student.gradeLevel,
      parentName: student.parentName,
      parentPhone: student.parentPhone,
    });
    return;
  }

  // ── أساتذة ────────────────────────────────────────
  const [teacher] = await db
    .select()
    .from(teachersTable)
    .where(eq(teachersTable.username, username));

  if (teacher && teacher.password === password) {
    if (!teacher.isActive) {
      res.status(403).json({ error: "الحساب غير مفعّل. تواصل مع الإدارة." });
      return;
    }
    const [subjectRows, gradeLevelRows] = await Promise.all([
      db.select({ id: subjectsTable.id, name: subjectsTable.name, icon: subjectsTable.icon })
        .from(teacherSubjectsTable)
        .leftJoin(subjectsTable, eq(teacherSubjectsTable.subjectId, subjectsTable.id))
        .where(eq(teacherSubjectsTable.teacherId, teacher.id)),
      db.select({ gradeLevel: teacherGradeLevelsTable.gradeLevel })
        .from(teacherGradeLevelsTable)
        .where(eq(teacherGradeLevelsTable.teacherId, teacher.id)),
    ]);
    res.json({
      id: teacher.id,
      fullName: teacher.fullName,
      phone: teacher.phone,
      role: "teacher",
      bio: teacher.bio,
      avatarUrl: teacher.avatarUrl,
      subjects: subjectRows,
      gradeLevels: gradeLevelRows.map(r => r.gradeLevel),
    });
    return;
  }

  // ── مساعدو الأساتذة ───────────────────────────────
  const [assistant] = await db
    .select()
    .from(assistantsTable)
    .where(eq(assistantsTable.username, username));

  if (assistant && assistant.password === password) {
    if (!assistant.isActive) {
      res.status(403).json({ error: "الحساب غير مفعّل. تواصل مع الإدارة." });
      return;
    }
    // جلب اسم الأستاذ المرتبط بالمساعد
    const [linkedTeacher] = await db
      .select({ id: teachersTable.id, fullName: teachersTable.fullName, avatarUrl: teachersTable.avatarUrl })
      .from(teachersTable)
      .where(eq(teachersTable.id, assistant.teacherId));

    res.json({
      id: assistant.id,
      fullName: assistant.fullName,
      phone: assistant.phone,
      role: "assistant",
      teacherId: assistant.teacherId,
      teacherName: linkedTeacher?.fullName ?? "",
      teacherAvatarUrl: linkedTeacher?.avatarUrl ?? null,
    });
    return;
  }

  // ── أولياء الأمور ─────────────────────────────────
  const [parent] = await db
    .select()
    .from(parentsTable)
    .where(eq(parentsTable.username, username));

  if (parent && parent.password === password) {
    const [student2] = await db
      .select()
      .from(studentsTable)
      .where(eq(studentsTable.id, parent.studentId));

    res.json({
      id: parent.id,
      fullName: parent.fullName,
      phone: parent.phone,
      role: "parent",
      studentId: parent.studentId,
      studentName: student2?.fullName ?? null,
    });
    return;
  }

  // ── أدمن ──────────────────────────────────────────
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";
  const adminPassword = (global as any).__adminPassword ?? process.env.ADMIN_PASSWORD ?? "admin123";
  if (username === adminUsername && password === adminPassword) {
    res.json({
      id: 0,
      fullName: "المدير",
      phone: "",
      role: "admin",
      adminToken: adminPassword,
    });
    return;
  }

  res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
});

// ── Mobile Admin: إحصائيات عامة ──────────────────────
router.get("/mobile/admin/stats", requireMobileAdmin, async (req, res): Promise<void> => {
  const [
    [{ count: totalStudents }],
    [{ count: totalTeachers }],
    [{ count: totalCourses }],
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(studentsTable),
    db.select({ count: sql<number>`count(*)::int` }).from(teachersTable),
    db.select({ count: sql<number>`count(*)::int` }).from(coursesTable),
  ]);
  res.json({ totalStudents, totalTeachers, totalCourses });
});

// ── Mobile Admin: كل الطلاب ───────────────────────────
router.get("/mobile/admin/students", requireMobileAdmin, async (req, res): Promise<void> => {
  const rows = await db.select({
    id: studentsTable.id,
    fullName: studentsTable.fullName,
    phone: studentsTable.phone,
    gradeLevel: studentsTable.gradeLevel,
    isActive: studentsTable.isActive,
    parentName: studentsTable.parentName,
    parentPhone: studentsTable.parentPhone,
  }).from(studentsTable).orderBy(studentsTable.fullName);
  res.json(rows);
});

// ── Mobile Admin: كل المحادثات (جميع الأساتذة) ────────
router.get("/mobile/admin/messages", requireMobileAdmin, async (req, res): Promise<void> => {
  const rows = await db.select({
    id: messagesTable.id,
    fromStudentId: messagesTable.fromStudentId,
    toTeacherId: messagesTable.toTeacherId,
    text: messagesTable.text,
    createdAt: messagesTable.createdAt,
    isReadByTeacher: messagesTable.isReadByTeacher,
    studentName: studentsTable.fullName,
    teacherName: teachersTable.fullName,
  })
    .from(messagesTable)
    .leftJoin(studentsTable, eq(messagesTable.fromStudentId, studentsTable.id))
    .leftJoin(teachersTable, eq(messagesTable.toTeacherId, teachersTable.id))
    .orderBy(messagesTable.createdAt);
  res.json(rows);
});

export default router;
