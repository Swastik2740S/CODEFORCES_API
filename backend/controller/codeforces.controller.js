const prisma = require("../client");
const { verifyToken } = require("../utils/jwt");
const cfService = require("../services/codeforces.service");

// ── Shared auth helper ────────────────────────────────────────────────────────
function getUserId(req) {
  const token = req.cookies?.access_token;
  if (!token) return null;
  try {
    return verifyToken(token).userId;
  } catch {
    return null;
  }
}

// ── POST /api/codeforces/link-handle ─────────────────────────────────────────
exports.linkHandle = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = verifyToken(token);
    const { handle } = req.body;

    if (!handle) return res.status(400).json({ error: "Handle is required" });

    // Check if handle already exists globally
    const existingHandle = await prisma.codeforcesHandle.findUnique({
      where: { handle },
    });

    if (existingHandle) {
      return res.status(409).json({ error: "Handle already linked" });
    }

    // Verify handle exists on Codeforces
    const cfUser = await cfService.getUserInfo(handle);

    // Deactivate old handles
    await prisma.codeforcesHandle.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    // Create new active handle
    const newHandle = await prisma.codeforcesHandle.create({
      data: {
        handle: cfUser.handle,
        rating: cfUser.rating,
        maxRating: cfUser.maxRating,
        rank: cfUser.rank,
        maxRank: cfUser.maxRank,
        userId,
        isActive: true,
      },
    });

    res.status(201).json({ handle: newHandle });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

// ── GET /api/codeforces/handles ───────────────────────────────────────────────
exports.getHandles = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = verifyToken(token);

    const handles = await prisma.codeforcesHandle.findMany({
      where: { userId },
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
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ── POST /api/codeforces/sync ─────────────────────────────────────────────────
exports.createSyncJob = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = verifyToken(token);

    const activeHandle = await prisma.codeforcesHandle.findFirst({
      where: { userId, isActive: true },
    });

    if (!activeHandle) return res.status(400).json({ error: "No active handle" });

    const running = await prisma.syncJob.findFirst({
      where: {
        handleId: activeHandle.id,
        status: { in: ["pending", "running"] },
      },
    });

    if (running) return res.status(409).json({ error: "Sync already running" });

    await prisma.syncJob.createMany({
      data: [
        { jobType: "profile",     handleId: activeHandle.id, status: "pending" },
        { jobType: "ratings",     handleId: activeHandle.id, status: "pending" },
        { jobType: "submissions", handleId: activeHandle.id, status: "pending" },
      ],
    });

    res.status(201).json({ message: "Sync started" });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ── GET /api/codeforces/sync/:jobId ──────────────────────────────────────────
exports.getSyncJobStatus = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = verifyToken(token);
    const { jobId } = req.params;

    const job = await prisma.syncJob.findUnique({
      where: { id: jobId },
      include: { handle: { select: { userId: true, handle: true } } },
    });

    if (!job || job.handle.userId !== userId) {
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
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ── GET /api/codeforces/rating-graph ─────────────────────────────────────────
exports.getRatingGraph = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = verifyToken(token);

    const handle = await prisma.codeforcesHandle.findFirst({
      where: { userId, isActive: true },
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
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ── PATCH /api/codeforces/handle/:id/activate ────────────────────────────────
// Sets a specific handle as active, deactivates all others for this user
exports.activateHandle = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    // Verify this handle belongs to the user
    const handle = await prisma.codeforcesHandle.findFirst({
      where: { id, userId },
    });

    if (!handle) return res.status(404).json({ error: "Handle not found" });
    if (handle.isActive) return res.json({ message: "Already active" });

    // Deactivate all, then activate the chosen one
    await prisma.codeforcesHandle.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    const updated = await prisma.codeforcesHandle.update({
      where: { id },
      data: { isActive: true },
      select: { id: true, handle: true, rating: true, rank: true, isActive: true },
    });

    res.json({ handle: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to activate handle" });
  }
};

// ── DELETE /api/codeforces/handle/:id ────────────────────────────────────────
// Removes a handle — cannot delete the active handle
exports.removeHandle = async (req, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { id } = req.params;

    // Verify ownership
    const handle = await prisma.codeforcesHandle.findFirst({
      where: { id, userId },
    });

    if (!handle) return res.status(404).json({ error: "Handle not found" });

    // Block deleting the active handle — user must set another as active first
    if (handle.isActive) {
      return res.status(400).json({
        error: "Cannot delete the active handle. Set another handle as active first.",
      });
    }

    // Cascade deletes submissions, ratings, activity, syncJobs via Prisma schema
    await prisma.codeforcesHandle.delete({ where: { id } });

    res.json({ message: `Handle ${handle.handle} removed successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove handle" });
  }
};