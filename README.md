# Codeforces Analytics Dashboard

A full-stack competitive programming analytics platform that tracks your Codeforces performance, visualizes rating history, submission patterns, and provides deep insights into your problem-solving habits.

---

## Features

- **Authentication** — Register and login with JWT-based auth via secure HTTP-only cookies
- **Codeforces Handle Sync** — Connect your CF handle and sync all data automatically
- **Activity Heatmap** — GitHub-style contribution heatmap showing daily submissions
- **Rating Progression** — Interactive area chart with CF rank threshold lines
- **Contest History** — Full contest history with rank and rating change per contest
- **Contest Extremes** — Best/worst rank, biggest gain/drop, win/loss streaks
- **Verdict Breakdown** — Donut chart showing AC, WA, TLE, RE distribution
- **Language Stats** — Animated bar chart of programming language usage
- **Difficulty Distribution** — Problems solved bucketed by CF rating (800–3500)
- **Tag Mastery** — Per-tag stats: solved, attempted, success rate, avg difficulty
- **Attempts Analysis** — Acceptance rate, avg attempts to solve, hardest solved problem
- **Background Sync Worker** — Continuous data sync respecting CF API rate limits

---

## Tech Stack

**Frontend**
- Next.js 16 (App Router)
- Tailwind CSS v4
- Recharts (data visualization)
- Framer Motion (animations)
- Lucide React (icons)

**Backend**
- Node.js + Express.js v5
- PostgreSQL (Neon serverless)
- Prisma ORM
- JWT authentication
- Native fetch for CF API requests

**Infrastructure**
- Docker + Docker Compose
- AWS EC2 (backend deployment)
- Next.js rewrites (API proxy)

---

## Project Structure

```
CODEFORCES_API/
├── backend/
│   ├── controller/
│   │   ├── auth.controller.js
│   │   ├── dashboard.controller.js
│   │   ├── codeforces.controller.js
│   │   └── user.controller.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── dashboard.routes.js
│   │   ├── codeforces.routes.js
│   │   └── user.routes.js
│   ├── services/
│   │   ├── auth.service.js
│   │   └── codeforces.service.js
│   ├── worker/
│   │   ├── syncWorker.js
│   │   └── rateLimiter.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── utils/
│   │   └── jwt.js
│   ├── client.js
│   ├── app.js
│   ├── server.js
│   ├── Dockerfile
│   ├── Dockerfile.worker
│   ├── docker-compose.yml
│   └── .dockerignore
│
└── frontend/
    ├── app/
    │   ├── auth/
    │   │   └── page.jsx
    │   ├── connect-codeforces/
    │   │   └── page.jsx
    │   └── dashboard/
    │       ├── components/
    │       │   ├── ActivityHeatmap.jsx
    │       │   ├── AttemptsStats.jsx
    │       │   ├── ContestExtremes.jsx
    │       │   ├── ContestHistory.jsx
    │       │   ├── DifficultyStats.jsx
    │       │   ├── FocusAreas.jsx
    │       │   ├── Header.jsx
    │       │   ├── LanguageStats.jsx
    │       │   ├── RatingChart.jsx
    │       │   ├── RatingHistoryChart.jsx
    │       │   ├── Sidebar.jsx
    │       │   ├── StatCard.jsx
    │       │   ├── TagMastery.jsx
    │       │   └── VerdictStats.jsx
    │       ├── hooks/
    │       │   ├── useActivity.js
    │       │   ├── useInsights.js
    │       │   └── useSummary.js
    │       └── page.jsx
    ├── middleware.ts
    ├── next.config.mjs
    └── .env
```

---

## System Design

```
┌─────────────────┐         ┌──────────────────────────────────┐
│   Next.js       │         │         AWS EC2                   │
│   Frontend      │         │  ┌────────────┐  ┌────────────┐  │
│   (localhost/   │─────────▶  │  cf_api    │  │ cf_worker  │  │
│    Vercel)      │  proxy  │  │ Express    │  │ SyncWorker │  │
│                 │         │  │ :8080      │  │            │  │
└─────────────────┘         │  └─────┬──────┘  └─────┬──────┘  │
                            │        │               │          │
                            └────────┼───────────────┼──────────┘
                                     │               │
                                     ▼               ▼
                            ┌─────────────────────────────┐
                            │     Neon PostgreSQL          │
                            │   (Serverless DB)            │
                            └─────────────────────────────┘
                                     ▲
                                     │ sync jobs
                            ┌────────┴─────────┐
                            │  Codeforces API  │
                            │  (rate limited)  │
                            └──────────────────┘
```

### Architecture Decisions

**Decoupled sync worker** — The sync worker runs as a completely separate Docker container from the API server. This means CF API calls never block HTTP requests. If CF is slow or down, your dashboard still loads from cached DB data instantly.

**Job queue pattern** — Instead of calling CF directly on user request, the app creates `SyncJob` records in PostgreSQL. The worker polls every 2 seconds, picks up pending jobs, and processes them. This gives retry capability, status tracking, and prevents duplicate syncs.

**Caching everything** — All CF data (submissions, ratings, contests, problems) is stored in PostgreSQL after first sync. The dashboard reads entirely from the DB — no live CF API calls on page load. This means sub-100ms dashboard loads regardless of CF's availability.

**Activity aggregation** — Raw submissions are stored first, then aggregated into daily `Activity` records as a separate job. This separation means the expensive grouping runs once in the background, not on every dashboard request.

---

## The Codeforces API Rate Limit Problem

This is the most critical engineering challenge in the project.

### CF API Constraints

Codeforces enforces a hard limit of **5 requests per second** per IP. Exceeding this results in:
- `ECONNRESET` — TCP connection dropped mid-response
- `HTTP 503` — temporary IP ban (minutes to hours)
- `HTTP 429` — explicit rate limit response

In practice, CF's Cloudflare layer is even more aggressive — it fingerprints requests and blocks Node.js HTTP clients that don't match browser TLS signatures. This is why the project uses **native `fetch`** (Node 22's undici-based implementation) instead of axios, which uses a recognizable TLS fingerprint that Cloudflare blocks.

### How This Project Handles It

**Rate limiter (`worker/rateLimiter.js`):**
```
500ms minimum delay between requests = max 2 req/sec
```
This is deliberately conservative — CF's stated limit is 5/sec but they start resetting connections at 3-4/sec on many IPs.

**Exponential backoff in `codeforces.service.js`:**
```
Attempt 1 fails → wait 2s → retry
Attempt 2 fails → wait 4s → retry
Attempt 3 fails → wait 8s → retry
Attempt 4 fails → wait 15s → retry
Attempt 5 fails → mark job as failed
```

**Small batch sizes for submissions:**
The `user.status` endpoint (submissions) returns large JSON payloads. Requesting 1000 submissions at once (~2MB) causes CF to reset the connection. Batching at 200 per request keeps responses under ~400KB which transfers reliably.

**Post-failure cooldown:**
After any job failure, the worker waits 10 seconds before picking up the next job. This prevents rapid retry loops that would compound the rate limit problem.

**Idempotent upserts:**
All DB writes use Prisma `upsert` — if a sync is interrupted and retried, no duplicate data is created.

---

## Capacity Analysis

### Current Setup (Single EC2 t2.micro + Neon Free Tier)

| Resource | Limit | Notes |
|----------|-------|-------|
| Neon free DB | 0.5 GB storage | ~50K submissions before hitting limit |
| Neon connections | 20 concurrent | Prisma connection pooling handles this |
| EC2 t2.micro RAM | 1 GB | Sufficient for Express + worker |
| CF API | 2 req/sec (our limit) | Shared across all sync jobs |

**Realistic user capacity at this tier: ~50–100 users**

With 100 users each having ~500 submissions = 50,000 submission rows. Each row is ~200 bytes = ~10MB. Well within Neon's 0.5GB limit.

The bottleneck is the **CF API rate limit**, not the database or server:

- 1 full sync (profile + ratings + submissions) takes ~30–60 seconds per user
- At 2 req/sec, syncing 10 users simultaneously = 10 jobs competing for the same rate limit
- The job queue serializes this naturally — jobs process one at a time

### Scaling to 1000+ Users

To handle more users, three changes are needed:

**1. Multiple CF API keys / IPs**
CF rate limits per IP. Running multiple worker instances on different IPs multiplies throughput proportionally. Each additional EC2 worker = +2 req/sec capacity.

**2. Upgrade database**
Move from Neon free tier to Neon Pro or a dedicated PostgreSQL instance. Add indexes on `handleId`, `creationTime`, `verdict` (already in schema).

**3. Smart re-sync scheduling**
Instead of re-syncing all users on demand, only sync users who have submitted recently (check `lastOnlineTime` from CF profile). Most users are inactive — no need to sync them daily.

**Estimated capacity by tier:**

| Setup | Users | Cost/month |
|-------|-------|-----------|
| 1× t2.micro + Neon free | ~100 | $0–10 |
| 1× t3.small + Neon Pro | ~500 | $30–50 |
| 3× t3.small workers + RDS | ~5000 | $150–200 |

---

## Getting Started

### Prerequisites
- Node.js 22+
- Docker Desktop
- PostgreSQL database (or [Neon](https://neon.tech) free tier)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Fill in: DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN, FRONTEND_URL

# Run database migrations
npx prisma migrate deploy

# Start development server
node server.js

# Start sync worker (separate terminal)
node worker/syncWorker.js
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
pnpm install

# Create .env with:
echo "NEXT_PUBLIC_URL=/api" > .env

# Start development server
pnpm dev
```

### Docker (Recommended)

```bash
cd backend

# Build and run both API + worker
docker-compose up --build

# Run in background
docker-compose up -d --build
```

---

## Environment Variables

### Backend `.env`
```env
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend `.env`
```env
NEXT_PUBLIC_URL=/api
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/summary` | Rating, rank, problems solved |
| GET | `/api/dashboard/activity` | Heatmap data (supports `?days=`) |
| GET | `/api/dashboard/contests` | Recent contest history (supports `?limit=`) |
| GET | `/api/dashboard/rating-history` | Full rating progression |
| GET | `/api/dashboard/verdict-stats` | Submission verdict breakdown |
| GET | `/api/dashboard/language-stats` | Language usage |
| GET | `/api/dashboard/difficulty-stats` | Problems by rating bucket |
| GET | `/api/dashboard/attempts-stats` | Acceptance rate + attempt stats |
| GET | `/api/dashboard/tag-mastery` | Per-tag performance |
| GET | `/api/dashboard/contest-extremes` | Best/worst contest stats |
| GET | `/api/dashboard/focus-areas` | Top 6 tags by solve % |

---

## Deployment

### Backend on AWS EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
sudo apt update && sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu

# Clone repo
git clone https://github.com/Swastik2740S/CODEFORCES_API.git
cd CODEFORCES_API/backend

# Create .env
nano .env  # add all env vars

# Start
docker-compose up -d --build
```

Ensure port `8080` is open in your EC2 Security Group inbound rules (Custom TCP, 0.0.0.0/0).

### Frontend on Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set environment variable: `NEXT_PUBLIC_URL=/api`
4. Update `next.config.mjs` destination with your EC2 IP

---

## Known Limitations

- **CF API blocks on some ISPs** — `user.status` endpoint may require a VPN for initial sync on Indian ISPs due to Cloudflare TLS fingerprinting
- **Neon cold starts** — Free tier DB pauses after 5 min inactivity; first request after pause takes ~3s (handled gracefully by the worker)
- **No real-time sync** — Data refreshes only when a sync job is manually triggered or the user requests it
- **Single worker** — Only one sync job runs at a time; multiple users syncing simultaneously queue up

---

## License

MIT
