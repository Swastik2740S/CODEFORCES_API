require("dotenv").config();
const prisma = require("../client");
const cf = require("../services/codeforces.service");
const { saveStats } = require("../services/stats.service");

// ── Tuning ────────────────────────────────────────────────────────────────────
const POLL_MIN_MS = 2000;        // poll interval when work was just found
const POLL_MAX_MS = 15000;       // poll interval after a long idle stretch
const FAILURE_COOLDOWN_MS = 10000; // circuit-breaker pause after any job failure
const RECOVERY_EVERY_MS = 60000; // how often to sweep for stuck jobs
const STALE_RUNNING_MIN = 5;     // running job with no heartbeat for this long = stuck
const SHADOW_SWEEP_EVERY_MS = 6 * 60 * 60 * 1000; // stale shadow-handle sweep cadence
const SHADOW_MAX_AGE_DAYS = 30;  // unfollowed shadow handles idle this long get deleted
const SUB_BATCH_SIZE = 200;      // CF user.status page size (larger payloads get reset)
const SUB_BATCH_DELAY_MS = 1200; // pause between submission pages

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Queue primitives ──────────────────────────────────────────────────────────

// Atomically claim the next runnable job. FOR UPDATE SKIP LOCKED makes this
// safe to run from any number of worker processes.
async function claimNextJob() {
  const rows = await prisma.$queryRaw`
    UPDATE "SyncJob"
    SET status = 'running',
        "startedAt" = NOW(),
        "heartbeatAt" = NOW(),
        attempts = attempts + 1
    WHERE id = (
      SELECT id FROM "SyncJob"
      WHERE status = 'pending' AND "runAfter" <= NOW()
      ORDER BY priority DESC, "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, "jobType", attempts, "maxAttempts", priority,
              "handleId", "syncSessionId"
  `;
  return rows[0] ?? null;
}

// Requeue jobs whose worker died mid-run. Without this, a crash leaves the job
// "running" forever and the owning handle can never sync again.
async function recoverStuckJobs() {
  const failed = await prisma.$executeRaw`
    UPDATE "SyncJob"
    SET status = 'failed',
        "errorMessage" = 'worker lost heartbeat; max attempts exhausted',
        "completedAt" = NOW()
    WHERE status = 'running'
      AND COALESCE("heartbeatAt", "startedAt") < NOW() - INTERVAL '1 minute' * ${STALE_RUNNING_MIN}
      AND attempts >= "maxAttempts"
  `;
  const requeued = await prisma.$executeRaw`
    UPDATE "SyncJob"
    SET status = 'pending',
        "runAfter" = NOW(),
        "errorMessage" = 'recovered after worker lost heartbeat'
    WHERE status = 'running'
      AND COALESCE("heartbeatAt", "startedAt") < NOW() - INTERVAL '1 minute' * ${STALE_RUNNING_MIN}
  `;
  if (failed > 0 || requeued > 0) {
    console.log(`🔧 Stuck-job sweep: ${requeued} requeued, ${failed} failed permanently`);
  }
}

// Shadow handles (userId NULL) that nobody follows and nobody has compared in
// SHADOW_MAX_AGE_DAYS are dead weight — every compare re-syncs its peer, so
// lastSyncedAt is a good "last used" proxy. Cascade cleans submissions,
// ratings, activity, stats and sync jobs.
async function cleanupShadowHandles() {
  const deleted = await prisma.$executeRaw`
    DELETE FROM "CodeforcesHandle" h
    WHERE h."userId" IS NULL
      AND h."lastSyncedAt" < NOW() - INTERVAL '1 day' * ${SHADOW_MAX_AGE_DAYS}
      AND NOT EXISTS (SELECT 1 FROM "Friend" f WHERE f."handleId" = h.id)
      AND NOT EXISTS (
        SELECT 1 FROM "SyncJob" j
        WHERE j."handleId" = h.id AND j.status IN ('pending', 'running')
      )
  `;
  if (deleted > 0) {
    console.log(`🧹 Shadow-handle sweep: ${deleted} stale handles removed`);
  }
}

async function heartbeat(jobId) {
  await prisma.syncJob.update({
    where: { id: jobId },
    data: { heartbeatAt: new Date() },
  });
}

// Retry backoff after a failed attempt: 1min, 4min, capped at 10min.
function backoffSeconds(attempts) {
  return Math.min(60 * attempts * attempts, 600);
}

// Queue follow-up jobs (dedup enforced by the partial unique index on
// (handleId, jobType) WHERE status IN ('pending','running') — skipDuplicates
// maps to ON CONFLICT DO NOTHING).
async function enqueueFollowUps(job, jobTypes) {
  await prisma.syncJob.createMany({
    data: jobTypes.map((jobType) => ({
      jobType,
      status: "pending",
      handleId: job.handleId,
      syncSessionId: job.syncSessionId,
      priority: job.priority,
    })),
    skipDuplicates: true,
  });
}

// ── Job handlers ──────────────────────────────────────────────────────────────

async function processJob(job) {
  const handle = await prisma.codeforcesHandle.findUnique({
    where: { id: job.handleId },
  });
  if (!handle) throw new Error("Handle not found");

  switch (job.jobType) {
    case "profile":
      return syncProfile(handle);
    case "ratings":
      return syncRatings(handle);
    case "submissions":
    case "submissions_full":
      return syncSubmissions(handle, job);
    case "activity":
      return syncActivity(handle);
    case "stats":
      return syncStats(handle);
    default:
      throw new Error(`Unknown job type: ${job.jobType}`);
  }
}

async function syncProfile(handle) {
  const profile = await cf.getUserInfo(handle.handle);
  await prisma.codeforcesHandle.update({
    where: { id: handle.id },
    data: {
      rating: profile.rating ?? null,
      maxRating: profile.maxRating ?? null,
      rank: profile.rank ?? null,
      maxRank: profile.maxRank ?? null,
      contribution: profile.contribution ?? null,
      friendOfCount: profile.friendOfCount ?? null,
      avatar: profile.avatar ?? null,
      titlePhoto: profile.titlePhoto ?? null,
      lastOnlineTime: profile.lastOnlineTimeSeconds
        ? new Date(profile.lastOnlineTimeSeconds * 1000)
        : null,
      registrationTime: profile.registrationTimeSeconds
        ? new Date(profile.registrationTimeSeconds * 1000)
        : null,
      lastSyncedAt: new Date(),
    },
  });
  return 1;
}

async function syncRatings(handle) {
  const ratings = await cf.getUserRating(handle.handle);
  if (ratings.length === 0) return 0;

  // Rating changes are immutable once published — insert-only is safe.
  const result = await prisma.ratingChange.createMany({
    data: ratings.map((r) => ({
      handleId: handle.id,
      contestId: r.contestId,
      contestName: r.contestName,
      oldRating: r.oldRating,
      newRating: r.newRating,
      ratingChange: r.newRating - r.oldRating,
      rank: r.rank,
      ratingUpdateTime: new Date(r.ratingUpdateTimeSeconds * 1000),
    })),
    skipDuplicates: true,
  });
  return result.count;
}

// ── Submissions: incremental fetch + batched writes ───────────────────────────
//
// CF returns submissions newest-first. For a normal "submissions" job we stop
// as soon as a whole page is already known (nothing created, no verdict
// changed) — everything older is guaranteed to be in the DB. A re-sync for an
// active user is therefore usually a single API call instead of a full crawl.
// "submissions_full" crawls the entire history (run occasionally to pick up
// rejudged verdicts deep in the past).

async function syncSubmissions(handle, job) {
  const fullCrawl = job.jobType === "submissions_full";
  let from = 1;
  let created = 0;
  let updated = 0;

  while (true) {
    await heartbeat(job.id);

    const submissions = await cf.getUserSubmissions(handle.handle, from, SUB_BATCH_SIZE);
    if (submissions.length === 0) break;

    const { createdCount, updatedCount } = await storeSubmissionBatch(handle, submissions);
    created += createdCount;
    updated += updatedCount;

    console.log(
      `  📦 [${handle.handle}] page from=${from}: ${submissions.length} fetched, ${createdCount} new, ${updatedCount} verdicts updated`
    );

    const pageFullyKnown = createdCount === 0 && updatedCount === 0;
    if (!fullCrawl && pageFullyKnown) break;
    if (submissions.length < SUB_BATCH_SIZE) break;

    from += SUB_BATCH_SIZE;
    await sleep(SUB_BATCH_DELAY_MS);
  }

  console.log(`  ✔ [${handle.handle}] submissions sync done: ${created} new, ${updated} updated`);
  return created + updated;
}

const problemKey = (p) =>
  p.contestId != null ? `${p.contestId}:${p.index}` : `null:${p.index}:${p.name}`;

// Ensure every problem referenced by this page exists; returns key -> id.
async function ensureProblems(problems) {
  const map = new Map();
  const withContest = new Map();
  const noContest = new Map();

  for (const p of problems) {
    const key = problemKey(p);
    if (p.contestId != null) withContest.set(key, p);
    else noContest.set(key, p);
  }

  if (withContest.size > 0) {
    const items = [...withContest.values()];
    await prisma.problem.createMany({
      data: items.map((p) => ({
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        type: p.type ?? null,
        rating: p.rating ?? null,
        tags: p.tags ?? [],
      })),
      skipDuplicates: true,
    });

    const rows = await prisma.problem.findMany({
      where: { OR: items.map((p) => ({ contestId: p.contestId, index: p.index })) },
      select: { id: true, contestId: true, index: true, rating: true },
    });

    for (const row of rows) {
      const key = `${row.contestId}:${row.index}`;
      map.set(key, row.id);
      // Problems synced before CF assigned them a rating stay unrated forever
      // unless we backfill it when it appears.
      const fetched = withContest.get(key);
      if (fetched && row.rating == null && fetched.rating != null) {
        await prisma.problem.update({
          where: { id: row.id },
          data: { rating: fetched.rating, tags: fetched.tags ?? [] },
        });
      }
    }
  }

  // Rare: problems without a contestId (old problemsets). NULL never matches a
  // unique constraint in Postgres, so these need an explicit find-or-create
  // keyed on (index, name).
  for (const p of noContest.values()) {
    let row = await prisma.problem.findFirst({
      where: { contestId: null, index: p.index, name: p.name },
      select: { id: true },
    });
    if (!row) {
      row = await prisma.problem.create({
        data: {
          contestId: null,
          index: p.index,
          name: p.name,
          type: p.type ?? null,
          rating: p.rating ?? null,
          tags: p.tags ?? [],
        },
        select: { id: true },
      });
    }
    map.set(problemKey(p), row.id);
  }

  return map;
}

async function storeSubmissionBatch(handle, submissions) {
  const problemIds = await ensureProblems(submissions.map((s) => s.problem));

  const existing = await prisma.submission.findMany({
    where: { submissionId: { in: submissions.map((s) => s.id) } },
    select: { submissionId: true, verdict: true },
  });
  const existingVerdicts = new Map(existing.map((e) => [e.submissionId, e.verdict]));

  const toCreate = [];
  const toUpdate = [];

  for (const s of submissions) {
    const problemId = problemIds.get(problemKey(s.problem));
    if (!problemId) continue;

    const verdict = s.verdict ?? null;

    if (!existingVerdicts.has(s.id)) {
      toCreate.push({
        submissionId: s.id,
        handleId: handle.id,
        problemId,
        contestId: s.contestId ?? null,
        verdict,
        testset: s.testset ?? null,
        passedTestCount: s.passedTestCount ?? null,
        timeConsumedMillis: s.timeConsumedMillis ?? null,
        programmingLanguage: s.programmingLanguage ?? null,
        creationTime: new Date(s.creationTimeSeconds * 1000),
        relativeTimeSeconds:
          s.relativeTimeSeconds != null && s.relativeTimeSeconds < 2147483647
            ? s.relativeTimeSeconds
            : null,
      });
    } else if (existingVerdicts.get(s.id) !== verdict) {
      // Submission was still judging (or got rejudged) — record final verdict.
      toUpdate.push({ id: s.id, verdict, passedTestCount: s.passedTestCount ?? null });
    }
  }

  if (toCreate.length > 0) {
    await prisma.submission.createMany({ data: toCreate, skipDuplicates: true });
  }
  for (const u of toUpdate) {
    await prisma.submission.update({
      where: { submissionId: u.id },
      data: {
        verdict: u.verdict,
        passedTestCount: u.passedTestCount,
        lastSyncedAt: new Date(),
      },
    });
  }

  return { createdCount: toCreate.length, updatedCount: toUpdate.length };
}

// ── Activity aggregation ──────────────────────────────────────────────────────

async function syncActivity(handle) {
  const submissions = await prisma.submission.findMany({
    where: { handleId: handle.id },
    select: { creationTime: true, verdict: true, problemId: true },
  });

  const participations = await prisma.contestParticipation.findMany({
    where: { handleId: handle.id },
    select: { participatedAt: true },
  });

  const dayMap = {};
  const toDateKey = (dt) => dt.toISOString().slice(0, 10);

  for (const s of submissions) {
    const key = toDateKey(s.creationTime);
    if (!dayMap[key]) {
      dayMap[key] = { submissionCount: 0, solvedProblemIds: new Set(), contestsAttended: 0 };
    }
    dayMap[key].submissionCount += 1;
    if (s.verdict === "OK") dayMap[key].solvedProblemIds.add(s.problemId);
  }

  for (const p of participations) {
    const key = toDateKey(p.participatedAt);
    if (!dayMap[key]) {
      dayMap[key] = { submissionCount: 0, solvedProblemIds: new Set(), contestsAttended: 0 };
    }
    dayMap[key].contestsAttended += 1;
  }

  const rows = Object.entries(dayMap).map(([dateKey, data]) => ({
    handleId: handle.id,
    date: new Date(dateKey),
    submissionCount: data.submissionCount,
    problemsSolved: data.solvedProblemIds.size,
    contestsAttended: data.contestsAttended,
  }));

  // Rebuild atomically: readers never observe a half-written heatmap.
  await prisma.$transaction([
    prisma.activity.deleteMany({ where: { handleId: handle.id } }),
    prisma.activity.createMany({ data: rows }),
  ]);

  console.log(`  📅 [${handle.handle}] activity rebuilt: ${rows.length} days`);
  return rows.length;
}

async function syncStats(handle) {
  const stats = await saveStats(handle.id);
  console.log(
    `  📊 [${handle.handle}] stats recomputed: ${stats.problemsSolved} solved / ${stats.totalSubmissions} submissions`
  );
  return stats.totalSubmissions;
}

// ── Main loop ─────────────────────────────────────────────────────────────────

let shuttingDown = false;

async function runWorker() {
  console.log("🚀 Sync Worker started");

  let idleDelay = POLL_MIN_MS;
  let lastRecovery = 0;
  let lastShadowSweep = 0;

  while (!shuttingDown) {
    // Stuck-job sweep (also runs once at startup)
    if (Date.now() - lastRecovery > RECOVERY_EVERY_MS) {
      lastRecovery = Date.now();
      try {
        await recoverStuckJobs();
      } catch (err) {
        console.warn(`⚠️  Stuck-job sweep failed: ${err.message}`);
      }
    }

    // Stale shadow-handle sweep (also runs once at startup)
    if (Date.now() - lastShadowSweep > SHADOW_SWEEP_EVERY_MS) {
      lastShadowSweep = Date.now();
      try {
        await cleanupShadowHandles();
      } catch (err) {
        console.warn(`⚠️  Shadow-handle sweep failed: ${err.message}`);
      }
    }

    // Neon free tier pauses after inactivity; a claim during wake-up throws.
    // On a fresh deploy this also covers the window where the api container
    // is still running `prisma migrate deploy` (new columns don't exist yet).
    let job;
    try {
      job = await claimNextJob();
    } catch (dbErr) {
      const migrating = /does not exist/i.test(dbErr.message);
      console.warn(
        migrating
          ? "⏳ Schema not ready (migrations still applying?) — retrying in 5s"
          : `⚠️  DB unreachable (waking up?): ${dbErr.message}`
      );
      await sleep(5000);
      continue;
    }

    if (!job) {
      await sleep(idleDelay);
      idleDelay = Math.min(Math.round(idleDelay * 1.5), POLL_MAX_MS);
      continue;
    }
    idleDelay = POLL_MIN_MS;

    try {
      const recordsProcessed = await processJob(job);

      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          recordsProcessed: recordsProcessed ?? null,
          errorMessage: null,
        },
      });

      // After submissions land, refresh the derived tables.
      if (job.jobType === "submissions" || job.jobType === "submissions_full") {
        await enqueueFollowUps(job, ["activity", "stats"]);
      }

      console.log(`✅ Job ${job.id} (${job.jobType}) completed`);
    } catch (err) {
      const isNetworkErr = ["ECONNRESET", "ETIMEDOUT", "ECONNREFUSED", "ENOTFOUND"].includes(err.code);
      console.error(
        `❌ Job ${job.id} (${job.jobType}) attempt ${job.attempts}/${job.maxAttempts} failed: ${
          isNetworkErr ? `network error: ${err.message}` : err.message
        }`
      );

      const willRetry = job.attempts < job.maxAttempts;
      const delay = backoffSeconds(job.attempts);

      // If even this bookkeeping write fails (DB hiccup), never crash the
      // loop — the stuck-job sweep will requeue the orphaned "running" row.
      try {
        await prisma.syncJob.update({
          where: { id: job.id },
          data: willRetry
            ? {
                status: "pending",
                runAfter: new Date(Date.now() + delay * 1000),
                errorMessage: err.message,
              }
            : {
                status: "failed",
                errorMessage: err.message,
                completedAt: new Date(),
              },
        });
        if (willRetry) {
          console.log(`🔁 Requeued (attempt ${job.attempts + 1}/${job.maxAttempts}) in ${delay}s`);
        }
      } catch (updateErr) {
        console.error(`⚠️  Failed to record job failure: ${updateErr.message}`);
      }

      console.log(`⏳ Cooling down ${FAILURE_COOLDOWN_MS / 1000}s after failure...`);
      await sleep(FAILURE_COOLDOWN_MS);
    }
  }

  await prisma.$disconnect();
  console.log("👋 Worker stopped");
}

function requestShutdown(signal) {
  console.log(`\n${signal} received — finishing current job then stopping...`);
  shuttingDown = true;
}
process.on("SIGINT", () => requestShutdown("SIGINT"));
process.on("SIGTERM", () => requestShutdown("SIGTERM"));

runWorker();
