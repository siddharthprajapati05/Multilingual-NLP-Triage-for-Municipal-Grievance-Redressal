# Municipal Grievance Redressal System (MGRS)

**Multilingual NLP Triage for Municipal Grievance Redressal**

A full-stack web application for citizens to file, track, and manage municipal complaints. Features dual portals (Citizen & Admin), role-based authentication, AI-ready classification pipeline, and Docker deployment.

---

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│   Frontend   │────▶│   Backend    │────▶│  PostgreSQL  │     │ AI Svc   │
│  React + TS  │     │ Express + TS │     │   (Prisma)   │     │ FastAPI  │
│  Tailwind    │     │  JWT Auth    │     │              │     │(pending) │
│  Port 3000   │     │  Port 5000   │     │  Port 5432   │     │ Port 8000│
└─────────────┘     └──────────────┘     └──────────────┘     └──────────┘
```

## Technology Stack

| Layer     | Technology                                        |
|-----------|--------------------------------------------------|
| Frontend  | React 18, TypeScript, Tailwind CSS, React Router |
| Backend   | Node.js, Express.js, TypeScript                   |
| Database  | PostgreSQL 16, Prisma ORM                         |
| Auth      | bcryptjs + JWT (no third-party auth providers)    |
| AI Service| Python, FastAPI (placeholder for IndicBERT)       |
| Deploy    | Docker, Docker Compose                            |

## Project Structure

```
.
├── backend/                  # Express.js API server
│   ├── prisma/
│   │   ├── schema.prisma     # Database models
│   │   ├── migrations/       # Auto-generated migrations
│   │   └── seed.ts           # Seed data
│   └── src/
│       ├── index.ts          # App entry point
│       ├── middleware/       # Auth, upload, error handling
│       ├── routes/           # API route handlers
│       └── utils/            # Helpers
├── frontend/                 # React SPA
│   └── src/
│       ├── components/       # Shared UI + layout components
│       ├── contexts/         # Auth state (citizen/admin)
│       ├── pages/            # Citizen and Admin page views
│       ├── services/         # API client functions
│       ├── types/            # TypeScript interfaces
│       └── utils/            # Formatting helpers
├── ai-service/               # FastAPI AI placeholder
│   └── app/main.py           # Prediction endpoint
├── docker-compose.yml        # Multi-service orchestration
└── README.md
```

## Quick Start (Local Development)

### Prerequisites

- Node.js 18+
- PostgreSQL 16
- Python 3.10+ (optional, for AI service)

### 1. Clone and install

```bash
# Backend
cd backend
cp .env.example .env      # Edit if needed
npm install
npx prisma generate

# Frontend
cd ../frontend
npm install
```

### 2. Set up the database

```bash
# Create PostgreSQL database and user
psql postgres -c "CREATE USER mgrs_user WITH PASSWORD 'mgrs_password' CREATEDB;"
psql postgres -c "CREATE DATABASE mgrs_db OWNER mgrs_user;"

# Run migrations
cd backend
npx prisma migrate dev --name init

# Seed sample data
npx ts-node prisma/seed.ts
```

### 3. Start the servers

```bash
# Terminal 1: Backend (port 5000)
cd backend && npm run dev

# Terminal 2: Frontend (port 3000)
cd frontend && npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Login Credentials (Development Only)

### Citizen Portal

| Field     | Value                |
|-----------|---------------------|
| Email     | citizen@example.com  |
| Password  | citizen123           |

Or register a new citizen account.

### Admin Portal

| Field     | Value           |
|-----------|-----------------|
| Admin ID  | admin@mgrs.gov  |
| Password  | admin123         |

Access at: **http://localhost:3000/admin/login**

> ⚠️ **Change these credentials before any deployment.** See the "Changing Admin Credentials" section below.

---

## Changing Admin Credentials

Admin credentials are configured via backend environment variables:

```bash
# In backend/.env
ADMIN_ID="your_new_admin_id"
ADMIN_PASSWORD_HASH="<bcrypt hash>"
```

To generate a new hash:

```bash
cd backend
node -e "const b=require('bcryptjs'); b.hash('YOUR_NEW_PASSWORD',12).then(console.log)"
```

Copy the output hash into `ADMIN_PASSWORD_HASH` and restart the backend.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable             | Description                          | Default                |
|---------------------|--------------------------------------|------------------------|
| `DATABASE_URL`       | PostgreSQL connection string         | postgresql://...       |
| `JWT_SECRET`         | Secret for JWT token signing         | (set a random string)  |
| `JWT_EXPIRES_IN`     | JWT token expiry                     | 7d                     |
| `ADMIN_ID`           | Admin login identifier               | admin@mgrs.gov         |
| `ADMIN_PASSWORD_HASH`| bcrypt hash of admin password        | (generate with bcrypt) |
| `PORT`               | Server port                          | 5000                   |
| `NODE_ENV`           | Environment                          | development            |
| `FRONTEND_URL`       | CORS origin                          | http://localhost:3000   |
| `AI_SERVICE_URL`     | AI classification service URL        | http://localhost:8000   |

---

## API Endpoints

### Authentication

| Method | Endpoint                 | Description          | Auth     |
|--------|--------------------------|----------------------|----------|
| POST   | `/api/auth/register`     | Citizen registration | Public   |
| POST   | `/api/auth/login`        | Citizen login        | Public   |
| POST   | `/api/auth/logout`       | Citizen logout       | Citizen  |
| GET    | `/api/auth/me`           | Get profile          | Citizen  |
| PUT    | `/api/auth/profile`      | Update profile       | Citizen  |
| POST   | `/api/admin/auth/login`  | Admin login          | Public   |
| POST   | `/api/admin/auth/logout` | Admin logout         | Admin    |
| GET    | `/api/admin/auth/me`     | Verify admin session | Admin    |

### Complaints

| Method | Endpoint                       | Description              | Auth     |
|--------|-------------------------------|--------------------------|----------|
| POST   | `/api/complaints`              | Submit complaint         | Citizen  |
| GET    | `/api/complaints/my`           | My complaints list       | Citizen  |
| GET    | `/api/complaints/stats/me`     | My complaint stats       | Citizen  |
| GET    | `/api/complaints/track/:id`    | Track by ticket ID       | Public   |
| GET    | `/api/complaints/:id`          | Complaint details        | Citizen  |

### Admin Operations

| Method | Endpoint                                  | Description            | Auth  |
|--------|------------------------------------------|------------------------|-------|
| GET    | `/api/admin/stats`                        | Dashboard statistics   | Admin |
| GET    | `/api/admin/complaints`                   | All complaints         | Admin |
| GET    | `/api/admin/complaints/:id`               | Complaint details      | Admin |
| PATCH  | `/api/admin/complaints/:id/assign`        | Assign department      | Admin |
| PATCH  | `/api/admin/complaints/:id/status`        | Update status          | Admin |
| PATCH  | `/api/admin/complaints/:id/ai-correction` | Correct AI prediction  | Admin |
| GET    | `/api/admin/citizens`                     | List citizens          | Admin |
| PATCH  | `/api/admin/citizens/:id/toggle`          | Activate/deactivate    | Admin |

### Departments & Analytics

| Method | Endpoint                    | Description           | Auth     |
|--------|----------------------------|-----------------------|----------|
| GET    | `/api/departments`          | List departments      | Public   |
| POST   | `/api/departments`          | Create department     | Admin    |
| PUT    | `/api/departments/:id`      | Update department     | Admin    |
| GET    | `/api/analytics/trends`     | Monthly trends        | Admin    |
| GET    | `/api/analytics/categories` | Category breakdown    | Admin    |
| GET    | `/api/analytics/languages`  | Language breakdown    | Admin    |
| GET    | `/api/analytics/departments`| Dept. performance     | Admin    |

---

## Docker Deployment

```bash
# Generate admin password hash first
node -e "const b=require('bcryptjs'); b.hash('your_admin_password',12).then(console.log)"

# Set the hash in environment
export ADMIN_PASSWORD_HASH='$2a$12$...'

# Start all services
docker-compose up -d --build
```

Access: `http://localhost:3000`

---

## AI Model Integration (Future)

The AI service at `ai-service/app/main.py` is a **placeholder**. Current state:

- `/predict` returns 503 (model not loaded)
- `/health` reports `ai_pending: true`
- `/model-info` documents expected input/output schema

### To integrate your model:

1. Place model files in `ai-service/models/`
2. Load the model in `main.py` (update the `MODEL_LOADED` flag)
3. Implement inference in the `/predict` endpoint
4. Update `requirements.txt` with model dependencies (e.g., `transformers`, `torch`)
5. Restart the AI service

Expected request/response:

```json
// POST /predict
// Request
{ "text": "complaint text here", "language": "en" }

// Response
{
  "category": "Sanitation",
  "department": "Sanitation Department",
  "urgency": "HIGH",
  "confidence": 0.92,
  "model_version": "indicbert-v1",
  "ai_pending": false
}
```

The backend handles AI unavailability gracefully — complaints submit normally without classification.

---

## Database Migrations

```bash
# Create a new migration after schema changes
cd backend
npx prisma migrate dev --name your_migration_name

# Deploy migrations (production)
npx prisma migrate deploy

# View database in browser
npx prisma studio
```

---

## Features Summary

### Citizen Portal
- ✅ Registration with email/mobile
- ✅ Login with JWT authentication
- ✅ Dashboard with complaint statistics
- ✅ Submit complaints with text, language, and photo
- ✅ Track complaints by ticket ID
- ✅ Complaint history with search and filters
- ✅ Complaint details with resolution timeline
- ✅ Profile management and language preference
- ✅ Notifications
- ✅ Multilingual UI support (10 Indian languages)

### Admin Portal
- ✅ Separate admin login (environment-configured credentials)
- ✅ Dashboard with statistics and charts
- ✅ All complaints table with search, filters, pagination
- ✅ Assign complaints to departments
- ✅ Update status (Pending → In Progress → Resolved/Rejected)
- ✅ Add official remarks and resolution details
- ✅ Complaint status history timeline
- ✅ Manage citizen accounts (activate/deactivate)
- ✅ Department management (create, edit)
- ✅ Analytics by category, language, urgency, department
- ✅ AI prediction review (when model integrated)

### Security
- ✅ Passwords hashed with bcrypt (12 rounds)
- ✅ JWT tokens with HTTP-only cookies
- ✅ Role-based route protection (backend middleware)
- ✅ Citizens cannot access admin routes
- ✅ Input validation on all endpoints
- ✅ Rate limiting
- ✅ Helmet security headers
- ✅ No secrets in frontend code
