import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { parentsTable, studentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

router.get("/parents", requireAdmin, async (req, res): Promise<void> => {
  const studentId = req.query.studentId ? parseInt(req.query.studentId as string, 10) : undefined;
  const parents = studentId
    ? await db.select().from(parentsTable).where(eq(parentsTable.studentId, studentId))
    : await db.select().from(parentsTable);

  const result = await Promise.all(parents.map(async p => {
    const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, p.studentId));
    return { ...p, password: undefined, studentName: student?.fullName ?? null };
  }));

  res.json(result);
});

router.post("/parents", requireAdmin, async (req, res): Promise<void> => {
  const { fullName, phone, email, username, password, studentId } = req.body;
  if (!fullName || !phone || !username || !password || !studentId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [parent] = await db.insert(parentsTable).values({
    fullName, phone, username, password,
    email: email || null,
    studentId: Number(studentId),
  }).returning();
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, Number(studentId)));
  res.status(201).json({ ...parent, password: undefined, studentName: student?.fullName ?? null });
});

router.patch("/parents/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  const { fullName, phone, email, username, password, studentId } = req.body;
  const updates: Record<string, any> = {};
  if (fullName !== undefined) updates.fullName = fullName;
  if (phone !== undefined) updates.phone = phone;
  if (email !== undefined) updates.email = email || null;
  if (username !== undefined) updates.username = username;
  if (password !== undefined) updates.password = password;
  if (studentId !== undefined) updates.studentId = studentId;

  const [parent] = await db.update(parentsTable).set(updates).where(eq(parentsTable.id, id)).returning();
  if (!parent) {
    res.status(404).json({ error: "Parent not found" });
    return;
  }
  const [student] = await db.select({ fullName: studentsTable.fullName }).from(studentsTable).where(eq(studentsTable.id, parent.studentId));
  res.json({ ...parent, password: undefined, studentName: student?.fullName ?? null });
});

router.delete("/parents/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  await db.delete(parentsTable).where(eq(parentsTable.id, id));
  res.sendStatus(204);
});

export default router;
