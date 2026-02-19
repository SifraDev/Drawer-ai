# Drawer - Personal Data Warehouse

## Overview
A web dashboard (ETL + SQL + RAG) functioning as a Digital Vault where users upload receipts/PDFs/W-2s/any documents. AI (Gemini) extracts ALL data including complete text transcription, stores it in PostgreSQL, and provides intelligent answers to questions about stored documents using RAG. Original uploaded files are preserved in uploads/ directory and can be downloaded via the UI. Features unified chat interface for document upload/questions/notes, calendar view for due dates and reminders, document and note management with editing and deletion, and sidebar navigation with custom logo and dark/light theme toggle.

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui components
- **Backend**: Express.js with multer for file uploads
- **Database**: PostgreSQL via Drizzle ORM
- **AI**: Gemini Flash via Replit AI Integrations (no API key needed)
- **Routing**: wouter (frontend), Express (backend API)

## Key Files
- `shared/schema.ts` - Database schema (documents, notes, chatMessages tables) + category/transaction type constants
- `server/routes.ts` - API endpoints, AI extraction, RAG context builder, friendly emoji responses
- `server/storage.ts` - Database CRUD operations with financial logic (expenses/income/records)
- `server/db.ts` - Database connection
- `server/seed.ts` - Seed data for initial load (documents + notes, seeded independently)
- `client/src/App.tsx` - Main app with routing (public landing/login + protected app layout)
- `client/src/pages/landing.tsx` - Dark-mode landing page with hero
- `client/src/pages/login.tsx` - Login form with hardcoded auth
- `client/src/lib/unread-context.tsx` - Unread chat messages context provider
- `client/src/pages/dashboard.tsx` - Dashboard with stats, upload, recent files
- `client/src/pages/chat.tsx` - Unified chat interface (uploads, questions, notes auto-detected)
- `client/src/pages/calendar.tsx` - Calendar view with bill due dates and reminders
- `client/src/pages/files.tsx` - All documents + notes table with edit/delete functionality
- `client/src/components/` - Reusable components (upload-zone, smart-card, stats-cards, documents-table, app-sidebar)

## Document Categories
Strict categories (AI must choose one):
- **Finance**: Pay stubs, tax papers (1040, 1099, W-2), receipts, bills
- **Health**: Lab results, appointments, insurance docs
- **Personal**: Notes, journal entries, dreams
- **Home**: Rent/Mortgage contracts, car insurance, maintenance
- **Identity/Legal**: IDs, licenses, birth certs
- **Career/School**: Certifications, resume, work notes

## Transaction Types
- **expense**: Bills, receipts (money OUT) - shown in red, subtracted from totals
- **income**: Pay stubs, deposits (money IN) - shown in green, added to totals
- **record**: Informational docs (W-2, 1099, contracts, IDs) - shown in gray, amount=0, excluded from totals

## Authentication
- Client-side only (localStorage), no backend auth
- Landing page at `/` (dark-mode hero, public)
- Login at `/login` with first name, email, password (hardcoded: password `judge2026`)
- Stores `isAuthenticated`, `userName`, `userEmail` in localStorage
- All app routes (`/dashboard`, `/chat`, `/calendar`, `/files`) protected via ProtectedRoute
- Logout clears localStorage and redirects to `/`

## Pages
- `/` - Landing page (dark mode hero, "Launch Demo" button)
- `/login` - Login page with credential hint
- `/dashboard` - Dashboard with personalized greeting, stats cards, upload zone, recent files
- `/chat` - Unified chat interface (auto-detects uploads, questions, note creation)
- `/calendar` - Month grid calendar showing bill due dates and note reminders
- `/files` - Documents table + notes table with inline edit and delete

## API Endpoints
- `GET /api/documents` - List all documents
- `GET /api/documents/:id` - Get single document
- `DELETE /api/documents/:id` - Delete a document (also removes file from disk)
- `GET /api/stats` - Get dashboard statistics (totalExpenses, totalIncome, totalDocuments, topCategory)
- `POST /api/upload` - Upload file, AI extracts data + transaction type, generates insight, saves to DB
- `GET /api/notes` - List all notes
- `POST /api/notes` - Create note (Zod validated with insertNoteSchema)
- `PATCH /api/notes/:id` - Update note content/reminder (Zod validated with partial schema)
- `DELETE /api/notes/:id` - Delete a note
- `GET /api/chat/messages` - Get chat history
- `POST /api/chat/send` - Send chat message (multipart form: message, optional file)
- `POST /api/chat/ghost?name=` - Inject a random personalized AI ghost message (4 demo scenarios)
- `DELETE /api/chat/messages` - Clear chat history
- `GET /api/calendar?start=&end=` - Get calendar events (bills + reminders in date range)

## Upload Flow
1. User uploads PDF/image via drag-and-drop or chat
2. File saved to `/uploads/` directory
3. Gemini AI extracts merchant, amount, category, transaction_type, date, summary, raw_text
4. System enforces financial logic: records get amount=0, validates categories/types
5. Queries DB for previous purchases from same merchant
6. Generates insight (price comparison, due date reminder, or type-specific message)
7. Saves document + insight to database
8. Returns friendly emoji response to frontend

## Chat Behavior
- Unified single mode - no mode buttons
- Auto-detects: file uploads, data questions (RAG), note/reminder creation, download requests
- RAG context includes all document rawText + notes + fileUrl for precise answers
- When user requests to download/view original document, AI responds with markdown download link
- Chat UI parses markdown links to /uploads/* and renders them as clickable download buttons
- Friendly random emoji responses for uploads and note creation

## User Preferences
- Emoji-friendly responses requested by user for uploads and notes
- Custom logo (icon.jpg) in sidebar with subtitle "Your Personal Data Warehouse."

## Running
- `npm run dev` starts Express + Vite on port 5000
- `npm run db:push` pushes schema changes to PostgreSQL
