import { db } from "./db";
import { documents, notes } from "@shared/schema";
import { sql } from "drizzle-orm";

export async function seedDatabase() {
  const existingDocs = await db.select({ count: sql<number>`count(*)` }).from(documents);
  if (Number(existingDocs[0].count) === 0) {
    const seedDocs = [
      {
        fileUrl: "/uploads/sample-starbucks.pdf",
        merchant: "Starbucks",
        amount: "12.45",
        category: "Finance",
        transactionType: "expense",
        date: "2026-02-10",
        dueDate: null,
        summary: "Grande caramel macchiato and a turkey pesto panini at the downtown location.",
        insight: "Expense of $12.45 saved in Finance.",
        fileSize: 45000,
      },
      {
        fileUrl: "/uploads/sample-comcast.pdf",
        merchant: "Comcast",
        amount: "89.99",
        category: "Home",
        transactionType: "expense",
        date: "2026-02-01",
        dueDate: "2026-02-20",
        summary: "Monthly internet service bill for 200Mbps plan.",
        insight: "Reminder: Payment due on 2026-02-20 (5 days away).",
        fileSize: 38000,
      },
      {
        fileUrl: "/uploads/sample-amazon.pdf",
        merchant: "Amazon",
        amount: "156.78",
        category: "Finance",
        transactionType: "expense",
        date: "2026-02-08",
        dueDate: null,
        summary: "Wireless earbuds and a phone charging cable purchased online.",
        insight: "Expense of $156.78 saved in Finance.",
        fileSize: 52000,
      },
      {
        fileUrl: "/uploads/sample-paycheck.pdf",
        merchant: "Acme Corporation",
        amount: "2500.00",
        category: "Finance",
        transactionType: "income",
        date: "2026-02-14",
        dueDate: null,
        summary: "Bi-weekly pay stub from Acme Corporation, net pay $2,500.",
        insight: "Income of $2,500.00 recorded in Finance.",
        fileSize: 67000,
      },
      {
        fileUrl: "/uploads/sample-w2.pdf",
        merchant: "Acme Corporation",
        amount: "0.00",
        category: "Finance",
        transactionType: "record",
        date: "2024-12-31",
        dueDate: null,
        summary: "W-2 wage statement from Acme Corporation for tax year 2024.",
        insight: "Filed as a record in Finance.",
        fileSize: 41000,
      },
    ];
    await db.insert(documents).values(seedDocs);
    console.log("Database seeded with sample documents");
  }

  const existingNotes = await db.select({ count: sql<number>`count(*)` }).from(notes);
  if (Number(existingNotes[0].count) === 0) {
    const seedNotes = [
      {
        content: "Pay electricity bill - check if rate increased this month",
        reminderDate: "2026-02-28",
        reminderTime: "09:00",
        isCompleted: false,
      },
      {
        content: "Review annual subscription renewals for Netflix and Spotify",
        reminderDate: "2026-02-26",
        reminderTime: "10:00",
        isCompleted: false,
      },
      {
        content: "Compare car insurance quotes before renewal on March 15th",
        reminderDate: "2026-03-01",
        reminderTime: null,
        isCompleted: false,
      },
    ];
    await db.insert(notes).values(seedNotes);
    console.log("Database seeded with sample notes");
  }
}
