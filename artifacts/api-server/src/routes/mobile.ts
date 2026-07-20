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
  studentCoursesTable,
  studentSubjectsTable,
} from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";

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
      parentToken: parent.password,
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

// ── Mobile Admin: إنشاء طالب ──────────────────────────
router.post("/mobile/admin/students", requireMobileAdmin, async (req, res): Promise<void> => {
  const { fullName, phone, gradeLevel, username, password, notes } = req.body ?? {};
  if (!fullName || !gradeLevel || !username || !password) {
    res.status(400).json({ error: "الاسم والصف واسم المستخدم وكلمة المرور مطلوبة" });
    return;
  }
  try {
    const [student] = await db.insert(studentsTable).values({
      fullName, phone: phone || "", gradeLevel, username, password,
      notes: notes || null,
    }).returning();
    res.status(201).json({ ...student, password: undefined });
  } catch {
    res.status(409).json({ error: "اسم المستخدم مستخدم مسبقاً" });
  }
});

// ── Mobile Admin: تعديل طالب ──────────────────────────
router.put("/mobile/admin/students/:id", requireMobileAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { fullName, phone, gradeLevel, username, password, notes, isActive } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel;
  if (username !== undefined) updates.username = username;
  if (password !== undefined && password !== "") updates.password = password;
  if (notes !== undefined) updates.notes = notes;
  if (isActive !== undefined) updates.isActive = isActive;
  const [student] = await db.update(studentsTable).set(updates).where(eq(studentsTable.id, id)).returning();
  if (!student) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  res.json({ ...student, password: undefined });
});

// ── Mobile Admin: تفاصيل طالب واحد ───────────────────
router.get("/mobile/admin/students/:id", requireMobileAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, id));
  if (!student) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  // enrolled courses
  const enrolled = await db.select({ courseId: studentCoursesTable.courseId })
    .from(studentCoursesTable).where(eq(studentCoursesTable.studentId, id));
  const courseIds = enrolled.map(r => r.courseId);
  const courseList = courseIds.length > 0
    ? await db.select({ id: coursesTable.id, title: coursesTable.title })
        .from(coursesTable).where(inArray(coursesTable.id, courseIds))
    : [];
  // enrolled subjects
  const enrolledSubjects = await db.select({ subjectId: studentSubjectsTable.subjectId })
    .from(studentSubjectsTable).where(eq(studentSubjectsTable.studentId, id));
  const subjectIds = enrolledSubjects.map(r => r.subjectId);
  const subjectList = subjectIds.length > 0
    ? await db.select({ id: subjectsTable.id, name: subjectsTable.name, icon: subjectsTable.icon, gradeLevel: subjectsTable.gradeLevel })
        .from(subjectsTable).where(inArray(subjectsTable.id, subjectIds))
    : [];
  // parent
  const [parent] = await db.select({ id: parentsTable.id, fullName: parentsTable.fullName, username: parentsTable.username, phone: parentsTable.phone })
    .from(parentsTable).where(eq(parentsTable.studentId, id));
  res.json({ ...student, password: undefined, courses: courseList, subjects: subjectList, parent: parent ?? null });
});

// ── Mobile Admin: تحديث مواد الطالب ──────────────────
router.put("/mobile/admin/students/:id/subjects", requireMobileAdmin, async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.id, 10);
  const { subjectIds } = req.body ?? {};
  if (!Array.isArray(subjectIds)) { res.status(400).json({ error: "subjectIds مطلوب" }); return; }
  await db.delete(studentSubjectsTable).where(eq(studentSubjectsTable.studentId, studentId));
  if (subjectIds.length > 0) {
    await db.insert(studentSubjectsTable)
      .values(subjectIds.map((sId: number) => ({ studentId, subjectId: sId })))
      .onConflictDoNothing();
  }
  res.json({ enrolled: subjectIds.length });
});

// ── Mobile Admin: إضافة ولي أمر لطالب ────────────────
router.post("/mobile/admin/students/:id/parent", requireMobileAdmin, async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.id, 10);
  const { fullName, phone, username, password } = req.body ?? {};
  if (!fullName || !username || !password) {
    res.status(400).json({ error: "الاسم واسم المستخدم وكلمة المرور مطلوبة" });
    return;
  }
  try {
    const [parent] = await db.insert(parentsTable).values({
      fullName, phone: phone || "", username, password, studentId,
    }).returning();
    res.status(201).json({ ...parent, password: undefined });
  } catch {
    res.status(409).json({ error: "اسم المستخدم مستخدم مسبقاً" });
  }
});

// ── Mobile Admin: تسجيل طالب في كورسات ───────────────
router.post("/mobile/admin/students/:id/enroll", requireMobileAdmin, async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.id, 10);
  const { courseIds } = req.body ?? {};
  if (!Array.isArray(courseIds)) { res.status(400).json({ error: "courseIds مطلوب" }); return; }
  // remove old enrollments then insert new
  await db.delete(studentCoursesTable).where(eq(studentCoursesTable.studentId, studentId));
  if (courseIds.length > 0) {
    await db.insert(studentCoursesTable)
      .values(courseIds.map((cId: number) => ({ studentId, courseId: cId })))
      .onConflictDoNothing();
  }
  res.json({ enrolled: courseIds.length });
});

// ── Mobile Admin: إنشاء أستاذ داخل مادة ─────────────
router.post("/mobile/admin/teachers", requireMobileAdmin, async (req, res): Promise<void> => {
  const { fullName, phone, username, password, bio, subjectId, gradeLevels } = req.body ?? {};
  if (!fullName || !username || !password) {
    res.status(400).json({ error: "الاسم واسم المستخدم وكلمة المرور مطلوبة" });
    return;
  }
  try {
    const [teacher] = await db.insert(teachersTable).values({
      fullName, phone: phone || "", username, password, bio: bio || null,
    }).returning();
    if (subjectId) {
      await db.insert(teacherSubjectsTable).values({ teacherId: teacher.id, subjectId }).onConflictDoNothing();
    }
    if (gradeLevels?.length) {
      await db.insert(teacherGradeLevelsTable)
        .values(gradeLevels.map((gl: string) => ({ teacherId: teacher.id, gradeLevel: gl })));
    }
    res.status(201).json({ ...teacher, password: undefined, subjectId, gradeLevels });
  } catch {
    res.status(409).json({ error: "اسم المستخدم مستخدم مسبقاً" });
  }
});

// ── Mobile Admin: ربط أستاذ موجود بمادة ──────────────
router.post("/mobile/admin/subjects/:id/link-teacher", requireMobileAdmin, async (req, res): Promise<void> => {
  const subjectId = parseInt(req.params.id, 10);
  const { teacherId } = req.body ?? {};
  if (!teacherId) { res.status(400).json({ error: "teacherId مطلوب" }); return; }
  try {
    await db.insert(teacherSubjectsTable).values({ teacherId: parseInt(teacherId, 10), subjectId }).onConflictDoNothing();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "فشل الربط" });
  }
});

// ── Mobile Admin: تفاصيل أستاذ كامل ──────────────────
router.get("/mobile/admin/teachers/:id", requireMobileAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [teacher] = await db.select().from(teachersTable).where(eq(teachersTable.id, id));
  if (!teacher) { res.status(404).json({ error: "الأستاذ غير موجود" }); return; }
  const [gradeLevels, subjects] = await Promise.all([
    db.select({ gradeLevel: teacherGradeLevelsTable.gradeLevel })
      .from(teacherGradeLevelsTable).where(eq(teacherGradeLevelsTable.teacherId, id)),
    db.select({ id: subjectsTable.id, name: subjectsTable.name, icon: subjectsTable.icon })
      .from(teacherSubjectsTable)
      .innerJoin(subjectsTable, eq(teacherSubjectsTable.subjectId, subjectsTable.id))
      .where(eq(teacherSubjectsTable.teacherId, id)),
  ]);
  res.json({ ...teacher, password: undefined, gradeLevels: gradeLevels.map(r => r.gradeLevel), subjects });
});

// ── Mobile Admin: تعديل أستاذ كامل ──────────────────
router.put("/mobile/admin/teachers/:id", requireMobileAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { fullName, phone, username, password, bio, avatarUrl, isActive, gradeLevels, subjectIds } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (username !== undefined) updates.username = username;
  if (password !== undefined && password !== "") updates.password = password;
  if (bio !== undefined) updates.bio = bio;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  if (isActive !== undefined) updates.isActive = isActive;

  try {
    const [teacher] = await db.update(teachersTable).set(updates).where(eq(teachersTable.id, id)).returning();
    if (!teacher) { res.status(404).json({ error: "الأستاذ غير موجود" }); return; }

    // Update grade levels
    if (Array.isArray(gradeLevels)) {
      await db.delete(teacherGradeLevelsTable).where(eq(teacherGradeLevelsTable.teacherId, id));
      if (gradeLevels.length > 0) {
        await db.insert(teacherGradeLevelsTable)
          .values(gradeLevels.map((gl: string) => ({ teacherId: id, gradeLevel: gl })));
      }
    }
    // Update subjects
    if (Array.isArray(subjectIds)) {
      await db.delete(teacherSubjectsTable).where(eq(teacherSubjectsTable.teacherId, id));
      if (subjectIds.length > 0) {
        await db.insert(teacherSubjectsTable)
          .values(subjectIds.map((sId: number) => ({ teacherId: id, subjectId: sId })))
          .onConflictDoNothing();
      }
    }
    res.json({ ...teacher, password: undefined });
  } catch {
    res.status(409).json({ error: "اسم المستخدم مستخدم مسبقاً" });
  }
});

// ── Mobile Teacher: حذف كورس (يتحقق من الملكية) ──────
router.delete("/mobile/teacher/courses/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const teacherId = parseInt(req.body?.teacherId, 10);
  if (!teacherId) { res.status(400).json({ error: "teacherId مطلوب" }); return; }
  const [course] = await db.select().from(coursesTable).where(eq(coursesTable.id, id));
  if (!course) { res.status(404).json({ error: "الكورس غير موجود" }); return; }
  if (course.teacherId !== teacherId) { res.status(403).json({ error: "ليس لديك صلاحية حذف هذا الكورس" }); return; }
  await db.delete(coursesTable).where(eq(coursesTable.id, id));
  res.sendStatus(204);
});

// ── Mobile Admin: تفاصيل مادة مع أساتذتها ───────────
router.get("/mobile/admin/subjects/:id", requireMobileAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, id));
  if (!subject) { res.status(404).json({ error: "المادة غير موجودة" }); return; }
  const teachers = await db.select({
    id: teachersTable.id,
    fullName: teachersTable.fullName,
    phone: teachersTable.phone,
    username: teachersTable.username,
    bio: teachersTable.bio,
    avatarUrl: teachersTable.avatarUrl,
    isActive: teachersTable.isActive,
  })
    .from(teacherSubjectsTable)
    .innerJoin(teachersTable, eq(teacherSubjectsTable.teacherId, teachersTable.id))
    .where(eq(teacherSubjectsTable.subjectId, id));
  res.json({ ...subject, teachers });
});

// ── Mobile Parent: معلومات الطفل الكاملة ─────────────
router.get("/mobile/parent/child", async (req, res): Promise<void> => {
  const parentId = parseInt(req.headers["x-parent-id"] as string, 10);
  const token = req.headers["x-parent-token"] as string;
  if (!parentId || !token) { res.status(401).json({ error: "غير مصرح" }); return; }
  const [parent] = await db.select().from(parentsTable).where(eq(parentsTable.id, parentId));
  if (!parent || parent.password !== token) { res.status(401).json({ error: "غير مصرح" }); return; }
  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, parent.studentId));
  if (!student) { res.status(404).json({ error: "الطالب غير موجود" }); return; }
  const enrolled = await db.select({ courseId: studentCoursesTable.courseId })
    .from(studentCoursesTable).where(eq(studentCoursesTable.studentId, student.id));
  const courseIds = enrolled.map(r => r.courseId);
  const courses = courseIds.length > 0
    ? await db.select({
        id: coursesTable.id, title: coursesTable.title,
        description: coursesTable.description,
      }).from(coursesTable).where(inArray(coursesTable.id, courseIds))
    : [];
  res.json({ student: { ...student, password: undefined }, courses });
});

export default router;
