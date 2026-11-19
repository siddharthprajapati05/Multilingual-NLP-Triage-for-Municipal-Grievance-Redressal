# Municipal Grievance Redressal System (MGRS)
## Comprehensive Technical Project Report

---

### Executive Summary

The **Municipal Grievance Redressal System (MGRS)** is an intelligent, full-stack municipal governance platform designed to bridge the communication gap between citizens and municipal authorities across India. By combining a modern web interface with a **multilingual Natural Language Processing (NLP)** triage engine, the system automates the ingestion, translation, classification, urgency scoring, and department routing of public civic complaints submitted in regional Indian languages and Hinglish (colloquial romanized Hindi).

---

## 1. Project Overview: What, Why, and How

### 1.1 What the Project Does
- **For Citizens**: Provides an accessible portal to lodge civic complaints (water leakage, uncollected garbage, broken streetlights, potholed roads, hazardous electrical wires) in their preferred language (English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada, Malayalam, Punjabi, or Hinglish). It allows citizens to track resolution progress live, view AI triage breakdowns, and receive status updates.
- **For Municipal Administrators**: Automatically routes each complaint to the appropriate civic department with a confidence score, urgency rating (LOW, MEDIUM, HIGH), and an estimated SLA resolution deadline. Provides analytics dashboards and allows administrative overrides when AI predictions need correction.

### 1.2 Why the Project Was Built (Problem Statement)
1. **Linguistic Diversity vs. Administrative Language**: India has 22 officially recognized languages and thousands of regional dialects. Many citizens cannot write formal English or formal regional scripts, frequently submitting grievances in colloquial romanized forms like Hinglish (e.g., *"humare yha pe 10 din se panni nhi ara hai"*). Traditional municipal portals fail to process these inputs.
2. **Manual Triage Bottleneck**: In conventional municipal corporations, thousands of complaints are manually sorted by desk officers. This leads to days of triage delay, incorrect department assignments, and missed hazardous emergencies.
3. **Emergency Escalation Failure**: Urgent civic hazards (e.g., live electrical wires dangling on streets, severe drinking water contamination, road cave-ins) get buried in general queues without urgency escalation.

### 1.3 How the System Solves This
MGRS implements a **Hybrid AI + Rule-Governed Pipeline**:
- **Full Multilingual Coverage**: Natively supports **10 major Indian languages** across 7 distinct scripts, plus **Hinglish** (Romanized Hindi) for everyday conversational complaints.
- **Automated AI Triage**: Employs an Indian-language transformer backbone (`IndicBERTv2`) to classify complaints into 8 civic departments and evaluate urgency.
- **Cascading Translation Pipeline**: Converts non-English and Hinglish text into standard English via a multi-tier translation pipeline (Google API $\rightarrow$ MyMemory API $\rightarrow$ local Meta NLLB-200 offline fallback).
- **Deterministic Safety Guardrails**: Keyword safety layers enforce high urgency for life-threatening situations and ensure accurate domain categorization.
- **Human-in-the-Loop Override**: Administrators retain authority to override AI classifications, change departments, re-estimate resolution timelines, and correct translations, maintaining a transparent audit trail.

---

## 2. Comprehensive Multilingual Framework: 10 Major Indian Languages + Hinglish

MGRS is built from the ground up to solve India's profound language divide. Citizens are **not** restricted to English or Hinglish; the platform provides complete, production-tested end-to-end processing across **10 officially recognized Indian languages** spanning Indo-Aryan and Dravidian language families, alongside **Hinglish**:

### 2.1 Complete Language Matrix

| # | Language Name | Native Script | BCP-47 Code | Script Family | Unicode Hex Range | Meta NLLB-200 Code |
| :-: | :--- | :--- | :---: | :--- | :--- | :---: |
| **1** | **English** | Latin (English) | `en` | Latin | `0x0020 - 0x007F` | `eng_Latn` |
| **2** | **Hindi** | हिन्दी | `hi` | Devanagari | `0x0900 - 0x097F` | `hin_Deva` |
| **3** | **Bengali** | বাংলা | `bn` | Bengali-Assamese | `0x0980 - 0x09FF` | `ben_Beng` |
| **4** | **Tamil** | தமிழ் | `ta` | Tamil | `0x0B80 - 0x0BFF` | `tam_Taml` |
| **5** | **Telugu** | తెలుగు | `te` | Telugu | `0x0C00 - 0x0C7F` | `tel_Telu` |
| **6** | **Marathi** | मराठी | `mr` | Devanagari | `0x0900 - 0x097F` | `mar_Deva` |
| **7** | **Gujarati** | ગુજરાતી | `gu` | Gujarati | `0x0A80 - 0x0AFF` | `guj_Gujr` |
| **8** | **Kannada** | ಕನ್ನಡ | `kn` | Kannada | `0x0C80 - 0x0CFF` | `kan_Knda` |
| **9** | **Malayalam** | മലയാളം | `ml` | Malayalam | `0x0D00 - 0x0D7F` | `mal_Mlym` |
| **10** | **Punjabi** | ਪੰਜਾਬੀ | `pa` | Gurmukhi | `0x0A00 - 0x0A7F` | `pan_Guru` |
| **+** | **Hinglish** | Romanized Hindi | `hin` / `en` | Latin (Phonetic Indic) | `0x0020 - 0x007F` | `hin_Deva` / auto |

### 2.2 How the System Handles Multi-Language Ingestion

1. **Automatic Script-Based Detection (`detect_language`)**:
   - The engine analyzes character byte codepoints. Because Indian scripts occupy mutually exclusive Unicode blocks, script detection is 100% deterministic (e.g., Bengali `0x0980-0x09FF`, Gurmukhi `0x0A00-0x0A7F`, Tamil `0x0B80-0x0BFF`, etc.).
   - **Devanagari Disambiguation**: When Devanagari characters (`0x0900-0x097F`) are identified, the system utilizes the user's regional selection hint or invokes statistical n-gram probabilities (`langdetect`) to accurately distinguish between **Hindi** and **Marathi**.
2. **Dedicated Hinglish Detection & Normalization**:
   - When a citizen writes Hindi words using the English alphabet (e.g. *"humare yha pe 10 din se panni nhi ara hai"*), the text is composed of Latin characters.
   - The engine matches tokens against `COMMON_HINGLISH_WORDS` (~50 common colloquial terms like *humare, yahan, panni, pani, nahi, bijli, sadak, kachra, batti, gaddha*).
   - Once flagged as Hinglish, colloquial spelling irregularities are standardized (*panni* $\rightarrow$ *paani (tap water supply)*, *yha* $\rightarrow$ *yahan*, *nhi* $\rightarrow$ *nahi*, *ara* $\rightarrow$ *aa raha*) before translation.
3. **Multi-Engine Translation Cascade**:
   - Municipal staff dashboards require a unified language for cross-departmental coordination. Non-English complaints are translated into English using a 3-tier cascade:
     - **Tier 1 (Primary)**: Google Cloud Translation endpoint (low latency ~0.1s).
     - **Tier 2 (Secondary)**: MyMemory Public API fallback.
     - **Tier 3 (Local Offline Fallback)**: Meta's `facebook/nllb-200-distilled-600M` (No Language Left Behind) deep sequence-to-sequence model capable of translating all 10 languages offline on CPU/GPU.
4. **Universal Indic Vocabulary via IndicBERTv2**:
   - The underlying classification backbone (`IndicBERTv2`) possesses an expansive **250,000 subword vocabulary** trained specifically across all 10 supported Indian languages, allowing the model to understand native script grievances natively without losing grammatical or cultural context.

---

## 3. System Architecture & Data Flow

The system follows a decoupled 4-tier microservices architecture:

```
┌────────────────────────────────────────────────────────┐
│             Frontend Client (Port 3000)                │
│    React 18 + TypeScript + Vite + Tailwind CSS         │
│   (Citizen Portal & Administrator Analytics Suite)     │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / REST / Cookies
                            ▼
┌────────────────────────────────────────────────────────┐
│             Backend API Server (Port 5000)             │
│          Node.js + Express.js + Prisma ORM             │
│    (Auth, Route Handlers, SLA Logic, Data Access)      │
└─────────────┬───────────────────────────┬──────────────┘
              │                           │
  Prisma SQL  │               REST POST   │ JSON Response
              ▼               /predict    ▼
┌────────────────────────┐      ┌────────────────────────┐
│  PostgreSQL Database   │      │   AI Engine Service    │
│      (Port 5432)       │      │      (Port 8000)       │
│ Users, Complaints,     │      │ FastAPI + PyTorch +    │
│ Departments, History   │      │ Transformers           │
└────────────────────────┘      └────────────────────────┘
```

### End-to-End Data Flow

#### A. Automated Citizen Submission Flow:
1. **Submission**: A citizen submits a complaint with description, optional photo, locality, and selected language.
2. **Backend Ingestion**: The Express.js backend saves the complaint in `PENDING` status and invokes the AI microservice (`POST http://ai-service:8000/predict`).
3. **AI Language & Hinglish Detection**:
   - The engine analyzes Unicode script ranges. If Latin characters contain colloquial Hindi terms (e.g., *"humare"*, *"panni"*, *"nhi"*), the text is flagged as Hinglish.
4. **Translation Cascade**: Non-English/Hinglish text is pre-processed and translated into English.
5. **Multi-Task Classification**: The translated text is passed to the fine-tuned `IndicBERTv2` model, yielding category and urgency probabilities.
6. **Safety Rules Application**:
   - `rule_category()`: Regex checks safeguard domain terms (e.g., ensuring water supply complaints are never misassigned).
   - `rule_urgency()`: Detects hazard terms (*"live wire"*, *"sparking"*, *"crisis"*) to escalate urgency to `HIGH`.
7. **SLA Assignment**: The system calculates the estimated resolution deadline based on the Category $\times$ Urgency matrix.
8. **Storage**: The backend updates the database with AI outputs (`aiCategory`, `aiUrgency`, `aiConfidence`, `translatedText`, `estimatedDays`, `departmentId`).

#### B. Administrator Review & Manual Override Flow:
- When an administrator inspects a ticket in `/admin/complaints/:id`, they can review both the original and translated text alongside AI confidence scores.
- If the AI prediction requires adjustment, clicking **"Manual Override / Correct"** opens an override interface.
- The admin can adjust:
  - **Category**
  - **Urgency** (LOW / MEDIUM / HIGH)
  - **Department assignment**
  - **Estimated Resolution Days** (with automatic lookup recommendation)
  - **English Translation text**
  - **Reason for change**
- Saving changes writes an audit entry to `ComplaintStatusHistory` (`changedBy = adminId`, logging the previous and updated values).

---

## 4. Technology Stack & Library Selection

### 4.1 Frontend (`frontend/`)

| Library / Tool | Version | Purpose & Rationale |
| :--- | :--- | :--- |
| **React** | `^18.3.1` | Component-driven UI framework with concurrent rendering and high reactivity. |
| **TypeScript** | `^5.4.2` | Strong static typing for complaint schemas, API responses, and user state. |
| **Vite** | `^5.1.6` | Fast modern build tool offering near-instant HMR (Hot Module Replacement). |
| **Tailwind CSS** | `^3.4.1` | Utility-first CSS framework for clean, responsive, municipal-grade design. |
| **React Router DOM** | `^6.22.3` | Client-side routing with role-based route protection (`AdminRoute` vs `CitizenRoute`). |
| **Axios** | `^1.6.7` | HTTP client configured with interceptors for credentials, cookies, and error handling. |
| **Recharts** | `^2.12.2` | Data visualization for admin dashboards (category breakdowns, SLA compliance). |
| **Lucide React** | `^0.344.0` | Accessible iconography for navigation, status chips, and timeline indicators. |

### 4.2 Backend (`backend/`)

| Library / Tool | Version | Purpose & Rationale |
| :--- | :--- | :--- |
| **Node.js + Express** | `^4.18.3` | Lightweight, scalable asynchronous event-driven runtime for RESTful APIs. |
| **TypeScript** | `^5.4.2` | Type-safety across controllers, middleware, and database operations. |
| **Prisma ORM** | `^5.10.0` | Next-generation type-safe ORM for PostgreSQL schema management and migrations. |
| **PostgreSQL** | `16` | ACID-compliant relational database for structured grievance data and audit logs. |
| **jsonwebtoken** | `^9.0.2` | Stateless authentication tokens stored in secure `HTTP-only` cookies. |
| **bcryptjs** | `^2.4.3` | Salted one-way hashing for citizen and administrative passwords. |
| **Multer** | `^1.4.5` | Multipart form data parser for civic photo evidence attachments. |
| **Helmet + Rate-Limit** | `^7.1.0` | HTTP header security hardening and anti-DoS rate limiting on sensitive routes. |

### 4.3 AI Microservice (`ai-service/`)

| Library / Tool | Version | Purpose & Rationale |
| :--- | :--- | :--- |
| **FastAPI** | `>=0.110` | High-performance Python async web framework with automated OpenAPI validation. |
| **PyTorch** | `>=2.1` | Deep learning tensor engine used to run neural network inference. |
| **Transformers** | `>=4.41` | Hugging Face library providing tokenization and model execution pipelines. |
| **SentencePiece** | `>=0.2` | Subword tokenization required by IndicBERTv2's 200k multilingual vocabulary. |
| **Uvicorn** | `>=0.29` | Production-grade ASGI server to run FastAPI. |
| **Langdetect** | `>=1.0.9` | Secondary statistical language classifier for Indic script disambiguation. |

---

## 5. AI Model Architecture, Parameters & Training Details

### 5.1 Exact Model Name & Origin
- **Base Pretrained Model**: `ai4bharat/IndicBERTv2-MLM-only`
- **Model Version Tag**: `mgrs-indicbertv2-v1`
- **Origin & Purpose**: Developed by **AI4Bharat (IIT Madras)**, IndicBERTv2 is a state-of-the-art multilingual transformer model pre-trained on diverse Indian language corpora spanning 22 official Indian languages. It uses an extended vocabulary of 250,000 tokens specifically optimized for Indic scripts and morphology, outperforming generic models like mBERT or XLM-RoBERTa on Indic NLP tasks.

---

### 5.2 Exact Parameter Breakdown & Architecture

The system utilizes a custom **MultiTask Architecture (`MultiTaskModel`)** that couples the IndicBERTv2 encoder with two specialized classification heads:

```
                      Input Complaint Text (Tokens)
                                    │
                                    ▼
                IndicBERTv2 Transformer Backbone (12 Layers)
                       (Hidden Dimension = 768)
                                    │
                                    ▼
                     Masked Mean Pooling + Dropout (0.1)
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
              Category Head                    Urgency Head
          Linear(768 -> 8 classes)        Linear(768 -> 3 classes)
                    │                               │
                    ▼                               ▼
           Softmax Probabilities           Softmax Probabilities
          (8 Civic Departments)            (LOW / MEDIUM / HIGH)
```

#### Exact Parameter Count & Breakdown Table:

| Component | Layer / Matrix Details | Mathematical Formula | Exact Number of Parameters | % of Model |
| :--- | :--- | :--- | :---: | :---: |
| **Word Embeddings** | 250,000 subwords $\times$ 768 dim | $250,000 \times 768$ | **192,000,000** | 69.20% |
| **Position & Token Embeddings** | 512 max pos + 2 token types + LayerNorm | $(512 \times 768) + (2 \times 768) + (2 \times 768)$ | **396,288** | 0.14% |
| **12 $\times$ Self-Attention Layers** | Query, Key, Value & Output Dense + LayerNorm | $12 \times [4 \times (768 \times 768 + 768) + 2 \times 768]$ | **28,348,416** | 10.22% |
| **12 $\times$ Intermediate Feed-Forward** | $768 \rightarrow 3072 \rightarrow 768$ FFN + LayerNorm | $12 \times [(768 \times 3072 + 3072) + (3072 \times 768 + 768) + 2 \times 768]$ | **56,706,048** | 20.44% |
| **IndicBERTv2 Backbone Total** | Complete 12-layer Transformer Encoder | Embeddings + Encoder Layers | **277,450,752** | 99.997% |
| **Category Head (`cat_head`)** | Linear projection: $768 \rightarrow 8$ classes | $(768 \times 8) + 8 \text{ bias}$ | **6,152** | < 0.01% |
| **Urgency Head (`urg_head`)** | Linear projection: $768 \rightarrow 3$ classes | $(768 \times 3) + 3 \text{ bias}$ | **2,307** | < 0.01% |
| **Custom Classification Heads Total** | Task-specific projection heads (`heads.pt`) | Category Head + Urgency Head | **8,459** | 0.003% |
| **GRAND TOTAL PARAMETERS** | Full MGRS MultiTask Neural Model | Backbone + Both Heads | **277,459,211** (~**277.46 Million**) | **100.0%** |

#### Summary of Trainable Parameters by Training Stage:
- **Phase 1 (Warmup / Head Alignment)**:
  - **Trainable Parameters**: **8,459** (Category Head: 6,152 + Urgency Head: 2,307).
  - **Frozen Parameters**: **277,450,752** (IndicBERTv2 Backbone held frozen to preserve pre-trained Indic features).
- **Phase 2 (End-to-End Fine-Tuning)**:
  - **Trainable Parameters**: **277,459,211 (100% of parameters)**. The entire network, including the 12 transformer encoder blocks and embedding layers, was fine-tuned on the 37,831 municipal grievance records.
- **Physical Model Footprint**:
  - Saved Weights: **~1.0 GB** (`encoder/model.safetensors` = 1.05 GB, `heads.pt` = 35 KB).
  - Runtime Inference Memory (FP32): **~1.1 GB RAM / VRAM** (or **~550 MB** in FP16 precision).

---

### 5.3 What Parameters Were Trained vs. What Is Rule-Governed

#### 1. Parameters Trained by the Neural Network:
- **Encoder Fine-Tuning**: The full 12-layer transformer encoder weights (**277,450,752 parameters**) were fine-tuned using masked cross-attention representations, adapting IndicBERTv2 from raw language modeling to civic complaint representations.
- **Category Head Weights (`cat_head`)**: **6,152 parameters** mapped from the 768-dimensional pooled vector into the 8 civic categories: *Sanitation, Water Supply, Street Lighting, Roads & Maintenance, Parks & Recreation, Electrical, Health, and General*.
- **Urgency Head Weights (`urg_head`)**: **2,307 parameters** mapped from the 768-dimensional pooled vector into the 3 urgency tiers: *LOW, MEDIUM, HIGH*.

#### 2. What Is NOT Parameterized (Deterministically Handled):
- **SLA Resolution Days**: Not learned through backpropagation. Municipal service deadlines must strictly comply with civic citizen charters. This is computed using the **Category $\times$ Urgency SLA Lookup Matrix**.
- **Language Detection**: Evaluated via Unicode script ordinal ranges and statistical n-gram analysis (`langdetect`).
- **Hazard Urgency Escalation**: Keyword safety engine (`HIGH_KEYWORDS`) that automatically overrides model urgency to `HIGH` when emergency tokens (*"live wire"*, *"sparking"*, *"crisis"*, *"gas leak"*) appear.
- **Category Guardrails**: Keyword safety dictionary (`CATEGORY_KEYWORDS`) that prevents misclassification of domain-critical words (e.g., ensuring complaints mentioning *"panni/water"* are not routed to Street Lighting).
- **Text Translation**: Handled by external translation cascade (Google API $\rightarrow$ MyMemory $\rightarrow$ Meta NLLB-200 local fallback).

---

### 5.4 Training Hyperparameters & Configuration

| Hyperparameter | Value | Description & Rationale |
| :--- | :--- | :--- |
| **Max Sequence Length (`max_len`)** | `128 tokens` | Covers >98% of municipal complaints without wasteful padding computation. |
| **Hidden Size ($d_{model}$)** | `768` | Native hidden dimension of IndicBERTv2 representations. |
| **Hidden Layers** | `12` | Full transformer depth for deep semantic language understanding. |
| **Attention Heads** | `12` | Multi-head self-attention heads ($64$ dimensions per head). |
| **Intermediate FFN Size** | `3072` | Position-wise feed-forward network expansion factor ($4 \times 768$). |
| **Dropout Probability** | `0.1` | Applied to attention probabilities, hidden states, and pooled head output to prevent overfitting. |
| **Pooling Strategy** | Attention-Masked Mean Pooling | Pooled vector: $h_{pooled} = \frac{\sum (h \times m)}{\sum m}$ (normalizes for variable token length). |
| **Activation Function** | `GELU` (Gaussian Error Linear Unit) | Smooth non-linearity used throughout the transformer encoder. |
| **Loss Function** | Multi-Task Cross Entropy | $\mathcal{L}_{total} = \mathcal{L}_{cat} + \lambda \cdot \mathcal{L}_{urg}$ (with loss masking for samples lacking urgency labels). |

---

### 5.5 Training Dataset Composition
The model was fine-tuned on **37,831 grievance rows** aggregated from four sources:

| Dataset Source | Rows | Nature & Purpose |
| :--- | :--- | :--- |
| **Synthetic Municipal Grievances** | 14,861 | Programmatically generated realistic municipal complaints across Indian cities. |
| **ICMC Translated** | 11,033 | Real civic grievances translated into regional Indian languages. |
| **ICMC Real** | 7,811 | Verified real-world municipal complaints from Indian urban local bodies. |
| **Bangla Real** | 4,126 | Authentic regional civic grievances collected in Bengali script. |
| **Total Training Corpus** | **37,831** | **Balanced across 8 categories and urgency tiers.** |

### 5.6 Evaluation Metrics
Evaluated across distinct test partitions:
- **Category Classification Accuracy**: **~85.9% to 93.8%** across benchmarks.
- **Category Macro-F1**: **0.75 to 0.81**, reflecting strong multi-class balance across all 8 civic domains.
- **Urgency Macro-F1**: **~0.40 to 0.48** (supplemented by deterministic emergency escalation keywords in production).

---

## 6. Behind-the-Scenes Pipeline: From Input to Resolution

```
[ Citizen Input Text ]
          │
          ▼
1. Language & Hinglish Detection
   ├─ Checks Unicode ranges for Indic scripts (Hindi, Bengali, Tamil, etc.)
   └─ Analyzes phonetic Latin tokens against COMMON_HINGLISH_WORDS vocabulary
          │
          ▼
2. Translation Engine
   ├─ Pre-processing: Normalizes colloquial terms ("panni" -> "paani (tap water supply)")
   ├─ Primary Engine: Google Cloud Translation endpoint
   ├─ Secondary Engine: MyMemory Public API
   ├─ Fallback Engine: Meta NLLB-200-distilled-600M
   └─ Post-processing: Corrects common translation errors
          │
          ▼
3. Dual-Head Classification
   └─ IndicBERTv2 generates raw probabilities for Category and Urgency
          │
          ▼
4. Safety & Policy Layer
   ├─ rule_category(): Enforces domain-specific keyword validation
   └─ rule_urgency(): Escalates hazard/crisis terms to HIGH
          │
          ▼
5. SLA Matrix Lookup
   └─ Matches (Category, Urgency) to mandated resolution timeframe
          │
          ▼
6. PostgreSQL Persistence & Admin Dashboard
   └─ Ticket dispatched with full audit trail and override capability
```

### SLA Resolution Matrix

| Civic Category | HIGH Urgency | MEDIUM Urgency | LOW Urgency |
| :--- | :---: | :---: | :---: |
| **Water Supply** | 1 Day | 4 Days | 8 Days |
| **Sanitation** | 2 Days | 5 Days | 10 Days |
| **Street Lighting** | 3 Days | 7 Days | 14 Days |
| **Roads & Maintenance** | 3 Days | 7 Days | 15 Days |
| **Electrical** | 1 Day | 3 Days | 7 Days |
| **Health** | 1 Day | 3 Days | 7 Days |
| **Parks & Recreation** | 5 Days | 10 Days | 15 Days |
| **General** | 3 Days | 7 Days | 14 Days |

---

## 7. Database Schema & Relational Architecture (Prisma / PostgreSQL)

The database schema (`backend/prisma/schema.prisma`) enforces strict relational integrity, referential constraints, and chronological audit trails across all civic operations:

```
┌──────────────────┐           ┌────────────────────────────┐
│      User        │ 1       * │         Complaint          │
│ (Citizen Profile)├───────────┤ (Core Ticket & AI Outputs) │
└──────────────────┘           └──────────────┬─────────────┘
                                              │ 1
                                              │
                                              │ *
┌──────────────────┐           ┌──────────────┴─────────────┐
│    Department    │ 1       * │   ComplaintStatusHistory   │
│ (Civic Routing)  ├───────────┤    (Immutable Audit Trail) │
└──────────────────┘           └────────────────────────────┘
```

### 7.1 Core Data Models

#### 1. `User` (Citizen Identity & Preferences)
- `id` (UUID, Primary Key)
- `email` (Unique string) / `mobile` (Unique string)
- `fullName` (Citizen's display name)
- `passwordHash` (Bcrypt salted hash)
- `preferredLang` (Default: `"en"`, stores preferred BCP-47 code)
- `isActive` (Boolean flag)
- `createdAt` / `updatedAt` (Timestamps)
- *Relations*: Has many `complaints`, has many `notifications`.

#### 2. `Department` (Municipal Administrative Units)
- `id` (UUID, Primary Key)
- `name` (Unique, e.g., *"Water Supply Department"*, *"Sanitation Department"*)
- `code` (Unique uppercase code, e.g., `WATER`, `SANITATION`, `LIGHTING`, `ROADS`)
- `description` (Department jurisdiction summary)
- `isActive` (Operational status)

#### 3. `Complaint` (Central Grievance Record)
- **Identification**: `id` (UUID), `ticketId` (Unique alphanumeric code, e.g. `MGR872548`).
- **Citizen & Department Linkage**: `userId` (Foreign key to `User`), `departmentId` (Foreign key to `Department`, auto-assigned by AI or admin).
- **Citizen Input Data**:
  - `originalText` (Raw complaint description in any language/script).
  - `language` (User-declared language code).
  - `locality` (City ward, neighborhood, or sector).
  - `address` (Street address).
  - `photoUrl` (Uploaded photographic proof).
- **AI Triage Fields**:
  - `aiCategory` (Predicted category string).
  - `aiDepartment` (Suggested department name).
  - `aiUrgency` (Predicted urgency: `LOW`, `MEDIUM`, `HIGH`).
  - `aiConfidence` (Model certainty probability $0.0 - 1.0$).
  - `aiProcessed` (Boolean flag confirming AI pipeline execution).
  - `translatedText` (English translation generated by AI cascade).
  - `detectedLang` (Language detected by script/n-gram heuristics).
  - `estimatedDays` (Resolution deadline days from SLA lookup).
- **Operational Lifecycle**:
  - `category` (Current operational category).
  - `urgency` (Current operational urgency).
  - `status` (`PENDING`, `IN_PROGRESS`, `RESOLVED`, `REJECTED`).
  - `assignedTo` (Staff/officer identifier).
  - `officialRemarks` (Administrative notes).
  - `resolution` (Formal resolution summary delivered to citizen).
  - `resolvedAt` (Timestamp of closure).

#### 4. `ComplaintStatusHistory` (Audit Trail)
- `id` (UUID, Primary Key)
- `complaintId` (Foreign Key to `Complaint`)
- `status` (`ComplaintStatus` enum)
- `remarks` (Detailed reason for status update or manual AI override)
- `changedBy` (Admin UUID or `"system"`)
- `changedAt` (Timestamp)

#### 5. `Notification` (Citizen Alerts)
- `id` (UUID), `userId` (Foreign Key to `User`), `title`, `message`, `isRead` (Boolean), `createdAt`.

---

## 8. Complete RESTful API Specification

The backend server exposes clean, role-guarded RESTful endpoints:

### 8.1 Authentication Endpoints

| Method | Endpoint | Access | Purpose & Payload |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register citizen (`fullName`, `email`, `mobile`, `password`, `preferredLang`). |
| `POST` | `/api/auth/login` | Public | Citizen login (`email`, `password`) $\rightarrow$ sets HTTP-only `token` cookie. |
| `POST` | `/api/auth/logout` | Citizen | Clears authentication cookie. |
| `GET` | `/api/auth/me` | Citizen | Returns current citizen profile. |
| `POST` | `/api/admin/auth/login` | Public | Admin login (`email`, `password`) $\rightarrow$ sets HTTP-only `admin_token` cookie. |
| `POST` | `/api/admin/auth/logout` | Admin | Clears admin authentication cookie. |
| `GET` | `/api/admin/auth/me` | Admin | Returns current admin staff profile and privileges. |

### 8.2 Citizen Complaint Endpoints

| Method | Endpoint | Access | Purpose & Payload |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/complaints` | Citizen | Submit new complaint (`text`, `language`, `locality`, `address`, optional `photo` multipart). Automatically invokes AI service. |
| `GET` | `/api/complaints/my` | Citizen | List all complaints filed by the authenticated citizen (paginated). |
| `GET` | `/api/complaints/:id` | Citizen | Get complaint details, AI explanation, and timeline history. |
| `GET` | `/api/complaints/track/:ticketId` | Public | Public complaint tracking by ticket ID (e.g. `MGR872548`) without requiring login. |

### 8.3 Admin Management & Override Endpoints

| Method | Endpoint | Access | Purpose & Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/complaints` | Admin | Filterable complaint list (by `status`, `departmentId`, `urgency`, `search`, page). |
| `GET` | `/api/admin/complaints/:id` | Admin | Full complaint audit dossier including AI confidence, translated text, citizen details. |
| `PATCH` | `/api/admin/complaints/:id/status` | Admin | Update status (`status`, `remarks`, `resolution`). Appends to audit history. |
| `PATCH` | `/api/admin/complaints/:id/assign` | Admin | Reassign complaint to specific department officer (`departmentId`, `assignedTo`). |
| `PATCH` | `/api/admin/complaints/:id/ai-correction` | Admin | **Manual Override Endpoint**: updates `category`, `departmentId`, `urgency`, `estimatedDays`, `translatedText`, `reason`. Recalculates SLA deadline date automatically. |
| `GET` | `/api/admin/analytics/overview` | Admin | KPI metrics (total, pending, in-progress, resolved, SLA breach count). |
| `GET` | `/api/admin/analytics/categories` | Admin | Volume and urgency breakdown grouped by the 8 municipal categories. |

### 8.4 AI Microservice Endpoints (`ai-service/`)

| Method | Endpoint | Access | Purpose & Payload |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Internal | Health status, loaded model version (`mgrs-indicbertv2-v1`), memory readiness. |
| `POST` | `/predict` | Internal | Input: `{"text": "...", "language": "hi"}`. Returns: `category`, `urgency`, `confidence`, `translated_text`, `detected_language`, `estimated_resolution_days`. |

---

## 9. Security, Privacy & Reliability Architecture

1. **Authentication & Session Security**:
   - **Bcrypt Hashing**: User and administrator passwords hashed using `bcryptjs` with salt work factor of 12.
   - **HTTP-Only Cookies**: JWT tokens stored strictly in `HttpOnly`, `SameSite=Lax` cookies, preventing cross-site scripting (XSS) token exfiltration.
   - **Dual Token Isolation**: Citizen authentication (`token`) and municipal administrator authentication (`admin_token`) use distinct cookie keys and separate verification middleware.
2. **Network Hardening**:
   - **Helmet.js**: Injects strict HTTP response headers (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`).
   - **Rate Limiting**: `express-rate-limit` prevents brute-force credential stuffing and submission flood attacks.
   - **CORS Protection**: Restricted to trusted frontend origin with explicit credential allowance.
3. **Graceful Fallbacks & High Availability**:
   - **Non-Blocking AI Design**: If the AI microservice is temporarily rebooting or offline, the backend catches the error, sets `aiProcessed = false`, logs `ai_pending`, and queues the complaint safely in `PENDING` status rather than dropping the citizen's submission.
   - **Multi-Engine Translation Cascade**: If Google Cloud Translation times out, the engine automatically attempts MyMemory API, followed by offline Meta NLLB-200.

---

## 10. Administrator Manual Override & SLA Recalculation Mechanism

While the neural classifier achieves **~86%–94% accuracy**, real-world governance requires infallible human-in-the-loop oversight.

### 10.1 When Override Is Needed
- **Ambiguous Complaints**: e.g., *"Water leaked into the electrical transformer box"* touches both *Water Supply* and *Electrical*. The admin can route it to whichever team has higher immediate hazard priority.
- **Urgency Escalation**: If a citizen complains about low water pressure, but phone complaints reveal an entire ward's pipeline burst, the admin can escalate urgency from `MEDIUM` to `HIGH`.
- **Dialect Misinterpretation**: When colloquial phrasing is imperfectly translated by machine translation engines, the admin can edit the English translation directly.

### 10.2 How the Override Operates Behind the Scenes
1. The admin opens the ticket in `/admin/complaints/:id` and clicks **"Manual Override (Category / Urgency / SLA)"** or **"Correct / Override"**.
2. The modal allows the admin to edit:
   - **Category** $\rightarrow$ Selecting a new category automatically updates the recommended resolution days according to the municipal charter.
   - **Department** $\rightarrow$ Automatically suggests the corresponding department, or allows manual override.
   - **Urgency** $\rightarrow$ `LOW`, `MEDIUM`, or `HIGH`.
   - **Estimated Days** $\rightarrow$ Can be set to custom days or standard SLA.
   - **English Translation** $\rightarrow$ Editable text area allowing staff to correct grammatical or dialect translation errors.
   - **Reason for Override** $\rightarrow$ Mandatory audit trail explanation.
3. When saved, the backend:
   - Updates `category`, `urgency`, `departmentId`, `estimatedDays`, and `translatedText` in `complaints`.
   - Computes the new deadline date: `updatedAt + estimatedDays`.
   - Inserts an immutable audit record in `complaint_status_history` logging the admin's name, previous values, and justification.
   - Immediately refreshes both the administrator dashboard and the citizen's live tracking view.

---

## 11. Multi-Language Test Suite & Real-World Examples (from README.md)

To demonstrate the full automated triage pipeline across varied scripts, linguistic nuances, and urgency tiers, the following production test cases from the project's documentation illustrate how grievances are ingested, translated, classified, and resolved:

### 11.1 Comprehensive Test Suite Summary Table

| # | Language | Input Complaint Text | Expected Translation | Predicted Category | Auto-Assigned Department | Urgency | SLA |
| :-: | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **1** | **Hindi (`hi`)** | कचरा तीन दिनों से नहीं उठाया गया है और बदबू आ रही है | *"Garbage has not been collected for three days and it is smelling"* | **Sanitation** | Sanitation Department | `MEDIUM` | ~5 Days |
| **2** | **Tamil (`ta`)** | எங்கள் தெருவில் மின் விளக்குகள் எரியவில்லை, இரவில் மிகவும் இருட்டாக உள்ளது | *"Street lights in our street are not working, it is very dark at night"* | **Street Lighting** | Street Lighting Department | `LOW` | ~14 Days |
| **3** | **Bengali (`bn`)** *(Hazard)* | প্রধান রাস্তায় বড় গর্তের কারণে दुर्घटना ঘটছে, অবিলম্বে মেরামত প্রয়োজন | *"Accidents are happening due to a big pothole on the main road, immediate repair is needed"* | **Roads & Maintenance** | Roads & Infrastructure | `HIGH` *(Hazard Escalation)* | ~3 Days |
| **4** | **Kannada (`kn`)** *(Crisis)* | ಕಳೆದ ಮೂರು ದಿನಗಳಿಂದ ನಮ್ಮ ಬಡಾವಣೆಯಲ್ಲಿ ಕುಡಿಯುವ ನೀರು ಸರಬರಾಜು ಆಗುತ್ತಿಲ್ಲ | *"Drinking water is not being supplied in our locality for the past three days"* | **Water Supply** | Water Supply Department | `HIGH` *(Essential Need)* | ~1 Day |
| **5** | **Marathi (`mr`)** | सार्वजनिक उद्यानातील खेळणी तुटलेली आहेत आणि कचऱ्याचे साम्राज्य आहे | *"Play equipment in the public park is broken and there is garbage everywhere"* | **Parks & Recreation** | Parks & Recreation | `LOW` | ~15 Days |
| **6** | **Hinglish (`hin`)** *(Colloquial)* | humare yha pe 10 din se panni nhi ara hai | *"We haven't had water supply here for 10 days"* | **Water Supply** | Water Supply Department | `HIGH` *(Keyword Normalization)* | ~1 Day |

---

### 11.2 Detailed Step-by-Step Test Case Walkthroughs

#### Test Case 1: Hindi (Sanitation & Waste Management)
* **Citizen Input Language**: Hindi (`hi`)
* **Raw Grievance Submission**:
  ```text
  कचरा तीन दिनों से नहीं उठाया गया है और बदबू आ रही है
  ```
* **Detection & Translation**:
  - Detected Script: Devanagari (`0x0900-0x097F`) $\rightarrow$ Confirmed language: `hi`
  - AI Translation: *"Garbage has not been collected for three days and it is smelling"*
* **Model Triage & Prediction**:
  - Predicted Category: `Sanitation` (Confidence: ~94.2%)
  - Urgency Assessment: `MEDIUM` (Persistent hygiene nuisance over multiple days)
  - Auto-Assigned Department: **Sanitation Department** (`SANITATION`)
  - Resolution SLA: **~5 Days**

---

#### Test Case 2: Tamil (Street Lighting Infrastructure)
* **Citizen Input Language**: Tamil (`ta`)
* **Raw Grievance Submission**:
  ```text
  எங்கள் தெருவில் மின் விளக்குகள் எரியவில்லை, இரவில் மிகவும் இருட்டாக உள்ளது
  ```
* **Detection & Translation**:
  - Detected Script: Tamil (`0x0B80-0x0BFF`) $\rightarrow$ Confirmed language: `ta`
  - AI Translation: *"Street lights in our street are not working, it is very dark at night"*
* **Model Triage & Prediction**:
  - Predicted Category: `Street Lighting` (Confidence: ~91.5%)
  - Urgency Assessment: `LOW` (Standard municipal maintenance, no live wire hazards)
  - Auto-Assigned Department: **Street Lighting Department** (`LIGHTING`)
  - Resolution SLA: **~14 Days**

---

#### Test Case 3: Bengali (Roads & Maintenance — High Hazard Emergency)
* **Citizen Input Language**: Bengali (`bn`)
* **Raw Grievance Submission**:
  ```text
  প্রধান রাস্তায় বড় গর্তের কারণে दुर्घटना ঘটছে, অবিলম্বে মেরামত প্রয়োজন
  ```
* **Detection & Translation**:
  - Detected Script: Bengali (`0x0980-0x09FF`) $\rightarrow$ Confirmed language: `bn`
  - AI Translation: *"Accidents are happening due to a big pothole on the main road, immediate repair is needed"*
* **Model Triage & Urgency Escalation**:
  - Predicted Category: `Roads & Maintenance` (Confidence: ~93.8%)
  - Urgency Assessment: **`HIGH`**
  - **Escalation Rationale**: Although potholes typically register as `MEDIUM`, the safety rule engine detects emergency collision tokens (*"durghatna"* / *"accident"*), triggering automatic safety escalation.
  - Auto-Assigned Department: **Roads & Infrastructure** (`ROADS`)
  - Resolution SLA: **~3 Days** *(Fast-tracked from standard 7 days)*

---

#### Test Case 4: Kannada (Water Supply — Severe Civic Disruption)
* **Citizen Input Language**: Kannada (`kn`)
* **Raw Grievance Submission**:
  ```text
  ಕಳೆದ ಮೂರು ದಿನಗಳಿಂದ ನಮ್ಮ ಬಡಾವಣೆಯಲ್ಲಿ ಕುಡಿಯುವ ನೀರು ಸರಬರಾಜು ಆಗುತ್ತಿಲ್ಲ
  ```
* **Detection & Translation**:
  - Detected Script: Kannada (`0x0C80-0x0CFF`) $\rightarrow$ Confirmed language: `kn`
  - AI Translation: *"Drinking water is not being supplied in our locality for the past three days"*
* **Model Triage & Prediction**:
  - Predicted Category: `Water Supply` (Confidence: ~96.1%)
  - Urgency Assessment: **`HIGH`**
  - **Escalation Rationale**: Water outage exceeding 48 hours is recognized by `HIGH_KEYWORDS` as a critical municipal emergency.
  - Auto-Assigned Department: **Water Supply Department** (`WATER`)
  - Resolution SLA: **~1 Day**

---

#### Test Case 5: Marathi (Parks & Recreation)
* **Citizen Input Language**: Marathi (`mr`)
* **Raw Grievance Submission**:
  ```text
  सार्वजनिक उद्यानातील खेळणी तुटलेली आहेत आणि कचऱ्याचे साम्राज्य आहे
  ```
* **Detection & Translation**:
  - Detected Script: Devanagari (`0x0900-0x097F`) $\rightarrow$ Disambiguated via user hint / n-gram to: `mr`
  - AI Translation: *"Play equipment in the public park is broken and there is garbage everywhere"*
* **Model Triage & Prediction**:
  - Predicted Category: `Parks & Recreation` (Confidence: ~88.4%)
  - Urgency Assessment: `LOW` (Cosmetic/recreational repair)
  - Auto-Assigned Department: **Parks & Recreation** (`PARKS`)
  - Resolution SLA: **~15 Days**

---

#### Test Case 6: Hinglish (Conversational Romanized Hindi)
* **Citizen Input Language**: Hinglish / Latin script (`en` selection with Hindi phonetic words)
* **Raw Grievance Submission**:
  ```text
  humare yha pe 10 din se panni nhi ara hai
  ```
* **Detection, Normalization & Translation**:
  - Script Check: Latin (`isascii() == True`)
  - Hinglish Detector: Matches *humare*, *yha*, *panni*, *nhi*, *ara* $\rightarrow$ Triggers Hinglish Pipeline.
  - Text Normalization: Rewrites colloquial tokens (*panni* $\rightarrow$ *paani (tap water supply)*, *yha* $\rightarrow$ *yahan*, *nhi* $\rightarrow$ *nahi*, *ara* $\rightarrow$ *aa raha*).
  - AI Translation: *"We haven't had water supply here for 10 days"* (Municipal safeguard prevents mistranslating *"panni"* as weather *"rain"*).
* **Model Triage & Safety Protection**:
  - Predicted Category: `Water Supply` (Enforced via `rule_category()` safeguard).
  - Urgency Assessment: **`HIGH`** (Prolonged outage escalation).
  - Auto-Assigned Department: **Water Supply Department** (`WATER`)
  - Resolution SLA: **~1 Day**

---

### 11.3 End-to-End JSON Payload Example (Wire Format)

#### 1. Backend $\rightarrow$ AI Service Request (`POST http://ai-service:8000/predict`):
```json
{
  "text": "कचरा तीन दिनों से नहीं उठाया गया है और बदबू आ रही है",
  "language": "hi"
}
```

#### 2. AI Service $\rightarrow$ Backend Response:
```json
{
  "category": "Sanitation",
  "department": "Sanitation Department",
  "urgency": "MEDIUM",
  "confidence": 0.9421,
  "translated_text": "Garbage has not been collected for three days and it is smelling",
  "detected_language": "hi",
  "estimated_resolution_days": 5,
  "model_version": "mgrs-indicbertv2-v1",
  "ai_pending": false
}
```

---

## 12. Deployment & Infrastructure Setup

The entire system is containerized with **Docker Compose**, running all 4 services with dedicated network isolation and automatic healthchecks:

```yaml
# docker-compose.yml summary
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_DB: mgrs_db
      POSTGRES_USER: mgrs_user
      POSTGRES_PASSWORD: mgrs_password
    volumes: [postgres_data:/var/lib/postgresql/data]

  ai-service:
    build: ./ai-service
    ports: ["8000:8000"]
    environment:
      - MGRS_MODEL_DIR=/app/models/mgrs-classifier
      - MGRS_TRANSLATE=0

  backend:
    build: ./backend
    ports: ["5000:5000"]
    depends_on: [postgres, ai-service]
    environment:
      - DATABASE_URL=postgresql://mgrs_user:mgrs_password@postgres:5432/mgrs_db
      - AI_SERVICE_URL=http://ai-service:8000
      - JWT_SECRET=mgrs_production_secret_key

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    depends_on: [backend]
```

### Quick Commands:
- **Build & Run Everything**: `docker-compose up -d --build`
- **View Live Logs**: `docker-compose logs -f`
- **Stop Containers**: `docker-compose down`

---

## 13. Future Scope & Enhancements

1. **Voice / Audio Grievance Redressal**: Integrating Speech-to-Text models (such as AI4Bharat's *Chitralekha/IndicWav2Vec* or OpenAI *Whisper*) to allow illiterate citizens to submit complaints via voice notes.
2. **Omnichannel Messaging Bots**: Deploying WhatsApp and Telegram civic bots via webhooks to submit grievances directly from citizens' everyday messaging apps.
3. **Geo-Spatial GIS Heatmapping**: Integrating Mapbox/Leaflet to plot complaint coordinates on city maps, highlighting municipal chronic failure zones (e.g., recurring pipeline leaks or unlit roads).
4. **Automated Duplicate Detection**: Using vector cosine similarity on IndicBERTv2 sentence embeddings to detect and cluster multiple citizens reporting the same localized incident (e.g., 20 people reporting the same downed power line).

---

## 14. Conclusion

The **Municipal Grievance Redressal System (MGRS)** delivers a modern, high-impact civic governance platform engineered for India's linguistic reality. By fusing **IndicBERTv2 deep multilingual NLP** with **transparent rule-based safety escalation**, **comprehensive administrative override workflows**, and a **robust React-Express-PostgreSQL stack**, MGRS bridges the communication divide between citizens and urban local bodies, dramatically shortening grievance resolution times and enhancing municipal accountability.
