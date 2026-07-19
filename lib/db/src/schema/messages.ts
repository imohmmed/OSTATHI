import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { teachersTable } from "./teachers";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromStudentId: integer("from_student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  toTeacherId: integer("to_teacher_id").notNull().references(() => teachersTable.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  replyText: text("reply_text"),
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  isReadByTeacher: boolean("is_read_by_teacher").notNull().default(false),
  isReadByStudent: boolean("is_read_by_student").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
