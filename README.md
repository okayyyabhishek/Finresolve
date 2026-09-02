# FINRESOLVE — Selective-Autonomy Settlement Controller

> **"An AI finance controller that investigates settlement exceptions, explains the evidence behind its decisions, and empirically shows how much financial work can safely be automated."**

---

## ⚡ Overview

Financial settlements at scale face thousands of daily discrepancies: gateway fee variances, unadjusted refunds, GST tax slab shifts, tranche cutoff partials, and double-debit anomalies. 

Traditional approaches either rely on manual human review queues (slow, expensive) or blunt heuristic scripts (brittle, risky). Fully autonomous LLMs risk catastrophic financial errors without deterministic guardrails.

**FINRESOLVE** solves this through **Selective Autonomy**:
1. **Deterministic Reconciliation**: High-precision `Decimal.js` matching flags exceptions with exact ₹0.01 tolerance.
2. **Autonomous Investigation Agent**: Single Gemini 2.5 instance queries 6 read-only tools to gather multi-source evidence and construct causal hypotheses.
3. **Deterministic Policy Gate**: Strict 6-rule verification enforces confidence, completeness, monetary caps, and exception categories. **The LLM never authorizes money; the policy gate decides.**
4. **Empirical Coverage-Risk Sweeper**: Sweeps confidence thresholds from 0.0 to 1.0 against ground-truth benchmarks to empirically prove safe automation boundaries.

---

## 🛠️ Mandatory Tech Stack

- **Backend**: Node.js 20+, Express.js, TypeScript (strict mode), MongoDB with Mongoose ODM
- **Financial Precision**: `Decimal.js` (20-decimal precision, Half-Up rounding for all monetary math)
- **Agent Intelligence**: Google Gemini API (`@google/genai` SDK with function calling)
- **Frontend**: React 18+, Vite, TypeScript, TailwindCSS v3 (futuristic dark glassmorphism + light mode)
- **Visualization**: Recharts (Parametric Coverage-Risk Curve), Framer Motion, Lucide React
- **Deployment**: Multi-stage Docker & Docker Compose

---

## 🚀 Quick Start (Docker Compose)

The easiest way to start the entire FINRESOLVE system (MongoDB + Express Backend + React/Nginx Frontend):

```bash
# 1. Clone repository and navigate to root
cd finresolve

# 2. Configure environment variables
cp .env.example .env
# Edit .env and supply your GEMINI_API_KEY

# 3. Build and launch all services
docker compose up --build
```

Access the applications:
- **Frontend Workspace**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Health**: [http://localhost:3001/api/v1/health](http://localhost:3001/api/v1/health)
- **MongoDB**: `localhost:27017`

---

## 💻 Local Manual Setup

### Prerequisites
- Node.js 20+
- MongoDB 7+ running on `localhost:27017`
- Gemini API Key

### 1. Backend Setup
```bash
cd backend
npm install
cp .env.example .env

# Run test suite to verify financial arithmetic
npm test

# Build and start development server
npm run dev
# Server runs at http://localhost:3001
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Vite dev server runs at http://localhost:3000
```

---

## ⚙️ Environment Variables

| Variable | Description | Default |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/finresolve` |
| `GEMINI_API_KEY` | Google Gemini API Key | Required for LLM tool calling |
| `GEMINI_MODEL` | Gemini Model identifier | `gemini-2.5-flash` |
| `PORT` | Backend port | `3001` |
| `VITE_API_URL` | Backend API URL for frontend | `http://localhost:3001/api/v1` |
| `CONFIDENCE_THRESHOLD` | Policy gate minimum confidence | `0.85` |
| `EVIDENCE_COMPLETENESS_THRESHOLD` | Policy gate minimum evidence completeness | `0.80` |
| `MAX_AUTO_RESOLVE_AMOUNT` | Max ₹ discrepancy permitted for auto-resolution | `10000` |

---

## 📖 End-to-End Workflow Guide

1. **Open the Workspace**: Navigate to [http://localhost:3000](http://localhost:3000).
2. **Navigate to Audit & Autonomy**: Click **"Audit & Autonomy"** in the sidebar.
3. **Generate Benchmark Data**: Click **"Generate Synthetic Data"** (seed: `42`). This creates exactly 75 records (35 matched, 40 across 10 exception distributions) and populates isolated Ground Truth.
4. **Execute Pipeline**: Click **"Process Batch"**. FINRESOLVE reconciles transactions, calls Gemini to investigate anomalies, applies the deterministic policy gate, and benchmarks decisions against Ground Truth.
5. **Inspect Coverage-Risk Curve**: Hover over the interactive sweep curve to view how adjusting confidence thresholds from 0.0 to 1.0 alters coverage, accuracy, and ₹ risk exposure.
6. **Investigate Exceptions**: Switch to **"Investigations"** view to review side-by-side financial breakdowns, vertical evidence trees, policy pass/fail checklists, and perform human controller reviews.

---

## 🔒 Security & Safe-By-Design Principles

- **Zero Floating-Point Drift**: JavaScript `Number` is strictly prohibited for monetary calculations. All calculations use `Decimal.js`.
- **Read-Only Agent Tools**: The Gemini agent has zero write/execution permissions; it can only query ledgers.
- **Fail-Safe Escalation**: Any API failure, timeout, or ambiguity immediately fails open to `ESCALATE`.
- **Ground Truth Isolation**: The Ground Truth collection is physically inaccessible to the investigation agent.

---

## 📜 License & Synthetic Rules Notice

```
// SYNTHETIC BENCHMARK RULES — do not represent production Razorpay pricing
```
All fee schedules, tax rates, merchant profiles, and transaction IDs in this repository are synthetic benchmark simulations created for controller evaluation.
