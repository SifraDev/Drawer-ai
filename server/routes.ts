import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { storage } from "./storage";
import {
  insertNoteSchema,
  CATEGORIES,
  TRANSACTION_TYPES,
} from "@shared/schema";

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only PDF, PNG, JPG, and WEBP are allowed.",
        ),
      );
    }
  },
});

const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const extractedDataSchema = z.object({
  merchant: z
    .string()
    .default("Unknown")
    .transform((v) => v.trim() || "Unknown"),
  amount: z.coerce
    .number()
    .default(0)
    .transform((v) => (isNaN(v) || v < 0 ? 0 : v)),
  category: z.string().default("Finance"),
  transaction_type: z
    .string()
    .default("record")
    .transform((v) => {
      const valid = ["expense", "income", "record"];
      return valid.includes(v) ? v : "record";
    }),
  date: z
    .string()
    .default(() => new Date().toISOString().split("T")[0])
    .transform((v) => {
      return /^\d{4}-\d{2}-\d{2}$/.test(v)
        ? v
        : new Date().toISOString().split("T")[0];
    }),
  due_date: z
    .string()
    .nullable()
    .default(null)
    .transform((v) => {
      if (!v) return null;
      return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
    }),
  summary: z.string().default(""),
  raw_text: z.string().default(""),
});

const UPLOAD_RESPONSES = [
  "\u{1F4E5} Got it! I've filed that away safely.",
  "\u{2705} All stored! Your data warehouse just got richer.",
  "\u{1F4BE} Saved and indexed. Ask me anything about it anytime!",
  "\u{1F389} Done! Another document safely in your vault.",
  "\u{1F4C2} Filed and ready! I've extracted all the details.",
  "\u{1F680} Boom, processed! Everything's stored and searchable.",
  "\u{1F9E0} Smart filing complete! I've got all the key details.",
  "\u{1F4CB} Logged and loaded! Your personal warehouse grows.",
  "\u{1F31F} Perfect! That's been scanned, extracted, and stored.",
  "\u{1F50D} All captured! Every detail is now searchable.",
];

const NOTE_RESPONSES = [
  "\u{1F4DD} Note saved! I'll keep track of it for you.",
  "\u{2705} Got it! Your note is safely stored.",
  "\u{1F4CC} Pinned! That's in your notes now.",
  "\u{1F9E0} Noted! I'll remember that for you.",
  "\u{1F4CB} Written down and ready whenever you need it.",
  "\u{1F31F} Done! Your note is tucked away safely.",
  "\u{270D}\u{FE0F} Jotted down! You can find it in your files.",
  "\u{1F389} Saved! One less thing to remember on your own.",
];

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function extractDocumentData(filePath: string, mimeType: string) {
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString("base64");

  const prompt = `You are a document data extraction expert. Analyze this document and extract ALL information.

Return ONLY valid JSON with no additional text or markdown.

The JSON must have these fields:
- "merchant": string (the business, company, employer, organization, or issuer name. For W-2s use the employer name. For tax forms use the issuing agency. NEVER leave this empty.)
- "amount": number (primary monetary value. For receipts/bills use the total. For pay stubs use net pay. For W-2s/1099s/informational docs use 0. For non-financial docs use 0.)
- "category": string - MUST be exactly one of: "Finance", "Health", "Personal", "Home", "Identity/Legal", "Career/School"
  - Finance: Pay stubs, tax papers (1040, 1099, W-2), receipts, bills, bank statements
  - Health: Lab results, appointments, prescriptions, insurance docs, medical records
  - Personal: Notes, journal entries, personal letters, photos
  - Home: Rent/mortgage contracts, car insurance, maintenance records, home repairs
  - Identity/Legal: IDs, licenses, birth certificates, passports, legal contracts
  - Career/School: Certifications, resume, work notes, diplomas, transcripts
- "transaction_type": string - MUST be exactly one of: "expense", "income", "record"
  - "expense": Bills, receipts (supermarket, Netflix, utilities, rent, any purchase or payment OUT)
  - "income": Pay stubs, deposits, refunds (money coming IN)
  - "record": Informational documents (W-2, 1099, contracts, IDs, medical results, certificates). Use amount 0 for records to avoid double-counting.
- "date": string (date in YYYY-MM-DD format. For W-2s use tax year end. Use today if unclear.)
- "due_date": string or null (due date for bills in YYYY-MM-DD, null otherwise)
- "summary": string (brief 1-2 sentence summary)
- "raw_text": string (COMPLETE transcription of ALL visible text. Include names, addresses, phone numbers, account numbers, dates, amounts, line items, etc.)

IMPORTANT: W-2s and 1099s are RECORDS, not income. Their amounts should be 0 to avoid double-counting with actual pay stubs.

Example for a W-2:
{"merchant":"Acme Corp","amount":0,"category":"Finance","transaction_type":"record","date":"2024-12-31","due_date":null,"summary":"W-2 from Acme Corp for tax year 2024, total wages $65,000.","raw_text":"Form W-2..."}

Example for a grocery receipt:
{"merchant":"Walmart","amount":47.53,"category":"Finance","transaction_type":"expense","date":"2025-01-15","due_date":null,"summary":"Groceries at Walmart including produce and dairy.","raw_text":"WALMART SUPERCENTER..."}

Example for a pay stub:
{"merchant":"Acme Corp","amount":2500.00,"category":"Finance","transaction_type":"income","date":"2025-01-31","due_date":null,"summary":"Bi-weekly pay stub from Acme Corp, net pay $2,500.","raw_text":"PAY STUB..."}`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    config: { maxOutputTokens: 16384 },
  });

  const text = response.text || "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      "Failed to extract data from the document. Please try a clearer image or PDF.",
    );
  }

  const raw = JSON.parse(jsonMatch[0]);
  const validated = extractedDataSchema.parse(raw);

  if (!CATEGORIES.includes(validated.category as any)) {
    validated.category = "Finance";
  }

  if (!TRANSACTION_TYPES.includes(validated.transaction_type as any)) {
    validated.transaction_type = "record";
  }

  if (validated.transaction_type === "record") {
    validated.amount = 0;
  }

  return validated;
}

function generateInsight(
  currentAmount: number,
  previousAmount: number | null,
  dueDate: string | null,
  category: string,
  transactionType: string,
): string {
  if (transactionType === "record") {
    return `Filed as a record in ${category}.`;
  }

  if (transactionType === "income") {
    if (previousAmount !== null && previousAmount > 0) {
      const diff = ((currentAmount - previousAmount) / previousAmount) * 100;
      if (diff > 0) {
        return `Income is ${Math.abs(diff).toFixed(0)}% higher than your last deposit ($${previousAmount.toFixed(2)}).`;
      } else if (diff < -5) {
        return `Income is ${Math.abs(diff).toFixed(0)}% lower than your last deposit ($${previousAmount.toFixed(2)}).`;
      }
    }
    return `Income of $${currentAmount.toFixed(2)} recorded in ${category}.`;
  }

  if (previousAmount !== null && previousAmount > 0) {
    const diff = ((currentAmount - previousAmount) / previousAmount) * 100;
    if (diff > 0) {
      return `Alert: This is ${Math.abs(diff).toFixed(0)}% more expensive than your last similar purchase ($${previousAmount.toFixed(2)}).`;
    } else if (diff < -5) {
      return `Great news! This is ${Math.abs(diff).toFixed(0)}% less than your last similar purchase ($${previousAmount.toFixed(2)}).`;
    }
  }

  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const daysUntilDue = Math.ceil(
      (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysUntilDue <= 7 && daysUntilDue >= 0) {
      return `Reminder: Payment due on ${dueDate} (${daysUntilDue} days away).`;
    }
    if (daysUntilDue < 0) {
      return `Alert: This payment was due on ${dueDate} (${Math.abs(daysUntilDue)} days overdue).`;
    }
  }

  return `Expense of $${currentAmount.toFixed(2)} saved in ${category}.`;
}

function buildRAGContext(allDocs: any[], allNotes: any[]): string {
  const expenses = allDocs.filter((d: any) => d.transactionType === "expense");
  const incomes = allDocs.filter((d: any) => d.transactionType === "income");
  const records = allDocs.filter(
    (d: any) => d.transactionType === "record" || !d.transactionType,
  );

  const totalExpenses = expenses.reduce(
    (s: number, d: any) => s + Number(d.amount),
    0,
  );
  const totalIncome = incomes.reduce(
    (s: number, d: any) => s + Number(d.amount),
    0,
  );

  let context = `You are Drawer, an intelligent AI assistant for a personal data warehouse application.
You have access to all the user's stored documents and notes. Answer questions using ONLY the data below - be specific and precise.

Today's date is ${new Date().toISOString().split("T")[0]}.

=== STORED DOCUMENTS (${allDocs.length} total) ===
`;

  for (const doc of allDocs) {
    context += `\n--- Document #${doc.id}: ${doc.merchant} [${doc.transactionType || "record"}] ---\n`;
    context += `Category: ${doc.category} | Type: ${doc.transactionType || "record"} | Amount: $${Number(doc.amount).toFixed(2)} | Date: ${doc.date}`;
    if (doc.dueDate) context += ` | Due: ${doc.dueDate}`;
    if (doc.fileUrl) context += ` | Download: ${doc.fileUrl}`;
    context += `\nSummary: ${doc.summary}\n`;
    if (doc.rawText) {
      context += `Full extracted text:\n${doc.rawText}\n`;
    }
  }

  if (allNotes.length > 0) {
    context += `\n=== NOTES & REMINDERS (${allNotes.length} total) ===\n`;
    for (const note of allNotes) {
      context += `- Note #${note.id}: "${note.content}"`;
      if (note.reminderDate)
        context += ` (Reminder: ${note.reminderDate}${note.reminderTime ? ` at ${note.reminderTime}` : ""})`;
      context += `\n`;
    }
  }

  context += `\n=== FINANCIAL SUMMARY ===
- Total expenses: $${totalExpenses.toFixed(2)} (${expenses.length} expense documents)
- Total income: $${totalIncome.toFixed(2)} (${incomes.length} income documents)
- Net: $${(totalIncome - totalExpenses).toFixed(2)}
- Records (informational, not counted): ${records.length} documents
- Total documents: ${allDocs.length}
- Total notes: ${allNotes.length}
- Categories: ${Array.from(new Set(allDocs.map((d: any) => d.category))).join(", ") || "none"}
- Merchants: ${Array.from(new Set(allDocs.map((d: any) => d.merchant))).join(", ") || "none"}
`;

  return context;
}

async function handleChatWithRAG(
  userMessage: string,
  fileData?: { path: string; mimeType: string; filename: string },
): Promise<{
  response: string;
  createdDocument?: any;
  createdNote?: any;
}> {
  const allDocs = await storage.getDocuments();
  const allNotes = await storage.getNotes();
  const ragContext = buildRAGContext(allDocs, allNotes);

  let fullPrompt =
    ragContext +
    `\n=== INSTRUCTIONS ===
The user may:
1. Upload a document - you will receive the file inline. Process it and report what you extracted.
2. Ask questions about their stored documents - answer precisely using the document data above. Include specific details like addresses, names, amounts, dates, etc.
3. Request analytics - compute totals, comparisons, trends from the stored data. Remember: only expenses subtract, only income adds. Records (W-2s, 1099s, etc.) are informational only.
4. Create a note or reminder - if the user wants to save a note or set a reminder, respond with JSON:
   {"action":"create_note","content":"...note text...","reminder_date":"YYYY-MM-DD or null","reminder_time":"HH:MM or null"}
   Return ONLY the JSON when creating notes. Do not wrap it in markdown.

5. Request to download or view the original document - if the user asks to download, view, or get the original file for a document, include the download link in your response using this exact markdown format: [Download Original Document](FILE_URL) where FILE_URL is the Download URL from the document data above. Always include the download link when the user asks for the original file, receipt, document, or PDF.

For questions, answer naturally and precisely. If information exists in the document data, provide the exact details.
If information is not in any stored document, say so clearly.

User: ${userMessage}`;

  const parts: any[] = [{ text: fullPrompt }];

  if (fileData) {
    const fileBuffer = fs.readFileSync(fileData.path);
    const base64Data = fileBuffer.toString("base64");
    parts.push({
      inlineData: {
        mimeType: fileData.mimeType,
        data: base64Data,
      },
    });

    try {
      const extracted = await extractDocumentData(
        fileData.path,
        fileData.mimeType,
      );
      const previousDoc = await storage.getLastDocumentByMerchant(
        extracted.merchant,
      );
      const previousAmount = previousDoc ? Number(previousDoc.amount) : null;
      const insight = generateInsight(
        extracted.amount,
        previousAmount,
        extracted.due_date,
        extracted.category,
        extracted.transaction_type,
      );

      const fileStat = fs.statSync(fileData.path);
      const createdDocument = await storage.createDocument({
        fileUrl: `/uploads/${path.basename(fileData.path)}`,
        merchant: extracted.merchant,
        amount: extracted.amount.toFixed(2),
        category: extracted.category,
        transactionType: extracted.transaction_type,
        date: extracted.date,
        dueDate: extracted.due_date,
        summary: extracted.summary,
        insight,
        rawText: extracted.raw_text || null,
        fileSize: fileStat.size,
        filePath: fileData.path,
      });

      const friendlyIntro = pickRandom(UPLOAD_RESPONSES);
      let responseText = `${friendlyIntro}\n\n`;
      responseText += `**${extracted.merchant}** | ${extracted.category} | ${extracted.transaction_type.toUpperCase()}\n`;
      if (extracted.transaction_type !== "record") {
        responseText += `Amount: **$${extracted.amount.toFixed(2)}**\n`;
      }
      responseText += `\n${extracted.summary}\n\n${insight}`;
      if (extracted.raw_text) {
        responseText += `\n\nAll details stored and searchable. Ask me anything about this document!`;
      }

      return { response: responseText, createdDocument };
    } catch (err: any) {
      return {
        response: `I had trouble processing that file: ${err.message}. You can try uploading a clearer image or PDF.`,
      };
    }
  }

  const aiResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts }],
    config: { maxOutputTokens: 8192 },
  });

  const responseText =
    aiResponse.text || "I couldn't process that request. Please try again.";

  const jsonMatch = responseText.match(
    /\{[\s\S]*?"action"\s*:\s*"create_note"[\s\S]*?\}/,
  );
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const createdNote = await storage.createNote({
        content: parsed.content || userMessage,
        reminderDate: parsed.reminder_date || null,
        reminderTime: parsed.reminder_time || null,
        isCompleted: false,
      });
      const friendlyIntro = pickRandom(NOTE_RESPONSES);
      let noteResponse = `${friendlyIntro}\n\n"${parsed.content || userMessage}"`;
      if (parsed.reminder_date) {
        noteResponse += `\n\n\u{23F0} Reminder set for ${parsed.reminder_date}${parsed.reminder_time ? ` at ${parsed.reminder_time}` : ""}.`;
      }
      return { response: noteResponse, createdNote };
    } catch {}
  }

  return { response: responseText };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.use("/uploads", express.static(uploadDir));

  app.get("/api/documents", async (_req, res) => {
    try {
      const docs = await storage.getDocuments();
      res.json(docs);
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid document ID" });
      const doc = await storage.getDocument(id);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      res.json(doc);
    } catch (error: any) {
      console.error("Error fetching document:", error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id))
        return res.status(400).json({ error: "Invalid document ID" });
      const doc = await storage.getDocument(id);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      await storage.deleteDocument(id);
      if (doc.fileUrl) {
        const filePath = path.join(process.cwd(), doc.fileUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting document:", error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.get("/api/stats", async (_req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  app.get("/api/stats/monthly-flow", async (req, res) => {
    try {
      const year =
        parseInt(req.query.year as string) || new Date().getFullYear();
      const month =
        parseInt(req.query.month as string) || new Date().getMonth() + 1;
      const data = await storage.getMonthlyFlow(year, month);
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching monthly flow:", error);
      res.status(500).json({ error: "Failed to fetch monthly flow" });
    }
  });

  app.get("/api/stats/storage", async (_req, res) => {
    try {
      const data = await storage.getStorageByCategory();
      res.json(data);
    } catch (error: any) {
      console.error("Error fetching storage stats:", error);
      res.status(500).json({ error: "Failed to fetch storage stats" });
    }
  });

  app.post(
    "/api/upload",
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          return res
            .status(400)
            .json({ error: `Upload error: ${err.message}` });
        }
        if (err) return res.status(400).json({ error: err.message });
        next();
      });
    },
    async (req, res) => {
      try {
        if (!req.file)
          return res.status(400).json({ error: "No file uploaded" });

        const fileUrl = `/uploads/${req.file.filename}`;
        const extracted = await extractDocumentData(
          req.file.path,
          req.file.mimetype,
        );

        const previousDoc = await storage.getLastDocumentByMerchant(
          extracted.merchant,
        );
        const previousAmount = previousDoc ? Number(previousDoc.amount) : null;
        const insight = generateInsight(
          extracted.amount,
          previousAmount,
          extracted.due_date,
          extracted.category,
          extracted.transaction_type,
        );

        const document = await storage.createDocument({
          fileUrl,
          merchant: extracted.merchant,
          amount: extracted.amount.toFixed(2),
          category: extracted.category,
          transactionType: extracted.transaction_type,
          date: extracted.date,
          dueDate: extracted.due_date,
          summary: extracted.summary,
          insight,
          rawText: extracted.raw_text || null,
          fileSize: req.file!.size,
          filePath: req.file!.path,
        });

        res.json(document);
      } catch (error: any) {
        console.error("Error uploading document:", error);
        res
          .status(500)
          .json({ error: error.message || "Failed to process document" });
      }
    },
  );

  app.get("/api/notes", async (_req, res) => {
    try {
      const allNotes = await storage.getNotes();
      res.json(allNotes);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch notes" });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const parsed = insertNoteSchema.parse(req.body);
      const note = await storage.createNote({
        content: parsed.content,
        reminderDate: parsed.reminderDate || null,
        reminderTime: parsed.reminderTime || null,
        isCompleted: parsed.isCompleted ?? false,
      });
      res.json(note);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid note data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create note" });
    }
  });

  app.patch("/api/notes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid note ID" });
      const partialSchema = insertNoteSchema.partial();
      const parsed = partialSchema.parse(req.body);
      const updated = await storage.updateNote(id, parsed);
      res.json(updated);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid note data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update note" });
    }
  });

  app.delete("/api/notes/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid note ID" });
      await storage.deleteNote(id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to delete note" });
    }
  });

  app.get("/api/chat/messages", async (_req, res) => {
    try {
      const msgs = await storage.getChatMessages();
      res.json(msgs);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post(
    "/api/chat/send",
    (req, res, next) => {
      upload.single("file")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          return res
            .status(400)
            .json({ error: `Upload error: ${err.message}` });
        }
        if (err) return res.status(400).json({ error: err.message });
        next();
      });
    },
    async (req, res) => {
      try {
        const message = req.body.message || "";

        if (!message && !req.file) {
          return res
            .status(400)
            .json({ error: "Please provide a message or file" });
        }

        const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

        await storage.createChatMessage({
          role: "user",
          content:
            message || (req.file ? `Uploaded: ${req.file.originalname}` : ""),
          attachmentUrl: fileUrl,
        });

        const fileData = req.file
          ? {
              path: req.file.path,
              mimeType: req.file.mimetype,
              filename: req.file.originalname,
            }
          : undefined;

        const result = await handleChatWithRAG(message, fileData);

        const assistantMsg = await storage.createChatMessage({
          role: "assistant",
          content: result.response,
          attachmentUrl: null,
        });

        res.json({
          assistantMessage: assistantMsg,
          document: result.createdDocument || null,
          note: result.createdNote || null,
        });
      } catch (error: any) {
        console.error("Error in chat:", error);
        res
          .status(500)
          .json({ error: error.message || "Failed to process message" });
      }
    },
  );

  app.delete("/api/chat/messages", async (_req, res) => {
    try {
      await storage.clearChatMessages();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Failed to clear messages" });
    }
  });

  function getGhostScenarios(name: string) {
    return [
      `\u{1F4B0} Good news, ${name}! A deposit of $4,500 from Sifra Inc. just hit your account. Labeled as: Developer Salary. Added to Income.`,
      `\u{2708}\u{FE0F} Urgent: ${name}, I noticed your Passport expires in Aug 2026. You should renew it now if you plan to travel.`,
      `\u{1F3E5} Follow-up: ${name}, based on your last Lab Results from Dr. House, you need to schedule a check-up next week. Vitamin D is low.`,
      `\u{1F4C8} Insight: Your spending on Dining Out is down 12% compared to last month. Great job sticking to the budget!`,
      `\u{1F514} Reminder: Your Adobe Creative Cloud subscription renewal ($54.99) is coming up on March 2nd.`,
      `\u{1F6E1}\u{FE0F} Security: I flagged a duplicate charge of $12.50 from Uber. No action needed, just keeping it in your records.`,
      `\u{1F4B0} Savings: You have reached 80% of your savings goal for the "Europe Trip" fund.`,
      `\u{1F4C4} Tax Watch: That last Amazon purchase was categorized as "Office Supplies". Added to your potential tax deductions.`,
      `\u{1F4C9} Trend: You have spent $0 on Rideshare apps this week. That is a personal record!`,
      `\u{1F4B3} Card Alert: Your credit utilization on the Chase Sapphire card is currently at 28%. Recommended to keep it under 30%.`,
      `\u{1F504} Subscription: Detected a price increase in your internet bill from Comcast (+$5.00/mo).`,
      `\u{1F4CA} Report: Your Weekly Financial Digest is ready in the Files tab.`,
      `\u{26A1} Utility: Electricity usage projected to be lower this month based on current trends.`,
      `\u{1F393} Loan: Student loan payment of $250.00 processed successfully.`,
      `\u{1F4BC} Income: Freelance payment of $800.00 from Upwork has been cleared.`,
    ];
  }

  let lastGhostIndex = -1;

  app.post("/api/chat/ghost", async (req, res) => {
    try {
      const name = (req.query.name as string) || "User";
      const scenarios = getGhostScenarios(name);
      let index = Math.floor(Math.random() * scenarios.length);
      if (scenarios.length > 1) {
        while (index === lastGhostIndex) {
          index = Math.floor(Math.random() * scenarios.length);
        }
      }
      lastGhostIndex = index;
      const msg = await storage.createChatMessage({
        role: "assistant",
        content: scenarios[index],
        attachmentUrl: null,
      });
      res.json(msg);
    } catch (error: any) {
      console.error("Error creating ghost message:", error);
      res.status(500).json({ error: "Failed to create ghost message" });
    }
  });

  app.get("/api/calendar", async (req, res) => {
    try {
      const startDate = (req.query.start as string) || "2020-01-01";
      const endDate = (req.query.end as string) || "2030-12-31";
      const events = await storage.getCalendarEvents(startDate, endDate);
      res.json(events);
    } catch (error: any) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ error: "Failed to fetch calendar events" });
    }
  });

  return httpServer;
}
