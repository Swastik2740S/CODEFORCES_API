const prisma = require("../client");
const { verifyToken } = require("../utils/jwt");

exports.getSummary = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = verifyToken(token);

    const handle = await prisma.codeforcesHandle.findFirst({
      where: { userId, isActive: true },
      select: {
        id: true,
        handle: true,
        rating: true,
        maxRating: true,
        rank: true,
        lastSyncedAt: true,
      },
    });

    if (!handle) {
      return res.status(400).json({
        error: "No active Codeforces handle",
      });
    }

    const solved = await prisma.submission.groupBy({
      by: ["problemId"],
      where: {
        handleId: handle.id,
        verdict: "OK",
      },
    });

    res.json({
      handle: handle.handle,
      currentRating: handle.rating,
      maxRating: handle.maxRating,
      rank: handle.rank,
      problemsSolved: solved.length,
      lastUpdated: handle.lastSyncedAt,
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

exports.getFocusAreas = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = verifyToken(token);

    const handle = await prisma.codeforcesHandle.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });

    if (!handle) {
      return res.status(400).json({
        error: "No active Codeforces handle",
      });
    }

    const solved = await prisma.submission.findMany({
      where: {
        handleId: handle.id,
        verdict: "OK",
      },
      select: {
        problem: {
          select: {
            id: true,
            tags: true,
          },
        },
      },
      distinct: ["problemId"],
    });

    const tagCount = {};

    for (const s of solved) {
      for (const tag of s.problem.tags) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }

    const totalSolved = solved.length;

    const focusAreas = Object.entries(tagCount)
      .map(([tag, count]) => ({
        label: tag,
        value: Math.round((count / totalSolved) * 100),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    res.json({ focusAreas });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ✅ NEW: Activity heatmap data
exports.getActivity = async (req, res) => {
  try {
    const token = req.cookies?.access_token;
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { userId } = verifyToken(token);

    // 1️⃣ Get active handle
    const handle = await prisma.codeforcesHandle.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });

    if (!handle) {
      return res.status(400).json({ error: "No active Codeforces handle" });
    }

    // 2️⃣ Parse optional query params: ?days=365 (default 365)
    const days = parseInt(req.query.days) || 365;
    if (days < 1 || days > 730) {
      return res.status(400).json({ error: "days must be between 1 and 730" });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0); // normalize to midnight

    // 3️⃣ Fetch activity rows in range
    const rows = await prisma.activity.findMany({
      where: {
        handleId: handle.id,
        date: { gte: since },
      },
      select: {
        date: true,
        submissionCount: true,
        problemsSolved: true,
        contestsAttended: true,
      },
      orderBy: { date: "asc" },
    });

    // 4️⃣ Shape response — frontend expects { date: "YYYY-MM-DD", count: N }
    // We use submissionCount as the heatmap intensity value (most meaningful for GitHub-style heatmap)
    const activity = rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10), // "YYYY-MM-DD"
      count: r.submissionCount,
      solved: r.problemsSolved,
      contests: r.contestsAttended,
    }));

    // 5️⃣ Compute summary stats for the period
    const totalSubmissions = rows.reduce((sum, r) => sum + r.submissionCount, 0);
    const totalSolved = rows.reduce((sum, r) => sum + r.problemsSolved, 0);
    const totalContests = rows.reduce((sum, r) => sum + r.contestsAttended, 0);
    const activeDays = rows.filter((r) => r.submissionCount > 0).length;

    res.json({
      activity,
      stats: {
        totalSubmissions,
        totalSolved,
        totalContests,
        activeDays,
        days, // echo back the window used
      },
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};