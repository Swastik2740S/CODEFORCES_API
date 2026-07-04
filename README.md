# Codeforces Analytics Dashboard

A full-stack analytics platform that turns a competitive programmer's raw
Codeforces history into fast, interactive insights — rating progression,
activity heatmaps, verdict and language breakdowns, tag mastery, difficulty
distribution, contest performance, and head-to-head peer comparison.

The hard part isn't the charts. It's ingesting user data reliably from an API
that is **strictly rate-limited (~5 req/sec per IP) and fronted by Cloudflare**.
This project solves that with a **decoupled sync-worker architecture** and a
**PostgreSQL-backed job queue**, so the dashboard always serves pre-computed
data in milliseconds regardless of Codeforces' availability.

<p>
  <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-green.svg" />
  <img alt="Node" src="https://img.shields.io/badge/Node-22-brightgreen.svg" />
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black.svg" />
  <img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL-Prisma-blue.svg" />
</p>

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [The Core Problem: Codeforces Rate Limiting](#the-core-problem-codeforces-rate-limiting)
- [Tech Stack](#tech-stack)
- [Data Model](#data-model)
- [The Sync Pipeline](#the-sync-pipeline)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Scaling & Capacity](#scaling--capacity)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Authors](#authors)
- [License](#license)

---

## Features

- **Account & handle management** — email/password auth (JWT in HTTP-only
  cookies), link/switch multiple Codeforces handles per account.
- **Rich dashboard** — a single `/overview` call returns pre-aggregated:
  - Rating progression chart with rank thresholds
  - GitHub-style activity heatmap (daily solves / submissions / contests)
  - Verdict, language, and difficulty distributions
  - Tag mastery (success rate & avg difficulty per topic)
  - Attempt efficiency (first-try rate, avg attempts to solve, hardest solved/unsolved)
  - Contest history, streaks, and rating extremes
- **Peers** — compare yourself against *any* public Codeforces handle
  (rating overlay, tag-by-tag comparison, common contests, a "practice these"
  list of problems your peer solved that you haven't), plus a followed-peers
  leaderboard.
- **Problems browser** — filter the cached Codeforces problemset by rating and tags.
- **Contests** — upcoming and past contest listings.
- **Sub-second reads** — every dashboard widget reads a pre-computed row, not a
  live aggregation. Typical initial load is well under 200 ms.

---

## Architecture

The system is split into **three independently deployable services** plus a
managed Postgres database. The design principle is a hard separation between
**data ingestion** (slow, rate-limited, failure-prone) and **data presentation**
(fast, read-only, always available).

```
                        ┌──────────────────────────────┐
                        │        Codeforces API         │
                        │  (~5 req/s per IP, Cloudflare) │
                        └───────────────┬───────────────┘
                                        │  native fetch + throttle
                                        │  (only the worker calls CF)
                                        ▼
  ┌──────────────┐   HTTP    ┌────────────────┐   poll / claim ┌──────────────┐
  │   Frontend   │  /api/*   │   Express API  │◄──────────────►│  Sync Worker │
  │  (Next.js)   │─────────► │   (stateless)  │   job queue    │  (headless)  │
  │  proxy pass  │           │  reads pre-agg │                │  writes data │
  └──────────────┘           └───────┬────────┘                └──────┬───────┘
                                     │                                 │
                                     │        ┌──────────────┐         │
                                     └───────►│  PostgreSQL  │◄────────┘
                                              │    (Neon)    │
                                              │ SyncJob queue│
                                              │  HandleStats │
                                              └──────────────┘
```

**Why three services?**

| Service | Role | Talks to Codeforces? | Scales by |
| :--- | :--- | :--- | :--- |
| **Frontend** (Next.js) | UI + proxy `/api/*` → backend | No | CDN / more replicas |
| **API** (Express) | Auth, reads pre-aggregated data, enqueues jobs | Only 1 call (handle verification) | Stateless horizontal replicas |
| **Worker** (Node) | Polls the queue, calls Codeforces, writes & aggregates | **Yes — the only CF caller** | More workers, each on a **distinct IP** |
| **PostgreSQL** | Source of truth + durable job queue | No | Read replicas / partitioning |

If the worker crashes or Codeforces goes down, the website stays fully
functional — it just serves the last-synced data.

### Architecture decisions

- **Decoupled sync worker** — runs as a separate container from the API, so CF
  calls never block HTTP requests. If CF is slow or down, the dashboard still
  loads from the DB instantly.
- **Postgres-backed job queue** — user requests create `SyncJob` rows instead of
  calling CF directly. Workers claim jobs atomically with `FOR UPDATE SKIP
  LOCKED` (safe for any number of workers), honor `priority`/`runAfter`, retry
  with quadratic backoff, and a heartbeat sweep requeues jobs whose worker died.
- **Sync sessions** — a user-triggered sync groups its jobs under one
  `syncSessionId`; the frontend polls one endpoint for aggregate progress.
- **Pre-computed stats (`HandleStats`)** — all heavy aggregation runs in the
  worker after a sync and lands in one row per handle, so dashboard endpoints
  are single-row reads.
- **One-request dashboard** — `GET /api/dashboard/overview` returns every
  section in a single response; the client fetches once and each widget reads
  its slice.

---

## The Core Problem: Codeforces Rate Limiting

> **This is the single most important design constraint in the project, and the
> hard ceiling on how far it can scale.**

Codeforces exposes a public API but enforces:

1. **A per-IP rate limit** of roughly **5 requests/second**, with Cloudflare
   dropping connections well below that on many networks. Exceeding it yields
   `ECONNRESET` (dropped mid-response), `HTTP 503` (temporary IP ban), or
   `HTTP 429`.
2. **Cloudflare TLS fingerprinting** — older HTTP libraries (Axios, Request) get
   `403`/`503` because their TLS signature doesn't look like a browser.

Our mitigations:

- **Single, serialized rate limiter** (`worker/rateLimiter.js`) — all CF calls
  are chained through one promise at **~2.5 req/s** (a `400 ms` floor), staying
  safely under the limit. Concurrent callers queue rather than burst.
- **Native `fetch` (Node 22 / Undici)** — carries a modern-client TLS signature
  Cloudflare accepts, with a browser `User-Agent`. In testing this eliminated
  the connection resets seen with older libraries.
- **Sequential batching** — submissions are fetched in pages of 200 with a
  `1200 ms` pause between pages, keeping payloads small and avoiding TCP resets.
- **Exponential backoff** — transient `429`/`503`/network errors retry with
  increasing delays (`2s → 4s → 8s → 15s`); the job then requeues with quadratic
  backoff (`1min → 4min → capped 10min`) until `maxAttempts` is exhausted.
- **Only the worker talks to Codeforces.** The API process makes exactly one CF
  call ever — verifying a handle exists when a user links it.

The practical consequence: **the entire product shares one Codeforces API
budget.** No amount of application compute changes that — see
[Scaling & Capacity](#scaling--capacity).

---

## Tech Stack

**Frontend**
- Next.js 16 (App Router) + React 19
- Tailwind CSS v4
- Recharts (charts), Framer Motion (animation), lucide-react (icons)

**Backend**
- Node.js 22 + Express 5
- Prisma ORM 6
- JWT (`jsonwebtoken`) + bcrypt (`bcryptjs`) for auth
- Native `fetch` for Codeforces calls

**Infrastructure**
- PostgreSQL (Neon serverless in production)
- Docker + Docker Compose (API + worker)
- AWS EC2 (backend), Next.js rewrites (API proxy)

---

## Data Model

Prisma schema (`backend/prisma/schema.prisma`). Key entities:

| Model | Purpose |
| :--- | :--- |
| `User` | Account (email, password hash, preferences). |
| `CodeforcesHandle` | A CF handle. `userId` may be **null** for *shadow handles* — public profiles synced on-demand for peer comparison. |
| `Friend` | A handle a user follows on the Peers page (one-directional). |
| `Submission` | Raw submissions (verdict, language, problem, timing). Idempotent on `submissionId`. |
| `RatingChange` | Per-contest rating deltas (immutable, insert-only). |
| `ContestParticipation` | A handle's result in a contest. |
| `Problem` / `Contest` / `ContestProblem` | Cached Codeforces problemset & contest metadata. |
| `Activity` | Pre-aggregated daily counts powering the heatmap. |
| **`HandleStats`** | **Pre-computed dashboard statistics** — one row per handle. This is what makes reads fast. |
| **`SyncJob`** | **The durable job queue.** State machine: `pending → running → completed/failed`, with priority, attempts, backoff, and heartbeats. |
| `RateLimitTracker` | Windowed counters (also used for the per-user daily new-peer budget). |

The design trade-off is deliberate: **write-time work is expensive, read-time
work is trivial.** The worker does all aggregation and writes it to
`HandleStats` / `Activity`; the API just reads single rows.

---

## The Sync Pipeline

A user-triggered sync creates a **session** of jobs under one `syncSessionId`:

```
profile → ratings → submissions → (auto) activity → (auto) stats
```

How it works (`backend/worker/syncWorker.js`):

1. **Enqueue** — the API inserts `profile`, `ratings`, `submissions` jobs at
   high priority (user is watching a progress bar). A partial unique index on
   `(handleId, jobType)` for active jobs makes double-queuing impossible.
2. **Claim** — the worker atomically claims the next runnable job with
   `UPDATE ... FOR UPDATE SKIP LOCKED`, which is **safe for any number of
   worker processes** — no job is ever processed twice.
3. **Process:**
   - `profile` — one `user.info` call.
   - `ratings` — `user.rating`, insert-only (immutable).
   - `submissions` — pages of 200, newest-first. An **incremental** re-sync
     stops as soon as a whole page is already known, so a returning active user
     usually costs a *single* API call. `submissions_full` crawls all history to
     pick up old rejudged verdicts.
4. **Aggregate** — after submissions land, the worker auto-enqueues `activity`
   (rebuilds the heatmap atomically) and `stats` (recomputes `HandleStats`).
   These are **DB-only, zero CF calls.**
5. **Resilience** — heartbeats mark long-running jobs; a stuck-job sweep
   requeues anything whose worker died. Failures cool down 10s and retry with
   backoff. Stale unfollowed shadow handles are garbage-collected after 30 days.

Peer comparisons flow through the *same* queue at **lower priority (0 vs 10)**,
so real users' syncs always win the shared rate-limit budget.

---

## API Reference

All routes are proxied by the frontend under `/api/*`. Auth is via an HTTP-only
`token` cookie; protected routes require it.

### Auth — `/api/auth`
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/register` | Create account |
| `POST` | `/login` | Log in, set cookie |
| `POST` | `/logout` | Clear cookie |
| `GET` | `/me` | Current user |
| `PATCH` | `/change-password` | Change password |

### User — `/api/user`
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/bootstrap` | Whether a CF handle is connected |
| `PATCH` | `/profile` | Update name/email |
| `DELETE` | `/account` | Delete account |

### Codeforces / Sync — `/api/codeforces`
| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/link-handle` | Verify & link a CF handle |
| `GET` | `/handles` | List linked handles |
| `POST` | `/sync` | Start a sync session (409 returns the running session) |
| `GET` | `/sync/session/:sessionId` | Aggregate session progress |
| `GET` | `/sync/:jobId` | Single-job status (legacy) |
| `GET` | `/rating-graph` | Rating points for charts |
| `PATCH` | `/handle/:id/activate` | Switch active handle |
| `DELETE` | `/handle/:id` | Remove a handle |

### Dashboard (read-only, pre-aggregated) — `/api/dashboard`
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/overview` | **Everything in one call** |
| `GET` | `/summary` | Rating, rank, problems solved |
| `GET` | `/activity` | Heatmap data (`?days=`) |
| `GET` | `/contests` | Recent contest history (`?limit=`) |
| `GET` | `/rating-history` | Full rating progression |
| `GET` | `/verdict-stats` | Verdict breakdown |
| `GET` | `/language-stats` | Language usage |
| `GET` | `/difficulty-stats` | Problems by rating bucket |
| `GET` | `/attempts-stats` | Acceptance rate + attempt stats |
| `GET` | `/tag-mastery` | Per-tag performance |
| `GET` | `/contest-extremes` | Best/worst contest stats |
| `GET` | `/focus-areas` | Top tags by solve share |

### Peers — `/api/peers`
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Followed peers |
| `GET` | `/leaderboard` | Leaderboard of followed peers |
| `POST` | `/:handle/follow` | Follow a handle |
| `DELETE` | `/:handle` | Unfollow |
| `POST` | `/:handle/sync` | Sync a peer (shadow handle) |
| `GET` | `/compare/:handle` | Head-to-head comparison |

### Problems & Contests
| Method | Path | Description |
| :--- | :--- | :--- |
| `GET` | `/api/problems` | Filter problemset (rating, tags) |
| `GET` | `/api/problems/tags` | Available tags |
| `GET` | `/api/contests/upcoming` | Upcoming contests |
| `GET` | `/api/contests/history` | Past contests |

---

## Project Structure

```
CODEFORCES_API/
├── backend/
│   ├── app.js                 # Express app: CORS, routes, /health
│   ├── server.js              # API entrypoint (port 8080)
│   ├── client.js              # Prisma client singleton
│   ├── routes/                # auth, user, codeforces, dashboard, peers,
│   │                          #   problems, contests
│   ├── controller/            # Request handlers (one per route group)
│   ├── services/
│   │   ├── codeforces.service.js  # CF API client (fetch + retry)
│   │   ├── stats.service.js       # HandleStats computation
│   │   └── auth.service.js
│   ├── worker/
│   │   ├── syncWorker.js      # The job-queue worker (the "heart")
│   │   └── rateLimiter.js     # Serialized ~2.5 req/s throttle
│   ├── middleware/            # auth.middleware.js (JWT)
│   ├── utils/                 # hash.js, jwt.js
│   ├── prisma/schema.prisma   # Data model
│   ├── Dockerfile             # API image
│   ├── Dockerfile.worker      # Worker image
│   └── docker-compose.yml     # API + worker services
└── frontend/
    ├── app/
    │   ├── auth/ connect-codeforces/ dashboard/ peers/ problems/
    │   │   contests/ settings/          # App Router pages
    │   ├── dashboard/components/         # Charts & widgets
    │   ├── dashboard/hooks/              # useOverview, useInsights, …
    │   ├── peers/components/             # Compare flow, overlays, leaderboard
    │   ├── components/Sidebar.jsx        # Shared nav
    │   └── lib/cf.js                     # API client helpers
    └── next.config.mjs        # /api/* → backend rewrite (proxy)
```

---

## Getting Started

### Prerequisites
- Node.js 22+
- A PostgreSQL database (local, or a free [Neon](https://neon.tech) project)
- Docker + Docker Compose (optional, for containerized run)

### 1. Backend (API + worker)

```bash
cd backend
npm install

# Configure env (see below)
cp .env.example .env    # then edit values

# Apply the schema
npx prisma migrate deploy   # or: npx prisma migrate dev

# Run the API and the worker in two terminals
node server.js              # API on :8080
node worker/syncWorker.js   # background sync worker
```

### 2. Frontend

```bash
cd frontend
npm install          # (or pnpm install)
npm run dev          # Next.js on :3000
```

Open <http://localhost:3000>.

### 3. Or run the backend with Docker Compose

```bash
cd backend
# Provide DATABASE_URL, JWT_SECRET, etc. in the environment or an .env file
docker compose up --build
```

This starts the API (`cf_api`, port 8080) and the worker (`cf_worker`). The API
runs `prisma migrate deploy` on startup.

---

## Environment Variables

### `backend/.env`
| Variable | Description | Example |
| :--- | :--- | :--- |
| `DATABASE_URL` | Postgres connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Secret for signing JWTs | `change_this_to_a_long_random_string` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `FRONTEND_URL` | Allowed CORS origin(s), comma-separated | `http://localhost:3000` |
| `NODE_ENV` | `development` / `production` | `development` |

### `frontend/.env`
| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend origin the proxy forwards to | `http://localhost:8080` |
| `NEXT_PUBLIC_URL` | Base path used by the client | `/api` |

> `.env` files are git-ignored. Never commit real secrets; rotate any secret
> that has been shared.

---

## Deployment

### Backend on AWS EC2

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install Docker
sudo apt update && sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu

# Clone and configure
git clone https://github.com/Swastik2740S/CODEFORCES_API.git
cd CODEFORCES_API/backend
nano .env                       # add DATABASE_URL, JWT_SECRET, etc.

# Start API + worker
docker compose up -d --build
```

Open port `8080` in the EC2 Security Group inbound rules. The API container runs
`prisma migrate deploy && node server.js`; the worker runs
`node worker/syncWorker.js`. Both `restart: unless-stopped`.

### Frontend on Vercel

1. Push to GitHub and import the project in [Vercel](https://vercel.com).
2. Set `NEXT_PUBLIC_API_BASE_URL` to your backend origin (e.g. `http://<ec2-ip>:8080`).
3. The `next.config.mjs` rewrite proxies `/api/*` to that origin — same-origin
   requests, no CORS headaches.

### Database

Neon serverless Postgres in production. The worker tolerates Neon's cold-start
pauses — a failed claim during wake-up is retried after a short sleep, and idle
polling backs off to 15s.

---

## Scaling & Capacity

There are **two very different ceilings**, and it's important not to conflate
them: the **read/browse path** and the **data-ingestion path**. The read path
scales like any stateless web app; the ingestion path is capped by an external
dependency we don't control — **Codeforces**.

### A. With the current compute (single EC2 + one worker + Neon)

| Dimension | Realistic ceiling | What sets the limit |
| :--- | :--- | :--- |
| **Concurrent dashboard viewers** | **~1,000–3,000** | One Node/Express instance + connection pool. Reads are pre-computed single-row lookups, so this is comfortable. |
| **Registered users kept fresh** | **~a few thousand → ~10,000** | The single worker + one Codeforces IP at **~2.5 req/s**. This is the true bottleneck. |
| **Storage** | ~2,500 users on Neon free (0.5 GB) | ~20 MB per 100 users |

**Why the read side is easy:** each dashboard load reads a pre-computed
`HandleStats` row plus a couple of indexed queries — sub-10 ms. The API is
stateless (JWT in a cookie), so nothing pins a user to a box.

**Why the sync side is the wall:** every CF call funnels through one serialized
`~2.5 req/s` limiter in one worker process. That's a hard ceiling of
`~9,000 calls/hr` in theory, `~5,000–6,000/hr` in practice after retries and
inter-page delays. An incremental re-sync costs ~3–4 calls; a first-time sync of
a 10k-submission user costs ~50 calls and monopolizes the worker for a minute+.
Because syncs are **demand-driven (a manual button, no background cron)** and
bursty, the binding constraint is queue latency during peaks — not daily totals.

### B. With company-level resources

Removing the compute limit moves the bottleneck **out of our stack and onto
Codeforces.** The architecture is already built to scale — stateless reads,
pre-computed stats, an idempotent multi-worker queue — so most of this is
deployment, not rewrites.

| Dimension | Ceiling with resources | How |
| :--- | :--- | :--- |
| **Concurrent viewers** | **Millions** | Stateless API replicas behind a load balancer + Postgres read replicas + CDN/Redis cache. No code changes needed. |
| **Users kept fresh** | **~1–4 million** | A pool of worker instances, **each on its own egress IP**, multiplying CF throughput. |
| **Storage** | Effectively unlimited | Managed Postgres (Aurora/self-hosted) with replicas; partition `Submission` by `handleId`. 10M users ≈ ~2 TB. |

**The math on ingestion.** Total throughput = *(number of distinct egress IPs)*
× *(~2–4 req/s per IP)*. A proxy/NAT fleet that Codeforces still tolerates (on
the order of **~50–200 req/s** before you look like an attack) yields:

| Sustained ingestion | CF calls/day | Users refreshed daily (~4 calls each) |
| :--- | :--- | :--- |
| 2.5 req/s (today, 1 IP) | ~200k | ~50k |
| ~50 req/s (~20-IP pool) | ~4.3M | **~1M** |
| ~100–200 req/s (large fleet) | ~8–17M | **~2–4M** |

**Two things the code already gets right for this:**
- The queue uses `FOR UPDATE SKIP LOCKED`, so you can add workers with **zero**
  double-processing.
- The rate limiter is **per-process** — which is exactly correct for a
  *one-worker-per-IP* model, where each worker self-limits against its own IP's
  budget with no distributed coordination.
- ⚠️ The one trap: **never run two workers behind the same IP** — each keeps its
  own limiter, so together they'd exceed Codeforces' per-IP limit and get the IP
  banned. Scaling requires *distinct IPs*, not just more containers.

### The real ceiling: Codeforces

> **Our code is not the limit — Codeforces is.**

No matter how much compute we buy, every byte of data comes from one
third-party site with a per-IP rate limit, run by a small team and not designed
to be a bulk data backend for someone else's product. Money buys more IPs, but
past roughly **1–4 million actively-refreshed users** you'd generate enough load
to look like a DDoS and get your IP ranges/ASN blocked. Beyond that point the
limiter is a **business relationship** (a data partnership or bulk export with
Codeforces), not a line of code we can write.

---

## Known Limitations

- **CF blocks on some ISPs** — the `user.status` endpoint may require a VPN for
  the initial sync on certain ISPs due to Cloudflare TLS fingerprinting.
- **Neon cold starts** — the free tier pauses after ~5 min idle; the first
  request after a pause takes a few seconds (handled gracefully — the worker
  retries and backs off its polling to 15s when idle).
- **No real-time sync** — data refreshes only when a sync is triggered (manual
  button or peer compare); there is no background scheduler yet.
- **Single worker container** — one sync job runs at a time, so simultaneous
  syncs queue. Job claiming uses `FOR UPDATE SKIP LOCKED`, so adding workers
  (each on a separate IP) scales this out with no code changes.

---

## Roadmap

- **Multi-IP worker fleet** — distribute workers across distinct egress IPs to
  multiply Codeforces throughput (the single biggest scaling lever).
- **Scheduled background refresh** — keep active users fresh without a manual
  sync (note: this converts bursty load into a continuous floor and pushes
  harder against the Codeforces ceiling).
- **Redis-coordinated rate limiter** — for running multiple workers per IP safely.
- **Predictive analytics** — recommend problems from a user's weak tags.
- **Team dashboards** — group comparisons beyond one-to-one peers.

---

## Authors

- **Swastik Verma** — Team Lead
- **Ujjwal Sharma**
- **Shruti Karwal**

Built as a CO-OP industry project at **Chitkara University Institute of
Engineering and Technology**, under the supervision of **Ms. Gifty Gupta**.

---

## License

Released under the **MIT License** — see [`LICENSE`](./LICENSE).

Copyright (c) 2026 Swastik Verma.
