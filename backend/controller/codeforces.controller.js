const prisma = require("../client");
const { verifyToken } = require("../utils/jwt");
const cfService = require("../services/codeforces.service");

exports.linkHandle = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = verifyToken(token);
    const { handle } = req.body;

    if (!handle) {
      return res.status(400).json({ error: "Handle is required" });
    }

    // Check if handle already exists globally
    const existingHandle = await prisma.codeforcesHandle.findUnique({
      where: { handle },
    });

    if (existingHandle) {
      return res.status(409).json({ error: "Handle already linked" });
    }

    // Verify from Codeforces
    const cfUser = await cfService.getUserInfo(handle);

    // Deactivate old handles (Phase-1 behavior)
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

    res.status(201).json(newHandle);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

exports.getHandles = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

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
      orderBy: [
        { isActive: "desc" }, // active first
        { lastSyncedAt: "desc" },
      ],
    });

    const active = handles.find((h) => h.isActive) || null;
    const others = handles.filter((h) => !h.isActive);

    res.json({ active, others });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

exports.createSyncJob = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    const { userId } = verifyToken(token);

    const activeHandle = await prisma.codeforcesHandle.findFirst({
      where: { userId, isActive: true },
    });

    if (!activeHandle) {
      return res.status(400).json({ error: "No active handle" });
    }

    const running = await prisma.syncJob.findFirst({
      where: {
        handleId: activeHandle.id,
        status: { in: ["pending", "running"] },
      },
    });

    if (running) {
      return res.status(409).json({ error: "Sync already running" });
    }

    await prisma.syncJob.createMany({
      data: [
        { jobType: "profile", handleId: activeHandle.id, status: "pending" },
        { jobType: "ratings", handleId: activeHandle.id, status: "pending" },
        { jobType: "submissions", handleId: activeHandle.id, status: "pending" },
      ],
    });

    res.status(201).json({ message: "Sync started" });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};


exports.getSyncJobStatus = async (req, res) => {
  try {
    // 1️⃣ Auth
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = verifyToken(token);
    const { jobId } = req.params;

    // 2️⃣ Fetch job and ensure ownership
    const job = await prisma.syncJob.findUnique({
      where: { id: jobId },
      include: {
        handle: {
          select: {
            userId: true,
            handle: true,
          },
        },
      },
    });

    if (!job || job.handle.userId !== userId) {
      return res.status(404).json({ error: "Job not found" });
    }

    // 3️⃣ Respond with status
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

exports.getRatingGraph = async (req, res) => {
  try {
    // 1️⃣ Auth
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = verifyToken(token);

    // 2️⃣ Get active handle
    const handle = await prisma.codeforcesHandle.findFirst({
      where: {
        userId,
        isActive: true,
      },
      select: {
        id: true,
        handle: true,
      },
    });

    if (!handle) {
      return res.status(400).json({
        error: "No active Codeforces handle linked",
      });
    }

    // 3️⃣ Fetch rating history
    const ratings = await prisma.ratingChange.findMany({
      where: {
        handleId: handle.id,
      },
      select: {
        contestId: true,
        contestName: true,
        newRating: true,
        rank: true,
        ratingUpdateTime: true,
      },
      orderBy: {
        ratingUpdateTime: "asc",
      },
    });

    // 4️⃣ Shape response
    const points = ratings.map((r) => ({
      contestId: r.contestId,
      contestName: r.contestName,
      rating: r.newRating,
      rank: r.rank,
      time: r.ratingUpdateTime,
    }));

    res.json({
      handle: handle.handle,
      points,
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
