import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { studentsTable } from "./students";
import { teachersTable } from "./teachers";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromStudentId: integer("from_student_id").notNull().references(() => studentsTable.id, { onDelete: "cascade" }),
  toTeacherId: integer("to_teacher_id").notNull().references(() => teachersTable.id, { onDelete: "cascade" }),
  // رسالة الطالب
  text: text("text").notNull(),
  attachmentUrl: text("attachment_url"),           // رابط المرفق (صورة/ملف)
  attachmentType: text("attachment_type"),         // 'image' | 'file'
  attachmentName: text("attachment_name"),         // اسم الملف
  // رد المستجيب (أستاذ أو مساعد)
  replyText: text("reply_text"),
  replyAttachmentUrl: text("reply_attachment_url"),
  replyAttachmentType: text("reply_attachment_type"),
  replyAttachmentName: text("reply_attachment_name"),
  replierType: text("replier_type"),              // 'teacher' | 'assistant'
  replierName: text("replier_name"),              // اسم الأستاذ دائماً (حتى لو رد المساعد)
  repliedAt: timestamp("replied_at", { withTimezone: true }),
  // حالة القراءة
  isReadByTeacher: boolean("is_read_by_teacher").notNull().default(false),
  isReadByStudent: boolean("is_read_by_student").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
