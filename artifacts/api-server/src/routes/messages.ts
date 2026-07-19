import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { messagesTable, studentsTable, teachersTable } from "@workspace/db";
import { eq, and, desc, or, inArray } from "drizzle-orm";

const router: IRouter = Router();

// Student sends message to teacher
router.post("/messages", async (req, res): Promise<void> => {
  const { fromStudentId, toTeacherId, text } = req.body ?? {};
  if (!fromStudentId || !toTeacherId || !text?.trim()) {
    res.status(400).json({ error: "fromStudentId, toTeacherId, and text are required" });
    return;
  }
  const [msg] = await db
    .insert(messagesTable)
    .values({ fromStudentId: Number(fromStudentId), toTeacherId: Number(toTeacherId), text: text.trim() })
    .returning();
  res.status(201).json(msg);
});

// Teacher's inbox – all messages sent to them, joined with student name
router.get("/messages/teacher/:teacherId", async (req, res): Promise<void> => {
  const teacherId = parseInt(req.params.teacherId, 10);
  const messages = await db
    .select({
      id: messagesTable.id,
      fromStudentId: messagesTable.fromStudentId,
      studentName: studentsTable.fullName,
      toTeacherId: messagesTable.toTeacherId,
      text: messagesTable.text,
      replyText: messagesTable.replyText,
      repliedAt: messagesTable.repliedAt,
      isReadByTeacher: messagesTable.isReadByTeacher,
      isReadByStudent: messagesTable.isReadByStudent,
      createdAt: messagesTable.createdAt,
    })
    .from(messagesTable)
    .leftJoin(studentsTable, eq(messagesTable.fromStudentId, studentsTable.id))
    .where(eq(messagesTable.toTeacherId, teacherId))
    .orderBy(desc(messagesTable.createdAt));
  res.json(messages);
});

// Conversation between a student and a teacher
router.get("/messages/student/:studentId/teacher/:teacherId", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  const teacherId = parseInt(req.params.teacherId, 10);
  const messages = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.fromStudentId, studentId), eq(messagesTable.toTeacherId, teacherId)))
    .orderBy(desc(messagesTable.createdAt));
  // Mark as read by teacher (if caller is teacher)
  await db
    .update(messagesTable)
    .set({ isReadByTeacher: true })
    .where(and(eq(messagesTable.fromStudentId, studentId), eq(messagesTable.toTeacherId, teacherId)));
  res.json(messages);
});

// Teacher replies to a message
router.patch("/messages/:id/reply", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { replyText } = req.body ?? {};
  if (!replyText?.trim()) {
    res.status(400).json({ error: "replyText required" });
    return;
  }
  const [msg] = await db
    .update(messagesTable)
    .set({ replyText: replyText.trim(), repliedAt: new Date(), isReadByStudent: false })
    .where(eq(messagesTable.id, id))
    .returning();
  if (!msg) { res.status(404).json({ error: "Message not found" }); return; }
  res.json(msg);
});

// Mark messages as read by student (called when student opens conversation)
router.patch("/messages/student/:studentId/teacher/:teacherId/read", async (req, res): Promise<void> => {
  const studentId = parseInt(req.params.studentId, 10);
  const teacherId = parseInt(req.params.teacherId, 10);
  await db
    .update(messagesTable)
    .set({ isReadByStudent: true })
    .where(and(eq(messagesTable.fromStudentId, studentId), eq(messagesTable.toTeacherId, teacherId)));
  res.json({ ok: true });
});

// Unread count for teacher
router.get("/messages/teacher/:teacherId/unread-count", async (req, res): Promise<void> => {
  const teacherId = parseInt(req.params.teacherId, 10);
  const unread = await db
    .select()
    .from(messagesTable)
    .where(and(eq(messagesTable.toTeacherId, teacherId), eq(messagesTable.isReadByTeacher, false)));
  res.json({ count: unread.length });
});

export default router;
