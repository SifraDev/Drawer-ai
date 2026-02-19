# 🗄️ Drawer AI - Your Smart Personal Vault
Drawer is an AI-powered personal vault to easily organize, search, and secure your important documents and papers.

## 💡 Inspiration
We all have that one drawer. It’s full of tax reports, 1099 forms, medical letters, and fading thermal receipts. Finding a single document takes hours. Losing one can cost you a residency application, a tax deduction, or a warranty claim.

We realized that existing mobile tools are just passive "scanners"—they take a picture, but they don't understand the context, they don't organize the data, and they certainly don't act on it. We wanted to build a true **Personal Data Warehouse**. A secure Digital Vault that allows users to retrieve any original document instantly, analyze their historical data, and ultimately, **beat the bureaucracy** that slows down modern life.

## ⚙️ What it does
**Drawer AI** is not just a storage app; it is an intelligent agent that transforms physical chaos into digital order. Technically, it functions as a personal ETL pipeline combined with a RAG system:

`Drawer = ETL + SQL + RAG`

* **Ingest (ETL):** Users upload photos of physical papers or digital PDFs. The system extracts unstructured data and transforms it into structured financial insights.
* **Analyze (SQL):** It tracks your **"All Time Balance"**, analyzing historical costs across years without losing context. It proactively flags anomalies (Inflation Alerts).
* **Retrieve (RAG):** Users can chat with their archive using natural language. Ask: *"Show me the ConEdison bill from June 2023"* and Drawer delivers the original PDF for download in milliseconds.

## 🛠️ How we built it
We built Drawer AI entirely on **Replit**, leveraging its full-stack capabilities to move fast:
1. **Frontend:** React, TypeScript, Tailwind CSS, `framer-motion`, and `canvas-confetti` for gamification.
2. **Backend:** Node.js and Express server.
3. **Storage Architecture:** Custom Multer configuration to handle persistent file storage locally.
4. **Database:** PostgreSQL with Drizzle ORM to map relational data to stored file paths.
5. **AI Integration:** LLMs to power the RAG pipeline for temporal context and semantic search.

## 🚀 How to Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/SifraDev/drawer-ai.git
    ```
2. Navigate to the project directory:
    ```bash
    cd drawer-ai
    ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
  ```bash
    npm run dev
  ```
---

## 🎥 Demo & Links
* **Demo Video:** https://youtu.be/RCeKgMYVggc
* **Live App:** https://drawer-ai.replit.app
* **Promo Animation:** https://drawerai-promo.replit.app/

---

## 🧗 Challenges we ran into
One major challenge was moving beyond simple text extraction to full **File Retrieval**. Initially, the AI could tell you *about* the document, but couldn't *give* you the document. We had to re-architect the backend to ensure a persistent link between the semantic search results (RAG) and the static file system.

Another challenge was UX. Finance is boring, so we spent time polishing the interface with visual feedback—green glowing checks and confetti explosions—to keep the user engaged.

## 🏆 Accomplishments
* **The Digital Vault:** A system that ingests a file, understands its content, and allows the user to download the original PDF on command.
* **Lifetime Analytics:** Flawless handling of temporal data spanning multiple years.
* **Proactive Alerts:** Successful identification of price changes and inflation alerts.

## 🔮 What's next for Drawer AI
Drawer is currently a passive auditor, but we are evolving it into a **Proactive Agent**.
* **Phase 2: Calendar Integration.** Actively reminding you of appointments found in your documents.
* **Phase 3: Form Automation.** Automatically filling out new bureaucratic forms using stored data (Names, Address, Income), making the physical office drawer obsolete.
* **Phase 4: Dedicated Vault Email.** Every user gets a unique `@drawer.ai` address to give directly to employers, clinics, or government offices. Critical documents bypass the personal inbox entirely, landing straight into the organized vault. A strict sender-whitelist ensures zero spam and absolute security.
