import { db } from "./db";
import {
  documents, type Document, type InsertDocument,
  notes, type Note, type InsertNote,
  chatMessages, type ChatMessage, type InsertChatMessage,
} from "@shared/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";

export interface IStorage {
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  getLastDocumentByMerchant(merchant: string): Promise<Document | undefined>;
  getStats(): Promise<{
    totalExpenses: number;
    totalIncome: number;
    totalDocuments: number;
    topCategory: string | null;
    totalStorageBytes: number;
  }>;
  getStorageByCategory(): Promise<Array<{
    category: string;
    count: number;
    totalBytes: number;
  }>>;
  getMonthlyFlow(year: number, month: number): Promise<Array<{
    date: string;
    expenses: number;
    income: number;
  }>>;

  getNotes(): Promise<Note[]>;
  getNote(id: number): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, updates: Partial<InsertNote>): Promise<Note>;
  deleteNote(id: number): Promise<void>;

  getChatMessages(): Promise<ChatMessage[]>;
  createChatMessage(msg: InsertChatMessage): Promise<ChatMessage>;
  clearChatMessages(): Promise<void>;

  getCalendarEvents(startDate: string, endDate: string): Promise<Array<{
    id: number;
    title: string;
    date: string;
    type: "bill" | "reminder";
    details?: string;
  }>>;
}

export class DatabaseStorage implements IStorage {
  async getDocuments(): Promise<Document[]> {
    return db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(doc).returning();
    return created;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getLastDocumentByMerchant(merchant: string): Promise<Document | undefined> {
    const results = await db
      .select()
      .from(documents)
      .where(eq(documents.merchant, merchant))
      .orderBy(desc(documents.createdAt))
      .limit(1);
    return results[0];
  }

  async getStats() {
    const allDocs = await db.select().from(documents);

    const totalExpenses = allDocs
      .filter(d => d.transactionType === "expense")
      .reduce((sum, d) => sum + Number(d.amount), 0);
    const totalIncome = allDocs
      .filter(d => d.transactionType === "income")
      .reduce((sum, d) => sum + Number(d.amount), 0);
    const totalDocuments = allDocs.length;
    const totalStorageBytes = allDocs.reduce((sum, d) => sum + (d.fileSize || 0), 0);

    const categoryBytes: Record<string, number> = {};
    for (const doc of allDocs) {
      categoryBytes[doc.category] = (categoryBytes[doc.category] || 0) + (doc.fileSize || 0);
    }
    const topCategory = Object.entries(categoryBytes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    return { totalExpenses, totalIncome, totalDocuments, topCategory, totalStorageBytes };
  }

  async getStorageByCategory() {
    const allDocs = await db.select().from(documents);
    const map: Record<string, { count: number; totalBytes: number }> = {};
    for (const doc of allDocs) {
      if (!map[doc.category]) map[doc.category] = { count: 0, totalBytes: 0 };
      map[doc.category].count++;
      map[doc.category].totalBytes += doc.fileSize || 0;
    }
    return Object.entries(map)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.totalBytes - a.totalBytes);
  }

  async getMonthlyFlow(year: number, month: number) {
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    const allDocs = await db.select().from(documents);
    const filtered = allDocs.filter(d => d.date >= startDate && d.date <= endDate);

    const dayMap: Record<string, { expenses: number; income: number }> = {};
    for (let day = 1; day <= lastDay; day++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      dayMap[dateStr] = { expenses: 0, income: 0 };
    }

    for (const doc of filtered) {
      if (!dayMap[doc.date]) dayMap[doc.date] = { expenses: 0, income: 0 };
      if (doc.transactionType === "expense") {
        dayMap[doc.date].expenses += Number(doc.amount);
      } else if (doc.transactionType === "income") {
        dayMap[doc.date].income += Number(doc.amount);
      }
    }

    return Object.entries(dayMap)
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async getNotes(): Promise<Note[]> {
    return db.select().from(notes).orderBy(desc(notes.createdAt));
  }

  async getNote(id: number): Promise<Note | undefined> {
    const [note] = await db.select().from(notes).where(eq(notes.id, id));
    return note;
  }

  async createNote(note: InsertNote): Promise<Note> {
    const [created] = await db.insert(notes).values(note).returning();
    return created;
  }

  async updateNote(id: number, updates: Partial<InsertNote>): Promise<Note> {
    const [updated] = await db.update(notes).set(updates).where(eq(notes.id, id)).returning();
    return updated;
  }

  async deleteNote(id: number): Promise<void> {
    await db.delete(notes).where(eq(notes.id, id));
  }

  async getChatMessages(): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).orderBy(chatMessages.createdAt);
  }

  async createChatMessage(msg: InsertChatMessage): Promise<ChatMessage> {
    const [created] = await db.insert(chatMessages).values(msg).returning();
    return created;
  }

  async clearChatMessages(): Promise<void> {
    await db.delete(chatMessages);
  }

  async getCalendarEvents(startDate: string, endDate: string) {
    const allDocs = await db.select().from(documents);
    const allNotes = await db.select().from(notes);

    const events: Array<{
      id: number;
      title: string;
      date: string;
      type: "bill" | "reminder";
      details?: string;
    }> = [];

    for (const doc of allDocs) {
      if (doc.dueDate && doc.dueDate >= startDate && doc.dueDate <= endDate) {
        events.push({
          id: doc.id,
          title: `${doc.merchant} - $${Number(doc.amount).toFixed(2)}`,
          date: doc.dueDate,
          type: "bill",
          details: doc.summary,
        });
      }
    }

    for (const note of allNotes) {
      if (note.reminderDate && note.reminderDate >= startDate && note.reminderDate <= endDate) {
        events.push({
          id: note.id + 100000,
          title: note.content.length > 50 ? note.content.slice(0, 50) + "..." : note.content,
          date: note.reminderDate,
          type: "reminder",
          details: note.content,
        });
      }
    }

    return events.sort((a, b) => a.date.localeCompare(b.date));
  }
}

export const storage = new DatabaseStorage();
