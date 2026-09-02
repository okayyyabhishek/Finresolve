# FINRESOLVE

### AI-Powered Financial Settlement Intelligence

<p align="center">

**Investigate financial anomalies with AI.
Validate decisions deterministically.
Automate only what is safe.**

</p>

<p align="center">

[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green?logo=node.js)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7%2B-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/AI-Gemini-orange)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com/)

</p>

---

## The Problem

Financial platforms can generate thousands of settlement exceptions:

* Gateway fee mismatches
* Refund discrepancies
* GST/tax variations
* Partial settlement tranches
* Duplicate debits
* Ledger inconsistencies
* Unexpected settlement differences

Traditional systems typically choose between two extremes:

**Manual review** → safe, but slow and expensive.

**Fully automated rules** → fast, but brittle when exceptions become complex.

**Unrestricted AI agents** → flexible, but dangerous when financial authorization is involved.

FINRESOLVE takes a different approach.

---

# The FINRESOLVE Approach

> **AI investigates. Deterministic policy decides. Humans handle uncertainty.**

```text
                    FINANCIAL TRANSACTIONS
                             │
                             ▼
                  ┌─────────────────────┐
                  │   RECONCILIATION    │
                  │  Decimal.js Math    │
                  └──────────┬──────────┘
                             │
                       Exception?
                             │
                             ▼
                  ┌─────────────────────┐
                  │   AI INVESTIGATION  │
                  │   Gemini + Tools    │
                  └──────────┬──────────┘
                             │
                      Evidence + Reason
                             │
                             ▼
                  ┌─────────────────────┐
                  │   POLICY GATE       │
                  │ Deterministic Rules │
                  └──────────┬──────────┘
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
             AUTO-RESOLVE            ESCALATE
             If safe                 If uncertain
                  │                     │
                  └──────────┬──────────┘
                             ▼
                       AUDIT TRAIL
```

The critical architectural principle is simple:

**The LLM does not control money.**

It gathers evidence, investigates anomalies, and proposes an explanation.

The deterministic policy engine makes the final automation decision.

---

# Why This Project Matters

FINRESOLVE demonstrates a practical pattern for introducing Generative AI into a **high-risk financial workflow** without treating an LLM as an authority.

Instead of asking:

> "Can AI make financial decisions?"

FINRESOLVE asks:

> **"Which financial decisions can AI safely help automate, under measurable constraints?"**

That distinction is the core of the project.

---

# Key Features

### 01 — Precision Financial Reconciliation

Financial calculations are performed using **Decimal.js** rather than JavaScript floating-point arithmetic.

This prevents common monetary precision problems such as:

```text
0.1 + 0.2 ≠ 0.30000000000000004
```

FINRESOLVE applies controlled decimal precision and rounding for monetary calculations.

---

### 02 — AI Investigation Agent

A Gemini-powered investigation agent analyzes settlement exceptions using **function calling**.

The agent can access read-only financial investigation tools to gather evidence from multiple sources.

It can:

* Inspect transaction records
* Compare settlement amounts
* Analyze fee differences
* Investigate refunds
* Examine tax/fee components
* Build causal hypotheses
* Produce an evidence-backed explanation

The agent is intentionally **read-only**.

---

### 03 — Deterministic Policy Gate

AI output is never treated as authorization.

FINRESOLVE evaluates the AI investigation through deterministic policy rules covering factors such as:

* Confidence
* Evidence completeness
* Exception category
* Monetary limits
* Required evidence
* Investigation validity
* Automation eligibility

The final outcome is therefore:

```text
AI Recommendation
       ↓
Deterministic Verification
       ↓
AUTO-RESOLVE or ESCALATE
```

---

### 04 — Fail-Safe by Design

When uncertainty increases, automation decreases.

If the system encounters:

* API failure
* Agent timeout
* Missing evidence
* Low confidence
* Policy violation
* Unsupported exception
* Ambiguous reasoning

the system does **not** attempt a risky guess.

It escalates the case for human review.

```text
UNKNOWN ≠ APPROVE

UNKNOWN → ESCALATE
```

---

### 05 — Coverage vs Risk Analysis

One of the project's strongest features is that it does not simply claim that the AI is "accurate."

FINRESOLVE evaluates how different confidence thresholds affect:

* Automation coverage
* Decision accuracy
* Potential financial exposure
* Safe automation boundaries

The benchmark sweeps confidence thresholds from:

```text
0.0 ─────────────────────────────── 1.0
```

This creates an empirical **coverage-risk curve**.

The goal is not maximum automation.

The goal is:

> **Maximum useful automation within an acceptable risk boundary.**

---

### 06 — Human-in-the-Loop Controller

Cases that cannot safely pass the policy gate can be escalated to a human controller.

The review interface provides:

* Financial breakdown
* Investigation reasoning
* Evidence tree
* Policy checklist
* Decision context
* Review workflow

This creates a practical human-AI control loop instead of an AI-only workflow.

---

# Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                                                             │
│ React + TypeScript + Vite + TailwindCSS + Recharts          │
│                                                             │
│ Dashboard │ Investigations │ Audit & Autonomy │ Analytics   │
└───────────────────────────┬─────────────────────────────────┘
                            │ REST API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                             │
│                                                             │
│ Node.js + Express + TypeScript                              │
│                                                             │
│ Reconciliation → Investigation → Policy → Decision          │
└──────────────┬───────────────────┬──────────────────────────┘
               │                   │
               ▼                   ▼
       ┌───────────────┐    ┌──────────────────┐
       │   MongoDB     │    │   Gemini Agent   │
       │               │    │                  │
       │ Transactions  │    │ Function Calling │
       │ Settlements   │    │ Read-Only Tools  │
       │ Investigations│    │ Evidence         │
       └───────────────┘    └──────────────────┘
                                    │
                                    ▼
                           ┌──────────────────┐
                           │ Deterministic     │
                           │ Policy Gate       │
                           │                  │
                           │ AUTO-RESOLVE      │
                           │ or                │
                           │ ESCALATE          │
                           └──────────────────┘
```

---

# AI Safety Architecture

FINRESOLVE deliberately separates **reasoning** from **authorization**.

| Component             | Responsibility                  | Can authorize money? |
| --------------------- | ------------------------------- | -------------------: |
| Gemini Agent          | Investigate + explain           |                    ❌ |
| Read-only Tools       | Retrieve evidence               |                    ❌ |
| Reconciliation Engine | Calculate discrepancies         |                    ❌ |
| Policy Gate           | Validate automation eligibility |                    ✅ |
| Human Controller      | Review escalations              |                    ✅ |

This separation significantly reduces the blast radius of incorrect model reasoning.

---

# Technology Stack

## Frontend

* React 18+
* TypeScript
* Vite
* TailwindCSS
* Recharts
* Framer Motion
* Lucide React

## Backend

* Node.js 20+
* Express.js
* TypeScript
* MongoDB
* Mongoose

## AI

* Google Gemini API
* `@google/genai`
* Function calling
* Tool-based investigation

## Financial Computing

* Decimal.js
* High-precision arithmetic
* Controlled monetary rounding

## Deployment

* Docker
* Docker Compose
* Multi-stage builds
* Nginx

---

# End-to-End Workflow

### Step 1 — Generate Benchmark Data

FINRESOLVE can generate a controlled synthetic dataset for evaluating the settlement controller.

The benchmark includes matched transactions and multiple exception distributions.

---

### Step 2 — Reconcile Transactions

Each transaction is compared against its corresponding settlement information.

Financial calculations use Decimal.js.

```text
Transaction
     ↓
Settlement
     ↓
Fee / Tax / Refund Components
     ↓
Difference
     ↓
MATCH or EXCEPTION
```

---

### Step 3 — Investigate Exceptions

Exceptions are passed to the Gemini investigation agent.

The agent uses read-only tools to gather relevant evidence.

```text
Exception
   ↓
Tool Calls
   ↓
Evidence
   ↓
Hypothesis
   ↓
Confidence
```

---

### Step 4 — Apply Policy

The deterministic policy engine evaluates the investigation.

```text
Confidence
Evidence
Exception Type
Amount
Completeness
Policy Constraints
       ↓
   Decision
```

---

### Step 5 — Measure the Result

The system compares decisions against benchmark ground truth.

This allows evaluation of:

* Correct automation
* Incorrect automation
* Escalation rate
* Coverage
* Accuracy
* Financial exposure

---

# Example Decision Flow

```text
Settlement Exception
        │
        ▼
AI Investigation
        │
        ├── Confidence: 0.94
        ├── Evidence: Complete
        ├── Exception: Supported
        └── Amount: Within Limit
                │
                ▼
        POLICY GATE PASSED
                │
                ▼
          AUTO-RESOLVE
```

If any critical condition fails:

```text
Settlement Exception
        │
        ▼
AI Investigation
        │
        ├── Confidence: 0.62
        └── Evidence: Incomplete
                │
                ▼
        POLICY GATE FAILED
                │
                ▼
             ESCALATE
                │
                ▼
        HUMAN CONTROLLER
```

---

# Benchmarking & Risk

A key design goal is to measure **how much automation is actually safe**.

Instead of choosing an arbitrary confidence threshold, FINRESOLVE evaluates the controller across a range of thresholds.

```text
Low Threshold
     │
     ▼
More Automation
     │
     ├── Higher Coverage
     └── Higher Risk
     
High Threshold
     │
     ▼
Less Automation
     │
     ├── Lower Coverage
     └── Lower Risk
```

This creates a practical decision surface for selecting an operating point.

---

# Security Principles

### No unrestricted AI actions

The Gemini agent has no direct ability to modify financial records.

### Read-only investigation

AI tools are restricted to retrieving evidence.

### Deterministic authorization

Financial automation decisions are governed by explicit policy rules.

### Fail-safe escalation

Uncertainty results in escalation rather than autonomous execution.

### Ground-truth isolation

Benchmark ground truth is isolated from the investigation agent to prevent evaluation leakage.

### Financial precision

Monetary calculations use Decimal.js instead of JavaScript `Number`.

---

# Project Structure

```text
FINRESOLVE/
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── agents/
│   │   └── ...
│   │
│   ├── tests/
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   │
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

# Quick Start

## Option 1 — Docker

The fastest way to run the complete system.

### 1. Clone

```bash
git clone https://github.com/okayyyabhishek/Razorpay.git
cd Razorpay
```

### 2. Configure environment

```bash
cp .env.example .env
```

Add your Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
```

### 3. Start the application

```bash
docker compose up --build
```

### 4. Open

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:3001
```

Health check:

```text
http://localhost:3001/api/v1/health
```

---

# Manual Development Setup

## Backend

```bash
cd backend

npm install

cp .env.example .env

npm test

npm run dev
```

Backend:

```text
http://localhost:3001
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```text
http://localhost:3000
```

---

# Environment Variables

| Variable                          | Purpose                       | Default                                |
| --------------------------------- | ----------------------------- | -------------------------------------- |
| `MONGODB_URI`                     | MongoDB connection            | `mongodb://localhost:27017/finresolve` |
| `GEMINI_API_KEY`                  | Gemini authentication         | Required                               |
| `GEMINI_MODEL`                    | Gemini model                  | `gemini-2.5-flash`                     |
| `PORT`                            | Backend port                  | `3001`                                 |
| `VITE_API_URL`                    | Frontend API endpoint         | `http://localhost:3001/api/v1`         |
| `CONFIDENCE_THRESHOLD`            | Minimum confidence            | `0.85`                                 |
| `EVIDENCE_COMPLETENESS_THRESHOLD` | Evidence requirement          | `0.80`                                 |
| `MAX_AUTO_RESOLVE_AMOUNT`         | Maximum automated discrepancy | `10000`                                |

---

# How to Explore the Demo

Once the application is running:

### 1. Open the dashboard

Start at the FINRESOLVE workspace.

### 2. Open `Audit & Autonomy`

This is the main evaluation area.

### 3. Generate synthetic data

Use the benchmark generator to create controlled settlement scenarios.

### 4. Process the batch

The complete pipeline executes:

```text
Reconciliation
      ↓
AI Investigation
      ↓
Policy Validation
      ↓
Decision
      ↓
Benchmark Evaluation
```

### 5. Inspect the Coverage-Risk Curve

Explore how changing confidence thresholds changes automation coverage and financial risk.

### 6. Review investigations

Open individual cases to inspect:

* Financial breakdown
* Evidence
* AI reasoning
* Policy checks
* Final decision

---

# Engineering Highlights

This project demonstrates practical experience across several engineering domains:

**Backend Engineering**

* REST APIs
* Express.js
* MongoDB
* Mongoose
* TypeScript
* Service-oriented architecture

**AI Engineering**

* LLM integration
* Gemini API
* Function calling
* Tool-based agents
* Evidence-driven reasoning
* AI guardrails

**Fintech Engineering**

* Monetary precision
* Settlement reconciliation
* Fee/tax calculations
* Financial exception handling
* Risk-aware automation

**Frontend Engineering**

* React
* TypeScript
* Responsive dashboard
* Data visualization
* Interactive analytics

**Software Engineering**

* Deterministic business rules
* Automated tests
* Docker
* Environment configuration
* Fail-safe design

---

# What Makes FINRESOLVE Different?

Most portfolio AI projects stop at:

```text
Input → LLM → Output
```

FINRESOLVE goes further:

```text
Input
  ↓
Deterministic Reconciliation
  ↓
LLM Investigation
  ↓
Evidence Collection
  ↓
Deterministic Policy Verification
  ↓
Risk Evaluation
  ↓
Automation OR Human Escalation
```

The project therefore focuses not only on **AI capability**, but also on:

**AI reliability + financial safety + measurable automation.**

---

# Design Philosophy

## Selective Autonomy

The objective is not to maximize the number of tasks performed by AI.

The objective is to maximize:

```text
SAFE AUTOMATION
```

while minimizing:

```text
FINANCIAL RISK
```

This leads to a simple operating principle:

> **Automate confidence. Escalate uncertainty.**

---

# Future Improvements

Potential production-oriented extensions include:

* Role-based access control
* OAuth / enterprise authentication
* Immutable audit logs
* Real payment gateway integrations
* Event-driven settlement processing
* Queue-based agent execution
* Human approval workflows
* Advanced anomaly detection
* Model evaluation pipelines
* Multi-model investigation
* Production observability
* Prometheus/Grafana metrics
* Kubernetes deployment

---

# Important Notice

This repository uses **synthetic financial data and benchmark rules**.

The fee schedules, tax rates, merchant profiles, transaction identifiers, and settlement scenarios are simulated for evaluation and demonstration purposes.

They do **not** represent production Razorpay pricing, settlement rules, or financial data.

---

# Author

### Abhishek

Computer Science / Software Engineering

Focused on building **AI-powered, production-oriented software systems** with strong backend architecture, automation, and practical AI safety.

---

<p align="center">

### FINRESOLVE

**Don't ask AI to control the money.
Ask AI to understand the problem — and let deterministic systems control the risk.**

</p>

---

## ⭐ If you find the architecture interesting

Star the repository and explore the implementation.

[View Repository](https://github.com/okayyyabhishek/Razorpay)
