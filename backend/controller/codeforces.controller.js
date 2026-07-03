const crypto = require("crypto");
const prisma = require("../client");
const cfService = require("../services/codeforces.service");

// Auth is handled by auth.middleware.js (sets req.userId).

// A user-triggered sync creates this chain of jobs under one syncSessionId.
// activity + stats are auto-queued by the worker after submissions completes.
const SESSION_JOB_TYPES = ["profile", "ratings", "submissions"];
const USER_SYNC_PRIORITY = 10; // user is watching a progress bar — jump the queue

// Stage weights for a monotonic progress bar across the whole session.
const STAGE_WEIGHT = {
  profile: 10,
  ratings: 25,
  submissions: 75,
  submissions_full: 75,
  activity: 90,
  stats: 100,
};

function serverError(res, err, label) {
  console.error(`[codeforces] ${label}:`, err);
  return res.status(500).json({ error: "Internal server error" });
}

// ── POST /api/codeforces/link-handle ─────────────────────────────────────────
exports.linkHandle = async (req, res) => {
  try {
    const handleInput = (req.body?.handle ?? "").trim();
    if (!handleInput) return res.status(400).json({ error: "Handle is required" });

    const existingHandle = await prisma.codeforcesHandle.findUnique({
      where: { handle: handleInput },
    });

    if (existingHandle) {
      if (existingHandle.userId !== req.userId) {
        return res.status(409).json({ error: "Handle already linked by another account" });
      }
      // Re-linking your own handle just re-activates it.
      await prisma.codeforcesHandle.updateMany({
        where: { userId: req.userId, isActive: true },
        data: { isActive: false },
      });
      const reactivated = await prisma.codeforcesHandle.update({
        where: { id: existingHandle.id },
        data: { isActive: true },
      });
      return res.status(200).json({ handle: reactivated });
    }

    // Verify the handle exists on Codeforces. This is the one deliberate CF
    // call made from the API process — a single user.info request per link.
    let cfUser;
    try {
      cfUser = await cfService.getUserInfo(handleInput);
    } catch (err) {
      return res.status(400).json({ error: `Codeforces handle verification failed: ${err.message}` });
    }

    await prisma.codeforcesHandle.updateMany({
      where: { userId: req.userId, isActive: true },
      data: { isActive: false },
    });

    const newHandle = await prisma.codeforcesHandle.create({
      data: {
        handle: cfUser.handle,
        rating: cfUser.rating,
        maxRating: cfUser.maxRating,
        rank: cfUser.rank,
        maxRank: cfUser.maxRank,
        userId: req.userId,
        isActive: true,
      },
    });

    res.status(201).json({ handle: newHandle });
  } catch (err) {
    serverError(res, err, "link-handle");
  }
};

// ── GET /api/codeforces/handles ───────────────────────────────────────────────
exports.getHandles = async (req, res) => {
  try {
    const handles = await prisma.codeforcesHandle.findMany({
      where: { userId: req.userId },
      select: {
        id: true,
        handle: true,
        rating: true,
        maxRating: true,
        rank: true,
        maxRank: true,
        isActive: true,
        lastSyncedAt: true,
      },
      orderBy: [{ isActive: "desc" }, { lastSyncedAt: "desc" }],
    });

    const active = handles.find((h) => h.isActive) || null;
    const others = handles.filter((h) => !h.isActive);

    res.json({ active, others });
  } catch (err) {
    serverError(res, err, "handles");
  }
};

// ── POST /api/codeforces/sync ─────────────────────────────────────────────────
exports.createSyncJob = async (req, res) => {
  try {
    const activeHandle = await prisma.codeforcesHandle.findFirst({
      where: { userId: req.userId, isActive: true },
    });

    if (!activeHandle) return res.status(400).json({ error: "No active handle" });

    // If a sync is already in flight, hand back its session so the client can
    // resume polling instead of erroring out.
    const running = await prisma.syncJob.findFirst({
      where: {
        handleId: activeHandle.id,
        status: { in: ["pending", "running"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (running) {
      return res.status(409).json({
        error: "Sync already running",
        sessionId: running.syncSessionId,
      });
    }

    const sessionId = crypto.randomUUID();

    // skipDuplicates + the partial unique index on (handleId, jobType) for
    // active jobs makes this race-safe: concurrent triggers can't double-queue.
    await prisma.syncJob.createMany({
      data: SESSION_JOB_TYPES.map((jobType) => ({
        jobType,
        status: "pending",
        handleId: activeHandle.id,
        syncSessionId: sessionId,
        priority: USER_SYNC_PRIORITY,
      })),
      skipDuplicates: true,
    });

    const firstJob = await prisma.syncJob.findFirst({
      where: { syncSessionId: sessionId },
      orderBy: { createdAt: "asc" },
    });

    res.status(201).json({
      message: "Sync started",
      sessionId,
      jobId: firstJob?.id, // legacy clients poll a single job
    });
  } catch (err) {
    serverError(res, err, "sync");
  }
};

// ── GET /api/codeforces/sync/session/:sessionId ──────────────────────────────
// Aggregate progress for every job in a sync session (including the activity
// and stats jobs the worker auto-queues after submissions).
exports.getSyncSessionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const jobs = await prisma.syncJob.findMany({
      where: { syncSessionId: sessionId },
      include: { handle: { select: { userId: true, handle: true } } },
      orderBy: { createdAt: "asc" },
    });

    // Shadow-handle (peer) sessions have no owner — any authenticated user may
    // poll them. Sessions for another user's OWN handle stay hidden.
    const foreign = jobs.some(
      (j) => j.handle?.userId != null && j.handle.userId !== req.userId
    );
    if (jobs.length === 0 || foreign) {
      return res.status(404).json({ error: "Sync session not found" });
    }

    const failed = jobs.find((j) => j.status === "failed");
    const active = jobs.find((j) => j.status === "running") ??
                   jobs.filter((j) => j.status === "pending")
                       .sort((a, b) => (STAGE_WEIGHT[a.jobType] ?? 0) - (STAGE_WEIGHT[b.jobType] ?? 0))[0];

    const completedWeights = jobs
      .filter((j) => j.status === "completed")
      .map((j) => STAGE_WEIGHT[j.jobType] ?? 0);

    let status = "running";
    if (failed) status = "failed";
    else if (!active) status = "completed";

    const progress =
      status === "completed" ? 100 : Math.max(5, ...completedWeights, 0);

    res.json({
      sessionId,
      handle: jobs[0].handle?.handle,
      status,
      progress,
      currentStage: active?.jobType ?? null,
      errorMessage: failed?.errorMessage ?? null,
      recordsProcessed: jobs.reduce((s, j) => s + (j.recordsProcessed ?? 0), 0),
      jobs: jobs.map((j) => ({
        id: j.id,
        jobType: j.jobType,
        status: j.status,
        attempts: j.attempts,
        recordsProcessed: j.recordsProcessed,
        errorMessage: j.errorMessage,
      })),
    });
  } catch (err) {
    serverError(res, err, "sync-session");
  }
};

// ── GET /api/codeforces/sync/:jobId (legacy single-job polling) ──────────────
exports.getSyncJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;

    const job = await prisma.syncJob.findUnique({
      where: { id: jobId },
      include: { handle: { select: { userId: true, handle: true } } },
    });

    if (!job || job.handle?.userId !== req.userId) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({
      id: job.id,
      jobType: job.jobType,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
      handle: job.handle.handle,
    });
  } catch (err) {
    serverError(res, err, "sync-status");
  }
};

// ── GET /api/codeforces/rating-graph ─────────────────────────────────────────
exports.getRatingGraph = async (req, res) => {
  try {
    const handle = await prisma.codeforcesHandle.findFirst({
      where: { userId: req.userId, isActive: true },
      select: { id: true, handle: true },
    });

    if (!handle) return res.status(400).json({ error: "No active Codeforces handle linked" });

    const ratings = await prisma.ratingChange.findMany({
      where: { handleId: handle.id },
      select: {
        contestId: true,
        contestName: true,
        newRating: true,
        rank: true,
        ratingUpdateTime: true,
      },
      orderBy: { ratingUpdateTime: "asc" },
    });

    const points = ratings.map((r) => ({
      contestId:   r.contestId,
      contestName: r.contestName,
      rating:      r.newRating,
      rank:        r.rank,
      time:        r.ratingUpdateTime,
    }));

    res.json({ handle: handle.handle, points });
  } catch (err) {
    serverError(res, err, "rating-graph");
  }
};

// ── PATCH /api/codeforces/handle/:id/activate ────────────────────────────────
exports.activateHandle = async (req, res) => {
  try {
    const { id } = req.params;

    const handle = await prisma.codeforcesHandle.findFirst({
      where: { id, userId: req.userId },
    });

    if (!handle) return res.status(404).json({ error: "Handle not found" });
    if (handle.isActive) return res.json({ message: "Already active" });

    await prisma.codeforcesHandle.updateMany({
      where: { userId: req.userId, isActive: true },
      data: { isActive: false },
    });

    const updated = await prisma.codeforcesHandle.update({
      where: { id },
      data: { isActive: true },
      select: { id: true, handle: true, rating: true, rank: true, isActive: true },
    });

    res.json({ handle: updated });
  } catch (err) {
    serverError(res, err, "activate-handle");
  }
};

// ── DELETE /api/codeforces/handle/:id ────────────────────────────────────────
exports.removeHandle = async (req, res) => {
  try {
    const { id } = req.params;

    const handle = await prisma.codeforcesHandle.findFirst({
      where: { id, userId: req.userId },
    });

    if (!handle) return res.status(404).json({ error: "Handle not found" });

    if (handle.isActive) {
      return res.status(400).json({
        error: "Cannot delete the active handle. Set another handle as active first.",
      });
    }

    // Cascade deletes submissions, ratings, activity, stats, syncJobs
    await prisma.codeforcesHandle.delete({ where: { id } });

    res.json({ message: `Handle ${handle.handle} removed successfully` });
  } catch (err) {
    serverError(res, err, "remove-handle");
  }
};
