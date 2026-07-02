const prisma = require("../client");
const { getStats } = require("../services/stats.service");

// Auth is handled by auth.middleware.js (sets req.userId). Controllers here
// only resolve the active handle and read precomputed data — heavy
// aggregation happens in the worker's "stats" job, not on the request path.

async function getActiveHandle(req, selectFields = { id: true }) {
  const handle = await prisma.codeforcesHandle.findFirst({
    where: { userId: req.userId, isActive: true },
    select: selectFields,
  });
  return handle;
}

function serverError(res, err, label) {
  console.error(`[dashboard] ${label}:`, err);
  return res.status(500).json({ error: "Internal server error" });
}

const NO_HANDLE = { error: "No active Codeforces handle" };

// ── Response builders (shared by individual endpoints and /overview) ─────────

function buildSummary(handle, stats) {
  return {
    handle: handle.handle,
    currentRating: handle.rating,
    maxRating: handle.maxRating,
    rank: handle.rank,
    problemsSolved: stats.problemsSolved,
    lastUpdated: handle.lastSyncedAt,
  };
}

function buildVerdictStats(stats) {
  return {
    verdicts: stats.verdictCounts ?? [],
    total: stats.totalSubmissions,
    acceptanceRate: stats.acceptanceRate,
  };
}

function buildLanguageStats(stats) {
  return {
    languages: stats.languageCounts ?? [],
    total: stats.totalSubmissions,
  };
}

function buildDifficultyStats(stats) {
  return {
    distribution: stats.difficultyDist ?? [],
    totalSolved: stats.problemsSolved,
  };
}

function buildAttemptsStats(stats) {
  return {
    totalProblems: stats.problemsAttempted,
    totalSolved: stats.problemsSolved,
    totalUnsolved: stats.problemsAttempted - stats.problemsSolved,
    overallAccRate: stats.overallAccRate,
    avgAttemptsToSolve: stats.avgAttemptsToSolve,
    firstTrySolves: stats.firstTrySolves,
    firstTryRate: stats.firstTryRate,
    hardestSolved: stats.hardestSolved ?? null,
    hardestUnsolved: stats.hardestUnsolved ?? null,
  };
}

function buildTagMastery(stats) {
  const tagMastery = stats.tagMastery ?? [];
  return { tagMastery, totalTags: tagMastery.length };
}

function buildContestExtremes(stats) {
  const cs = stats.contestStats;
  if (!cs || cs.totalContests === 0) {
    return { message: "No contest data yet", extremes: null };
  }
  return {
    totalContests: cs.totalContests,
    currentStreak: cs.currentStreak,
    bestStreak: cs.bestStreak,
    extremes: cs.extremes,
  };
}

async function fetchContests(handleId, limit) {
  const ratingChanges = await prisma.ratingChange.findMany({
    where: { handleId },
    orderBy: { ratingUpdateTime: "desc" },
    take: limit,
  });
  const contests = ratingChanges.map((r) => ({
    contestId: r.contestId,
    contestName: r.contestName,
    date: r.ratingUpdateTime,
    rank: r.rank,
    oldRating: r.oldRating,
    newRating: r.newRating,
    ratingChange: r.ratingChange,
    result: r.ratingChange >= 0 ? "gain" : "drop",
  }));
  return { contests, total: contests.length };
}

async function fetchRatingHistory(handleId) {
  const history = await prisma.ratingChange.findMany({
    where: { handleId },
    orderBy: { ratingUpdateTime: "asc" },
    select: {
      contestId: true,
      contestName: true,
      oldRating: true,
      newRating: true,
      ratingChange: true,
      rank: true,
      ratingUpdateTime: true,
    },
  });
  return {
    ratingHistory: history.map((r) => ({
      contestId: r.contestId,
      contestName: r.contestName,
      date: r.ratingUpdateTime,
      rating: r.newRating,
      oldRating: r.oldRating,
      ratingChange: r.ratingChange,
      rank: r.rank,
    })),
  };
}

// ── GET /api/dashboard/overview ───────────────────────────────────────────────
// Everything the dashboard needs in one request: one auth check, one handle
// lookup, one stats row, two indexed RatingChange reads — instead of the
// eleven separate round trips the frontend used to make.
exports.getOverview = async (req, res) => {
  try {
    const handle = await getActiveHandle(req, {
      id: true, handle: true, rating: true,
      maxRating: true, rank: true, lastSyncedAt: true,
    });
    if (!handle) return res.status(400).json(NO_HANDLE);

    const limit = Math.min(parseInt(req.query.contestLimit) || 50, 50);

    const [stats, contests, ratingHistory] = await Promise.all([
      getStats(handle.id),
      fetchContests(handle.id, limit),
      fetchRatingHistory(handle.id),
    ]);

    res.json({
      summary: buildSummary(handle, stats),
      focusAreas: { focusAreas: stats.focusAreas ?? [] },
      contests,
      ratingHistory,
      verdictStats: buildVerdictStats(stats),
      languageStats: buildLanguageStats(stats),
      difficultyStats: buildDifficultyStats(stats),
      attemptsStats: buildAttemptsStats(stats),
      tagMastery: buildTagMastery(stats),
      contestExtremes: buildContestExtremes(stats),
    });
  } catch (err) {
    serverError(res, err, "overview");
  }
};

// ── Individual endpoints (kept for compatibility) ─────────────────────────────

exports.getSummary = async (req, res) => {
  try {
    const handle = await getActiveHandle(req, {
      id: true, handle: true, rating: true,
      maxRating: true, rank: true, lastSyncedAt: true,
    });
    if (!handle) return res.status(400).json(NO_HANDLE);

    const stats = await getStats(handle.id);
    res.json(buildSummary(handle, stats));
  } catch (err) {
    serverError(res, err, "summary");
  }
};

exports.getFocusAreas = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    const stats = await getStats(handle.id);
    res.json({ focusAreas: stats.focusAreas ?? [] });
  } catch (err) {
    serverError(res, err, "focus-areas");
  }
};

exports.getActivity = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    const days = parseInt(req.query.days) || 365;
    if (days < 1 || days > 730) {
      return res.status(400).json({ error: "days must be between 1 and 730" });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const rows = await prisma.activity.findMany({
      where: { handleId: handle.id, date: { gte: since } },
      select: {
        date: true,
        submissionCount: true,
        problemsSolved: true,
        contestsAttended: true,
      },
      orderBy: { date: "asc" },
    });

    const activity = rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      count: r.submissionCount,
      solved: r.problemsSolved,
      contests: r.contestsAttended,
    }));

    const totalSubmissions = rows.reduce((s, r) => s + r.submissionCount, 0);
    const totalSolved      = rows.reduce((s, r) => s + r.problemsSolved, 0);
    const totalContests    = rows.reduce((s, r) => s + r.contestsAttended, 0);
    const activeDays       = rows.filter((r) => r.submissionCount > 0).length;

    res.json({ activity, stats: { totalSubmissions, totalSolved, totalContests, activeDays, days } });
  } catch (err) {
    serverError(res, err, "activity");
  }
};

exports.getContests = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    res.json(await fetchContests(handle.id, limit));
  } catch (err) {
    serverError(res, err, "contests");
  }
};

exports.getRatingHistory = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    res.json(await fetchRatingHistory(handle.id));
  } catch (err) {
    serverError(res, err, "rating-history");
  }
};

exports.getVerdictStats = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    res.json(buildVerdictStats(await getStats(handle.id)));
  } catch (err) {
    serverError(res, err, "verdict-stats");
  }
};

exports.getLanguageStats = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    res.json(buildLanguageStats(await getStats(handle.id)));
  } catch (err) {
    serverError(res, err, "language-stats");
  }
};

exports.getDifficultyStats = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    res.json(buildDifficultyStats(await getStats(handle.id)));
  } catch (err) {
    serverError(res, err, "difficulty-stats");
  }
};

exports.getAttemptsStats = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    res.json(buildAttemptsStats(await getStats(handle.id)));
  } catch (err) {
    serverError(res, err, "attempts-stats");
  }
};

exports.getTagMastery = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    res.json(buildTagMastery(await getStats(handle.id)));
  } catch (err) {
    serverError(res, err, "tag-mastery");
  }
};

exports.getContestExtremes = async (req, res) => {
  try {
    const handle = await getActiveHandle(req);
    if (!handle) return res.status(400).json(NO_HANDLE);

    res.json(buildContestExtremes(await getStats(handle.id)));
  } catch (err) {
    serverError(res, err, "contest-extremes");
  }
};
