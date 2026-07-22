import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";
import { subjectsTable } from "./subjects";

export const studentsTable = pgTable("students", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  gradeLevel: text("grade_level").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  teacherId: integer("teacher_id").references(() => teachersTable.id, { onDelete: "set null" }),
  subjectId: integer("subject_id").references(() => subjectsTable.id, { onDelete: "set null" }),
  parentName: text("parent_name"),
  parentPhone: text("parent_phone"),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudentSchema = createInsertSchema(studentsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertStudent = z.infer<typeof insertStudentSchema>;
export type Student = typeof studentsTable.$inferSelect;

// Student-Course assignments
export const studentCoursesTable = pgTable("student_courses", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  courseId: integer("course_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Student-Subject assignments (which subjects a student can access)
export const studentSubjectsTable = pgTable("student_subjects", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
