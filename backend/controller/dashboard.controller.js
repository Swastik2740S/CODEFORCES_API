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

    // ✅ Correct & Prisma-safe solution
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

    // 1️⃣ Get active handle
    const handle = await prisma.codeforcesHandle.findFirst({
      where: { userId, isActive: true },
      select: { id: true },
    });

    if (!handle) {
      return res.status(400).json({
        error: "No active Codeforces handle",
      });
    }

    // 2️⃣ Fetch solved submissions with problems
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
      distinct: ["problemId"], // distinct problems
    });

    // 3️⃣ Aggregate tags
    const tagCount = {};

    for (const s of solved) {
      for (const tag of s.problem.tags) {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      }
    }

    const totalSolved = solved.length;

    // 4️⃣ Convert to percentages
    const focusAreas = Object.entries(tagCount)
      .map(([tag, count]) => ({
        label: tag,
        value: Math.round((count / totalSolved) * 100),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6); // top 6

    res.json({ focusAreas });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

