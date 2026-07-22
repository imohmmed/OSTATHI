import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// الصفوف الثابتة للمنصة
export const PLATFORM_GRADE_LEVELS = [
  'ثالث متوسط',
  'رابع اعدادي - علمي',
  'رابع اعدادي - ادبي',
  'خامس اعدادي - علمي',
  'خامس اعدادي - ادبي',
  'سادس اعدادي - علمي',
  'سادس اعدادي - ادبي',
] as const;

export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon"),
  gradeLevel: text("grade_level").notNull().default(""),   // legacy single grade (kept for compat)
  gradeLevels: text("grade_levels"),                        // JSON array of grades e.g. '["ثالث متوسط","رابع اعدادي - علمي"]'
  description: text("description"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;
