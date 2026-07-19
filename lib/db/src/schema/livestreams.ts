import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { teachersTable } from "./teachers";
import { coursesTable } from "./courses";

export const livestreamsTable = pgTable("livestreams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  teacherId: integer("teacher_id").notNull().references(() => teachersTable.id, { onDelete: "restrict" }),
  courseId: integer("course_id").notNull().references(() => coursesTable.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("scheduled"), // scheduled, live, ended
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  viewersCount: integer("viewers_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertLivestreamSchema = createInsertSchema(livestreamsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLivestream = z.infer<typeof insertLivestreamSchema>;
export type Livestream = typeof livestreamsTable.$inferSelect;
