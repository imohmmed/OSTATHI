import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { subjectsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "./admin";

const router: IRouter = Router();

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.name);
  res.json(subjects);
});

router.post("/subjects", requireAdmin, async (req, res): Promise<void> => {
  const { name, icon, gradeLevel, description } = req.body;
  if (!name || !gradeLevel) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [subject] = await db.insert(subjectsTable).values({
    name, gradeLevel,
    icon: icon || null,
    description: description || null,
  }).returning();
  res.status(201).json(subject);
});

router.patch("/subjects/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  const { name, icon, gradeLevel, description } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (icon !== undefined) updates.icon = icon || null;
  if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel;
  if (description !== undefined) updates.description = description || null;

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
