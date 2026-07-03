const prisma = require("../client");
const cfService = require("../services/codeforces.service");

// Upcoming contests come from one CF contest.list call, cached in-process —
// the list only changes when Codeforces schedules a round, so a 30 minute TTL
// costs nothing in freshness. Past results are pure DB reads (RatingChange).

const UPCOMING_TTL_MS = 30 * 60 * 1000;
let upcomingCache = { at: 0, data: null };

function serverError(res, err, label) {
  console.error(`[contests] ${label}:`, err);
  return res.status(500).json({ error: "Internal server error" });
}

// ── GET /api/contests/upcoming ────────────────────────────────────────────────
exports.upcoming = async (req, res) => {
  try {
    if (!upcomingCache.data || Date.now() - upcomingCache.at > UPCOMING_TTL_MS) {
      const list = await cfService.getContestList();
      const data = list
        .filter((c) => c.phase === "BEFORE" && c.startTimeSeconds)
        .sort((a, b) => a.startTimeSeconds - b.startTimeSeconds)
        .map((c) => ({
          contestId: c.id,
          name: c.name,
          type: c.type,
          startTime: new Date(c.startTimeSeconds * 1000),
          durationSeconds: c.durationSeconds,
          url: `https://codeforces.com/contests/${c.id}`,
        }));
      upcomingCache = { at: Date.now(), data };
    }

    res.set("Cache-Control", "private, max-age=300");
    res.json({
      contests: upcomingCache.data,
      fetchedAt: new Date(upcomingCache.at),
    });
  } catch (err) {
    // Serve a stale cache over an error if CF is down.
    if (upcomingCache.data) {
      return res.json({
        contests: upcomingCache.data,
        fetchedAt: new Date(upcomingCache.at),
        stale: true,
      });
    }
    serverError(res, err, "upcoming");
  }
};

// ── GET /api/contests/history ─────────────────────────────────────────────────
// The user's full rated-contest history (the dashboard endpoint caps at 50).
exports.history = async (req, res) => {
  try {
    const me = await prisma.codeforcesHandle.findFirst({
      where: { userId: req.userId, isActive: true },
      select: { id: true, handle: true },
    });
    if (!me) return res.status(400).json({ error: "No active Codeforces handle" });

    const rows = await prisma.ratingChange.findMany({
      where: { handleId: me.id },
      orderBy: { ratingUpdateTime: "desc" },
      select: {
        contestId: true,
        contestName: true,
        rank: true,
        oldRating: true,
        newRating: true,
        ratingChange: true,
        ratingUpdateTime: true,
      },
    });

    res.set("Cache-Control", "private, no-cache");
    res.json({
      handle: me.handle,
      contests: rows.map((r) => ({
        contestId: r.contestId,
        contestName: r.contestName,
        rank: r.rank,
        oldRating: r.oldRating,
        newRating: r.newRating,
        ratingChange: r.ratingChange,
        date: r.ratingUpdateTime,
        url: `https://codeforces.com/contest/${r.contestId}`,
      })),
    });
  } catch (err) {
    serverError(res, err, "history");
  }
};
