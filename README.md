# 🔍 Apex Lens — AI Customer Feedback & Sentiment Analyser

Apex Lens is a production-ready, full-stack SaaS application that parses, clusters, and analyzes customer reviews, support tickets, and NPS surveys. 

By combining **mathematical semantic clustering (KMeans)** with **Large Language Models (Google Gemini 2.5 Flash)**, Apex Lens processes large batches of customer feedback cost-effectively, extracting sentiment scores, top complaints, feature requests, and plain English executive summaries.

🌐 **Live Demo**: [https://apex-lens-git-main-synthos1.vercel.app/](https://apex-lens-git-main-synthos1.vercel.app/)  
🐍 **API Server**: [https://apex-lens-1.onrender.com](https://apex-lens-1.onrender.com)

---

## ⚡ Core Features

- 📥 **Multiformat parsing**: Supports pasted raw text, CSV uploads, PDFs, and Word (`.docx`) files.
- 🧠 **API-based semantic clustering**: Clusters 20+ feedback comments using **Google Gemini Embeddings (`models/embedding-001`)** and **KMeans**—preventing memory bloat and running efficiently under 70MB RAM.
- 📊 **Interactive Analytics Dashboard**: Visualizes sentiment scores (Positive/Neutral/Negative) via a Recharts donut chart.
- 📋 **AI Executive Summaries**: Automatically generates a 2-3 sentence overview of findings.
- 📑 **Report Generation**: Streams print-ready PDF reports compiled server-side on-the-fly using `reportlab`.
- 📈 **History & Delighted Trends**: Plots sentiment trends over time and features a **Side-by-Side comparison** view for tracking improvements.
- 🔐 **Secure Multi-Tenancy**: Built-in Supabase Auth and PostgreSQL RLS (Row Level Security) isolating customer data.

---

## 🛠️ The Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, Recharts, Lucide icons.
- **Backend**: Python FastAPI, Supabase Python Client, Google Generative AI Python SDK, Scikit-Learn.
- **Database & Auth**: Supabase PostgreSQL.
- **Deployment**: Vercel (Frontend) & Render (Backend).

---

## 🏗️ Architecture Design (Why it scales)

1. **Hybrid Math + LLM Pipeline**:
   Instead of feeding all reviews directly into the LLM (which is slow and expensive), Apex Lens runs vector embeddings and **KMeans mathematical clustering** to group similar reviews together. It then feeds only the representative samples of each cluster to Gemini. This saves over **80% in API costs**.
2. **Serverless & API-first**:
   By using Gemini’s hosted Embedding API instead of a local machine learning library (like PyTorch/sentence-transformers), we avoided loading heavy local weights. The backend memory footprint dropped from **500MB+ to under 70MB**, allowing it to scale on Render's free tier.

---

## 🚀 Running Locally

### 1. Database Setup
Execute the table scripts inside your Supabase project's SQL editor:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE feedback_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    raw_text TEXT,
    source_type VARCHAR(50) NOT NULL
);

CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES feedback_batches(id) ON DELETE CASCADE UNIQUE,
    sentiment_json JSONB NOT NULL,
    themes_json JSONB NOT NULL,
    summary_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID REFERENCES feedback_batches(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,
    count INT NOT NULL,
    sentiment VARCHAR(50) NOT NULL
);
```

### 2. Configure Backend
Create a `backend/.env` file:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-service-key
GEMINI_API_KEY=your-gemini-api-key
```
Then run:
```bash
cd backend
python -m venv venv
source venv/bin/activate # Windows: .\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### 3. Configure Frontend
Create a `frontend/.env.local` file:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
Then run:
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🏷️ Credits & License
- Inspired by the build concepts of **Vaibhav Sisinty**.
- Licensed under the MIT License.
