import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const teachersTable = pgTable("teachers", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  bio: text("bio").notNull().default(""),
  avatarUrl: text("avatar_url"),
  trialLessonUrl: text("trial_lesson_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTeacherSchema = createInsertSchema(teachersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachersTable.$inferSelect;

// Teacher-Subject relationship
export const teacherSubjectsTable = pgTable("teacher_subjects", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => teachersTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Teacher grade levels — which grades each teacher teaches
export const teacherGradeLevelsTable = pgTable("teacher_grade_levels", {
  id: serial("id").primaryKey(),
  teacherId: integer("teacher_id").notNull().references(() => teachersTable.id, { onDelete: "cascade" }),
  gradeLevel: text("grade_level").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const assistantsTable = pgTable("assistants", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  teacherId: integer("teacher_id").notNull().references(() => teachersTable.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertAssistantSchema = createInsertSchema(assistantsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAssistant = z.infer<typeof insertAssistantSchema>;
export type Assistant = typeof assistantsTable.$inferSelect;
