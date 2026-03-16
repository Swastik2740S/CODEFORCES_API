const prisma = require("../client");
const { verifyToken } = require("../utils/jwt");

// ── Shared helper: extract & verify handle from cookie ────────────────────────
async function getActiveHandle(req, selectFields = { id: true }) {
  const token = req.cookies?.access_token;
  if (!token) return { error: "Unauthorized", status: 401 };

  const { userId } = verifyToken(token);

  const handle = await prisma.codeforcesHandle.findFirst({
    where: { userId, isActive: true },
    select: selectFields,
  });

  if (!handle) return { error: "No active Codeforces handle", status: 400 };
  return { handle };
}

// ── EXISTING ENDPOINTS ────────────────────────────────────────────────────────

exports.getSummary = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req, {
      id: true, handle: true, rating: true,
      maxRating: true, rank: true, lastSyncedAt: true,
    });
    if (error) return res.status(status).json({ error });

    const solved = await prisma.submission.groupBy({
      by: ["problemId"],
      where: { handleId: handle.id, verdict: "OK" },
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
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

    const solved = await prisma.submission.findMany({
      where: { handleId: handle.id, verdict: "OK" },
      select: { problem: { select: { id: true, tags: true } } },
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

exports.getActivity = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

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
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// ── NEW ENDPOINTS ─────────────────────────────────────────────────────────────

// GET /api/dashboard/contests
// Recent contest history with per-contest rating change, rank, and performance.
exports.getContests = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // RatingChange has the most reliable per-contest data from CF
    const ratingChanges = await prisma.ratingChange.findMany({
      where: { handleId: handle.id },
      orderBy: { ratingUpdateTime: "desc" },
      take: limit,
    });

    const contests = ratingChanges.map((r) => ({
      contestId:    r.contestId,
      contestName:  r.contestName,
      date:         r.ratingUpdateTime,
      rank:         r.rank,
      oldRating:    r.oldRating,
      newRating:    r.newRating,
      ratingChange: r.ratingChange,        // positive = gain, negative = drop
      result:       r.ratingChange >= 0 ? "gain" : "drop",
    }));

    res.json({ contests, total: contests.length });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// GET /api/dashboard/rating-history
// Full rating progression ordered by time — for the rating chart.
exports.getRatingHistory = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

    const history = await prisma.ratingChange.findMany({
      where: { handleId: handle.id },
      orderBy: { ratingUpdateTime: "asc" },
      select: {
        contestId:        true,
        contestName:      true,
        oldRating:        true,
        newRating:        true,
        ratingChange:     true,
        rank:             true,
        ratingUpdateTime: true,
      },
    });

    const ratingHistory = history.map((r) => ({
      contestId:    r.contestId,
      contestName:  r.contestName,
      date:         r.ratingUpdateTime,
      rating:       r.newRating,           // the point to plot on the chart
      oldRating:    r.oldRating,
      ratingChange: r.ratingChange,
      rank:         r.rank,
    }));

    res.json({ ratingHistory });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// GET /api/dashboard/verdict-stats
// Breakdown of all submission verdicts with counts and percentages.
exports.getVerdictStats = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

    const grouped = await prisma.submission.groupBy({
      by: ["verdict"],
      where: { handleId: handle.id },
      _count: { verdict: true },
      orderBy: { _count: { verdict: "desc" } },
    });

    const total = grouped.reduce((sum, g) => sum + g._count.verdict, 0);

    const verdicts = grouped.map((g) => ({
      verdict:    g.verdict ?? "UNKNOWN",
      count:      g._count.verdict,
      percentage: total > 0 ? Math.round((g._count.verdict / total) * 100) : 0,
    }));

    // Compute acceptance rate (OK verdicts / total)
    const accepted     = grouped.find((g) => g.verdict === "OK")?._count.verdict ?? 0;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    res.json({ verdicts, total, acceptanceRate });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// GET /api/dashboard/language-stats
// Programming language usage breakdown.
exports.getLanguageStats = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

    const grouped = await prisma.submission.groupBy({
      by: ["programmingLanguage"],
      where: { handleId: handle.id },
      _count: { programmingLanguage: true },
      orderBy: { _count: { programmingLanguage: "desc" } },
    });

    const total = grouped.reduce((sum, g) => sum + g._count.programmingLanguage, 0);

    const languages = grouped.map((g) => ({
      language:   g.programmingLanguage ?? "Unknown",
      count:      g._count.programmingLanguage,
      percentage: total > 0 ? Math.round((g._count.programmingLanguage / total) * 100) : 0,
    }));

    res.json({ languages, total });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// GET /api/dashboard/difficulty-stats
// Solved problems bucketed by CF problem rating (800, 900, ..., 3500+).
exports.getDifficultyStats = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

    // Get all distinct solved problems with their rating
    const solved = await prisma.submission.findMany({
      where: { handleId: handle.id, verdict: "OK" },
      select: { problem: { select: { rating: true } } },
      distinct: ["problemId"],
    });

    // Define buckets: 800–3500 in steps of 100, plus "Unrated"
    const BUCKETS = [
      800, 900, 1000, 1100, 1200, 1300, 1400, 1500,
      1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300,
      2400, 2500, 2600, 2700, 2800, 2900, 3000, 3500,
    ];

    const bucketMap = {};
    BUCKETS.forEach((b) => (bucketMap[b] = 0));
    bucketMap["Unrated"] = 0;

    for (const s of solved) {
      const r = s.problem.rating;
      if (!r) {
        bucketMap["Unrated"] += 1;
      } else {
        // Find the nearest bucket
        const bucket = BUCKETS.find((b) => r <= b) ?? 3500;
        bucketMap[bucket] = (bucketMap[bucket] || 0) + 1;
      }
    }

    const distribution = Object.entries(bucketMap)
      .filter(([, count]) => count > 0)          // only non-empty buckets
      .map(([rating, count]) => ({
        rating: rating === "Unrated" ? "Unrated" : `${rating}`,
        count,
      }));

    res.json({ distribution, totalSolved: solved.length });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// GET /api/dashboard/attempts-stats
// Per-problem acceptance rate and average attempts before solving.
exports.getAttemptsStats = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

    // Fetch all submissions grouped by problemId
    const allSubmissions = await prisma.submission.findMany({
      where: { handleId: handle.id },
      select: {
        problemId: true,
        verdict:   true,
        problem:   { select: { name: true, rating: true } },
      },
      orderBy: { creationTime: "asc" },
    });

    // Build per-problem stats
    const problemMap = {};
    for (const s of allSubmissions) {
      if (!problemMap[s.problemId]) {
        problemMap[s.problemId] = {
          name:     s.problem.name,
          rating:   s.problem.rating,
          attempts: 0,
          solved:   false,
        };
      }
      problemMap[s.problemId].attempts += 1;
      if (s.verdict === "OK") {
        problemMap[s.problemId].solved = true;
      }
    }

    const problems = Object.values(problemMap);
    const solvedProblems   = problems.filter((p) => p.solved);
    const unsolvedProblems = problems.filter((p) => !p.solved);

    const totalProblems    = problems.length;
    const totalSolved      = solvedProblems.length;
    const overallAccRate   = totalProblems > 0
      ? Math.round((totalSolved / totalProblems) * 100) : 0;

    // Average attempts on solved problems (before getting AC)
    const avgAttemptsToSolve = solvedProblems.length > 0
      ? parseFloat(
          (solvedProblems.reduce((s, p) => s + p.attempts, 0) / solvedProblems.length).toFixed(2)
        )
      : 0;

    // Problems solved in 1 attempt (first try)
    const firstTrySolves = solvedProblems.filter((p) => p.attempts === 1).length;
    const firstTryRate   = totalSolved > 0
      ? Math.round((firstTrySolves / totalSolved) * 100) : 0;

    // Hardest solved problem (highest rating)
    const hardestSolved = solvedProblems
      .filter((p) => p.rating)
      .sort((a, b) => b.rating - a.rating)[0] ?? null;

    // Most attempted unsolved (still struggling)
    const hardestUnsolved = unsolvedProblems
      .sort((a, b) => b.attempts - a.attempts)[0] ?? null;

    res.json({
      totalProblems,
      totalSolved,
      totalUnsolved:      unsolvedProblems.length,
      overallAccRate,
      avgAttemptsToSolve,
      firstTrySolves,
      firstTryRate,
      hardestSolved:   hardestSolved
        ? { name: hardestSolved.name, rating: hardestSolved.rating, attempts: hardestSolved.attempts }
        : null,
      hardestUnsolved: hardestUnsolved
        ? { name: hardestUnsolved.name, rating: hardestUnsolved.rating, attempts: hardestUnsolved.attempts }
        : null,
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// GET /api/dashboard/tag-mastery
// Per-tag deep stats: solved, attempted, success rate, avg difficulty, max difficulty.
exports.getTagMastery = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

    // All submissions with problem tags + rating
    const allSubmissions = await prisma.submission.findMany({
      where: { handleId: handle.id },
      select: {
        problemId: true,
        verdict:   true,
        problem:   { select: { tags: true, rating: true } },
      },
    });

    // Build per-tag stats
    // tagMap[tag] = { attemptedProblemIds: Set, solvedProblemIds: Set, ratings: [] }
    const tagMap = {};

    for (const s of allSubmissions) {
      for (const tag of s.problem.tags) {
        if (!tagMap[tag]) {
          tagMap[tag] = {
            attemptedProblemIds: new Set(),
            solvedProblemIds:    new Set(),
            ratings:             [],
          };
        }
        tagMap[tag].attemptedProblemIds.add(s.problemId);
        if (s.verdict === "OK") {
          tagMap[tag].solvedProblemIds.add(s.problemId);
          if (s.problem.rating) tagMap[tag].ratings.push(s.problem.rating);
        }
      }
    }

    const tagMastery = Object.entries(tagMap)
      .map(([tag, data]) => {
        const attempted    = data.attemptedProblemIds.size;
        const solved       = data.solvedProblemIds.size;
        const successRate  = attempted > 0 ? Math.round((solved / attempted) * 100) : 0;
        const avgDifficulty = data.ratings.length > 0
          ? Math.round(data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length)
          : null;
        const maxDifficulty = data.ratings.length > 0
          ? Math.max(...data.ratings)
          : null;

        return { tag, attempted, solved, successRate, avgDifficulty, maxDifficulty };
      })
      .sort((a, b) => b.solved - a.solved);   // sort by most solved

    res.json({ tagMastery, totalTags: tagMastery.length });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// GET /api/dashboard/contest-extremes
// Best rank, worst rank, biggest rating gain, biggest rating drop across all contests.
exports.getContestExtremes = async (req, res) => {
  try {
    const { handle, error, status } = await getActiveHandle(req);
    if (error) return res.status(status).json({ error });

    const all = await prisma.ratingChange.findMany({
      where: { handleId: handle.id },
      orderBy: { ratingUpdateTime: "asc" },
    });

    if (all.length === 0) {
      return res.json({ message: "No contest data yet", extremes: null });
    }

    // Best rank (lowest rank number = highest placement)
    const bestRank = all.reduce((best, r) =>
      r.rank < best.rank ? r : best
    );

    // Worst rank (highest rank number)
    const worstRank = all.reduce((worst, r) =>
      r.rank > worst.rank ? r : worst
    );

    // Biggest gain (most positive ratingChange)
    const biggestGain = all.reduce((best, r) =>
      r.ratingChange > best.ratingChange ? r : best
    );

    // Biggest drop (most negative ratingChange)
    const biggestDrop = all.reduce((worst, r) =>
      r.ratingChange < worst.ratingChange ? r : worst
    );

    // Current streak: consecutive contests with rating gain
    let currentStreak = 0;
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].ratingChange >= 0) currentStreak++;
      else break;
    }

    // Best streak ever
    let bestStreak = 0, streak = 0;
    for (const r of all) {
      if (r.ratingChange >= 0) {
        streak++;
        bestStreak = Math.max(bestStreak, streak);
      } else {
        streak = 0;
      }
    }

    const toContest = (r) => ({
      contestId:    r.contestId,
      contestName:  r.contestName,
      date:         r.ratingUpdateTime,
      rank:         r.rank,
      ratingChange: r.ratingChange,
      oldRating:    r.oldRating,
      newRating:    r.newRating,
    });

    res.json({
      totalContests:  all.length,
      currentStreak,
      bestStreak,
      extremes: {
        bestRank:    toContest(bestRank),
        worstRank:   toContest(worstRank),
        biggestGain: toContest(biggestGain),
        biggestDrop: toContest(biggestDrop),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};