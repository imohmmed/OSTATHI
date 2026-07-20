import { pgTable, text, serial, timestamp, boolean, integer, unique, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";
import { subjectsTable } from "./subjects";
import { studentsTable } from "./students";

export const coursesTable = pgTable("courses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "restrict" }),
  teacherId: integer("teacher_id").notNull().references(() => teachersTable.id, { onDelete: "restrict" }),
  gradeLevel: text("grade_level"),
  isPublished: boolean("is_published").notNull().default(false),
  isTrial: boolean("is_trial").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertCourseSchema = createInsertSchema(coursesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof coursesTable.$inferSelect;

export const lessonsTable = pgTable("lessons", {
  id: serial("id").primaryKey(),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull().default("video"), // video, pdf, quiz, assignment, link, livestream, feedback
  contentUrl: text("content_url"),
  contentText: text("content_text"),
  order: integer("order").notNull().default(0),
  duration: integer("duration"), // in seconds
  isPublished: boolean("is_published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLessonSchema = createInsertSchema(lessonsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLesson = z.infer<typeof insertLessonSchema>;
export type Lesson = typeof lessonsTable.$inferSelect;

export const quizzesTable = pgTable("quizzes", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  type: text("type").notNull().default("multiple_choice"), // multiple_choice, true_false, fill_blank, short_answer
  options: text("options").array().notNull().default([]),
  correctAnswer: text("correct_answer"),
  explanation: text("explanation"),
  points: integer("points").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertQuizSchema = createInsertSchema(quizzesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuiz = z.infer<typeof insertQuizSchema>;
export type Quiz = typeof quizzesTable.$inferSelect;

// ── Lesson reactions (like / dislike per student) ────────────────────────────
export const lessonReactionsTable = pgTable("lesson_reactions", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  reaction: text("reaction").notNull(), // 'like' | 'dislike'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [unique().on(t.lessonId, t.studentId)]);

// ── Lesson video progress (position tracking per student) ────────────────────
export const lessonVideoProgressTable = pgTable("lesson_video_progress", {
  id: serial("id").primaryKey(),
  lessonId: integer("lesson_id").notNull().references(() => lessonsTable.id, { onDelete: "cascade" }),
  studentId: integer("student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  positionSeconds: doublePrecision("position_seconds").notNull().default(0),
  completed: boolean("completed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [unique().on(t.lessonId, t.studentId)]);
