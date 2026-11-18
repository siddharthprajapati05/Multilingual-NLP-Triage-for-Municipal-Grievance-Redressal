# Municipal Grievance Redressal System (MGRS)

**Multilingual NLP Triage for Municipal Grievance Redressal**

A full-stack municipal grievance redressal web application powered by an integrated multilingual NLP pipeline (**IndicBERTv2**). Citizens can file complaints in any Indian language; the AI model automatically detects the language, translates it to English, categorizes the grievance, predicts urgency, assigns the responsible city department, and calculates estimated resolution deadlines.

---

## 🏛️ System Architecture

```
┌────────────────────────────────┐
│        Citizen & Admin         │
│     React 18 + TS + Tailwind   │
│           (Port 3000)          │
└───────────────┬────────────────┘
                │ HTTP / REST
                ▼
┌────────────────────────────────┐      HTTP       ┌────────────────────────────────┐
│      Backend API Server        │───────────────▶ │       AI Triage Service        │
│   Node.js + Express + Prisma   │                 │     FastAPI + IndicBERTv2      │
│           (Port 5000)          │◀─────────────── │          (Port 8000)           │
└───────────────┬────────────────┘                 └────────────────────────────────┘
                │ SQL
                ▼
┌────────────────────────────────┐
│      PostgreSQL 16 Database    │
│           (Port 5432)          │
└────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite, Lucide Icons |
| **Backend** | Node.js, Express.js, TypeScript, Prisma ORM |
| **Database** | PostgreSQL 16 (Relational DB with migrations) |
| **Auth** | bcryptjs (12 rounds) + JWT stored in HTTP-only cookies |
| **AI Service** | Python 3.11+, FastAPI, PyTorch, Transformers, IndicBERTv2 |
| **Deployment** | Docker & Docker Compose |

---

## 📁 Project Structure

```
.
├── ai-service/               # FastAPI AI classification & translation service
│   ├── app/
│   │   ├── main.py           # FastAPI endpoints (/predict, /health)
│   │   └── mgrs_inference.py # IndicBERTv2 multi-task inference + fast translation
│   ├── models/
│   │   └── mgrs-classifier/  # Trained encoder, heads.pt, tokenizer, metadata
│   ├── Dockerfile
│   └── requirements.txt
├── backend/                  # Express.js REST API
│   ├── prisma/
│   │   ├── schema.prisma     # Database models (Complaints, Users, Depts)
│   │   ├── migrations/       # SQL migration history
│   │   └── seed.ts           # Initial seeds (8 departments, sample citizen)
│   └── src/
│       ├── index.ts          # Server entry point
│       ├── routes/           # complaints, admin, auth, analytics
│       └── utils/            # helpers (AI caller, ticket generator)
├── frontend/                 # React SPA
│   └── src/
│       ├── pages/citizen/    # Submit, History, Detail, Track, Profile
│       ├── pages/admin/      # Dashboard, Complaints, Citizens, Analytics
│       ├── components/       # Shared UI widgets & layouts
│       └── services/         # Axios API clients
├── docker-compose.yml        # Orchestration for all 4 services
└── README.md
```

---

## 🚀 Step-by-Step Setup Guide

### Prerequisites
- **Node.js**: v18+ and `npm`
- **PostgreSQL**: v14+ (or running via Docker)
- **Python**: v3.10, v3.11, or v3.12 with `pip`

---

### Method A: Local Development (Terminal by Terminal)

#### 1. Setup PostgreSQL Database
Make sure PostgreSQL is running on your machine:
```bash
# Create user and database (if not already created)
psql postgres -c "CREATE USER mgrs_user WITH PASSWORD 'mgrs_password' CREATEDB;"
psql postgres -c "CREATE DATABASE mgrs_db OWNER mgrs_user;"
```

---

#### 2. Terminal 1 — Start the AI Service (Port 8000)
```bash
cd ai-service

# Create virtual environment (first time only)
python3 -m venv venv
source venv/bin/activate

# Install dependencies (first time only)
pip install -r requirements.txt

# Start the AI service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
> Verify AI service: Visit **http://localhost:8000/health** — should return:  
> `{"status":"ok","model_loaded":true,"model_version":"mgrs-indicbertv2-v1"}`

---

#### 3. Terminal 2 — Start the Backend (Port 5000)
```bash
cd backend

# Copy environment variables (first time only)
cp .env.example .env

# Install dependencies
npm install

# Run database migrations & generate Prisma client
npx prisma migrate deploy
npx prisma generate

# Seed initial departments & sample citizen (first time only)
npx ts-node prisma/seed.ts

# Start the Express server
npm run dev
```
> Backend runs at **http://localhost:5000** and connects to AI service at `http://localhost:8000`.

---

#### 4. Terminal 3 — Start the Frontend (Port 3000)
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```
> Open your browser and navigate to **http://localhost:3000**.

---

### Method B: Single-Command Docker Deployment

You can run the entire system (Database + AI Service + Backend + Frontend) using Docker Compose:

```bash
# Build and start all 4 containers in the background
docker-compose up -d --build

# View container logs
docker-compose logs -f
```

Access the applications:
- **Web App**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **AI Health Check**: `http://localhost:8000/health`

To stop:
```bash
docker-compose down
```

---

## 🔑 Login Credentials (Development)

### Citizen Portal (`http://localhost:3000/login`)
- **Email**: `citizen@example.com`
- **Password**: `citizen123`
*(Or register a new account on `/register`)*

### Admin Portal (`http://localhost:3000/admin/login`)
- **Admin ID**: `admin@mgrs.gov`
- **Password**: `admin123`

---

## 🎯 5 Demo Complaints (Test With Different Languages)

Use these 5 complaints to test the full automated triage pipeline in the browser or via API:

### Test Case 1: Hindi (Sanitation)
- **Select Language**: Hindi (`hi`)
- **Complaint Text**:
  ```
  कचरा तीन दिनों से नहीं उठाया गया है और बदबू आ रही है
  ```
- **Expected English Translation**: *"Garbage has not been collected for three days and it is smelling"*
- **Predicted Category**: `Sanitation`
- **Auto-Assigned Department**: `Sanitation Department`
- **Predicted Urgency**: `MEDIUM`
- **Resolution SLA**: `~5 days`

---

### Test Case 2: Tamil (Street Lighting)
- **Select Language**: Tamil (`ta`)
- **Complaint Text**:
  ```
  எங்கள் தெருவில் மின் விளக்குகள் எரியவில்லை, இரவில் மிகவும் இருட்டாக உள்ளது
  ```
- **Expected English Translation**: *"Street lights in our street are not working, it is very dark at night"*
- **Predicted Category**: `Street Lighting`
- **Auto-Assigned Department**: `Street Lighting Department`
- **Predicted Urgency**: `LOW`
- **Resolution SLA**: `~14 days`

---

### Test Case 3: Bengali (Roads & Maintenance — High Emergency)
- **Select Language**: Bengali (`bn`)
- **Complaint Text**:
  ```
  প্রধান রাস্তায় বড় গর্তের কারণে দুর্ঘটনা ঘটছে, অবিলম্বে মেরামত প্রয়োজন
  ```
- **Expected English Translation**: *"Accidents are happening due to a big pothole on the main road, immediate repair is needed"*
- **Predicted Category**: `Roads & Maintenance`
- **Auto-Assigned Department**: `Roads & Infrastructure`
- **Predicted Urgency**: `HIGH` *(Triggers high urgency due to danger/accident keywords)*
- **Resolution SLA**: `~3 days`

---

### Test Case 4: Kannada (Water Supply — Critical Urgent)
- **Select Language**: Kannada (`kn`)
- **Complaint Text**:
  ```
  ಕಳೆದ ಮೂರು ದಿನಗಳಿಂದ ನಮ್ಮ ಬಡಾವಣೆಯಲ್ಲಿ ಕುಡಿಯುವ ನೀರು ಸರಬರಾಜು ಆಗುತ್ತಿಲ್ಲ
  ```
- **Expected English Translation**: *"Drinking water is not being supplied in our locality for the past three days"*
- **Predicted Category**: `Water Supply`
- **Auto-Assigned Department**: `Water Supply Department`
- **Predicted Urgency**: `HIGH`
- **Resolution SLA**: `~1 day`

---

### Test Case 5: Marathi (Parks & Recreation)
- **Select Language**: Marathi (`mr`)
- **Complaint Text**:
  ```
  सार्वजनिक उद्यानातील खेळणी तुटलेली आहेत आणि कचऱ्याचे साम्राज्य आहे
  ```
- **Expected English Translation**: *"Play equipment in the public park is broken and there is garbage everywhere"*
- **Predicted Category**: `Parks & Recreation`
- **Auto-Assigned Department**: `Parks & Recreation`
- **Predicted Urgency**: `LOW`
- **Resolution SLA**: `~15 days`

---

## 🤖 What the AI Model Automates

When a citizen clicks **Submit**:
1. **Language Detection**: Automatically detects language script across 10 Indian languages.
2. **Category Classification**: Fine-tuned IndicBERTv2 classifies text into 1 of 8 municipal categories.
3. **Urgency Classification**: Predicts urgency (`LOW`, `MEDIUM`, `HIGH`) with rule-based safety escalation for hazard words (fire, accident, live wire, etc.).
4. **Auto-Assignment**: Matches predicted category to municipal departments in PostgreSQL and assigns it automatically.
5. **Resolution Deadline Calculation**: Computes expected completion date based on department SLA matrix.
6. **Dual-Language Interface**: Both Admin and Citizen portals display both the **Original User Language** and the **English AI Translation**.

---

## 📊 Department & Category Mapping

| Category | Department Name | Department Code | Typical SLA (High / Med / Low) |
|---|---|---|---|
| Sanitation | Sanitation Department | `SANITATION` | 2d / 5d / 10d |
| Water Supply | Water Supply Department | `WATER` | 1d / 4d / 8d |
| Street Lighting | Street Lighting Department | `LIGHTING` | 3d / 7d / 14d |
| Roads & Maintenance | Roads & Infrastructure | `ROADS` | 3d / 7d / 15d |
| Parks & Recreation | Parks & Recreation | `PARKS` | 5d / 10d / 15d |
| Electrical | Electrical Department | `ELECTRICAL` | 1d / 3d / 7d |
| Health | Health Department | `HEALTH` | 1d / 3d / 7d |
| General | General Administration | `ADMIN` | 3d / 7d / 14d |

---

## 📡 API Reference Summary

### Complaints API
- `POST /api/complaints` — Submit a complaint (runs AI triage, saves photo, auto-assigns dept).
- `GET /api/complaints/my` — Get logged-in citizen's complaints.
- `GET /api/complaints/track/:ticketId` — Public tracking by ticket ID (includes dual language & SLA deadline).
- `GET /api/complaints/:id` — Full details for citizen owner.

### Admin Operations API
- `GET /api/admin/complaints` — Filter, paginate, and search all grievances.
- `GET /api/admin/complaints/:id` — Detail view with AI predictions and dual-language texts.
- `PATCH /api/admin/complaints/:id/assign` — Manually override or assign department/officer.
- `PATCH /api/admin/complaints/:id/status` — Update status (`PENDING` → `IN_PROGRESS` → `RESOLVED` / `REJECTED`).
- `PATCH /api/admin/complaints/:id/ai-correction` — Correct AI category or urgency predictions.
- `GET /api/admin/stats` — Dashboard metrics & department workload charts.

### AI Prediction API
- `POST http://localhost:8000/predict`
  ```json
  // Request
  { "text": "कचरा तीन दिनों से नहीं उठाया गया है", "language": "hi" }

  // Response
  {
    "category": "Sanitation",
    "department": "Sanitation Department",
    "urgency": "MEDIUM",
    "confidence": 0.9144,
    "translated_text": "Garbage has not been collected for three days",
    "detected_language": "hi",
    "estimated_resolution_days": 5,
    "model_version": "mgrs-indicbertv2-v1",
    "ai_pending": false
  }
  ```
- `GET http://localhost:8000/health` — Returns status of model engine and version.
