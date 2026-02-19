import { sql } from "drizzle-orm";
import { pgTable, serial, text, decimal, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const CATEGORIES = [
  "Finance",
  "Health",
  "Personal",
  "Home",
  "Identity/Legal",
  "Career/School",
] as const;

export const TRANSACTION_TYPES = ["expense", "income", "record"] as const;

export type Category = (typeof CATEGORIES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileUrl: text("file_url").notNull(),
  merchant: text("merchant").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  transactionType: text("transaction_type").notNull().default("record"),
  date: text("date").notNull(),
  dueDate: text("due_date"),
  summary: text("summary").notNull(),
  insight: text("insight").notNull(),
  rawText: text("raw_text"),
  fileSize: integer("file_size").default(0).notNull(),
  filePath: text("file_path"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  reminderDate: text("reminder_date"),
  reminderTime: text("reminder_time"),
  isCompleted: boolean("is_completed").default(false).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
});

export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  attachmentUrl: text("attachment_url"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
