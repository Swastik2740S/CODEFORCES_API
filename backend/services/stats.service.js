const prisma = require("../client");

// Computes every dashboard statistic for a handle in one pass over its
// submissions, and persists the result to HandleStats. The worker runs this
// as the "stats" job after each submissions sync, so dashboard requests are
// single-row reads instead of full-table aggregations.

const DIFFICULTY_BUCKETS = [
  800, 900, 1000, 1100, 1200, 1300, 1400, 1500,
  1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300,
  2400, 2500, 2600, 2700, 2800, 2900, 3000, 3500,
];

const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

async function computeStats(handleId) {
  const submissions = await prisma.submission.findMany({
    where: { handleId },
    select: {
      problemId: true,
      verdict: true,
      programmingLanguage: true,
      problem: { select: { name: true, rating: true, tags: true } },
    },
    orderBy: { creationTime: "asc" },
  });

  const verdictCount = {};
  const langCount = {};
  const problemMap = new Map();
  let okSubmissions = 0;

  for (const s of submissions) {
    const verdict = s.verdict ?? "UNKNOWN";
    verdictCount[verdict] = (verdictCount[verdict] || 0) + 1;
    const lang = s.programmingLanguage ?? "Unknown";
    langCount[lang] = (langCount[lang] || 0) + 1;
    if (s.verdict === "OK") okSubmissions++;

    let p = problemMap.get(s.problemId);
    if (!p) {
      p = {
        name: s.problem.name,
        rating: s.problem.rating,
        tags: s.problem.tags,
        attempts: 0,
        solved: false,
        attemptsToFirstSolve: null,
      };
      problemMap.set(s.problemId, p);
    }
    p.attempts += 1;
    if (s.verdict === "OK" && !p.solved) {
      p.solved = true;
      p.attemptsToFirstSolve = p.attempts;
    }
  }

  const problems = [...problemMap.values()];
  const solvedProblems = problems.filter((p) => p.solved);
  const unsolvedProblems = problems.filter((p) => !p.solved);

  const totalSubmissions = submissions.length;
  const problemsAttempted = problems.length;
  const problemsSolved = solvedProblems.length;

  // Attempts are counted up to the first AC (resubmissions after AC don't count)
  const avgAttemptsToSolve =
    problemsSolved > 0
      ? parseFloat(
          (
            solvedProblems.reduce((s, p) => s + p.attemptsToFirstSolve, 0) /
            problemsSolved
          ).toFixed(2)
        )
      : 0;

  const firstTrySolves = solvedProblems.filter(
    (p) => p.attemptsToFirstSolve === 1
  ).length;

  const hardestSolved =
    solvedProblems
      .filter((p) => p.rating)
      .sort((a, b) => b.rating - a.rating)[0] ?? null;

  const hardestUnsolved =
    unsolvedProblems.sort((a, b) => b.attempts - a.attempts)[0] ?? null;

  const verdictCounts = Object.entries(verdictCount)
    .map(([verdict, count]) => ({
      verdict,
      count,
      percentage: pct(count, totalSubmissions),
    }))
    .sort((a, b) => b.count - a.count);

  const languageCounts = Object.entries(langCount)
    .map(([language, count]) => ({
      language,
      count,
      percentage: pct(count, totalSubmissions),
    }))
    .sort((a, b) => b.count - a.count);

  // Difficulty distribution over distinct solved problems
  const bucketMap = {};
  DIFFICULTY_BUCKETS.forEach((b) => (bucketMap[b] = 0));
  bucketMap["Unrated"] = 0;
  for (const p of solvedProblems) {
    if (!p.rating) {
      bucketMap["Unrated"] += 1;
    } else {
      const bucket = DIFFICULTY_BUCKETS.find((b) => p.rating <= b) ?? 3500;
      bucketMap[bucket] += 1;
    }
  }
  const difficultyDist = Object.entries(bucketMap)
    .filter(([, count]) => count > 0)
    .map(([rating, count]) => ({ rating: `${rating}`, count }));

  // Per-tag mastery over distinct problems
  const tagMap = {};
  for (const p of problems) {
    for (const tag of p.tags) {
      if (!tagMap[tag]) tagMap[tag] = { attempted: 0, solved: 0, ratings: [] };
      tagMap[tag].attempted += 1;
      if (p.solved) {
        tagMap[tag].solved += 1;
        if (p.rating) tagMap[tag].ratings.push(p.rating);
      }
    }
  }
  const tagMastery = Object.entries(tagMap)
    .map(([tag, d]) => ({
      tag,
      attempted: d.attempted,
      solved: d.solved,
      successRate: pct(d.solved, d.attempted),
      avgDifficulty:
        d.ratings.length > 0
          ? Math.round(d.ratings.reduce((a, b) => a + b, 0) / d.ratings.length)
          : null,
      maxDifficulty: d.ratings.length > 0 ? Math.max(...d.ratings) : null,
    }))
    .sort((a, b) => b.solved - a.solved);

  const focusAreas = tagMastery
    .filter((t) => t.solved > 0)
    .map((t) => ({ label: t.tag, value: pct(t.solved, problemsSolved) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const contestStats = await computeContestStats(handleId);

  return {
    totalSubmissions,
    problemsAttempted,
    problemsSolved,
    acceptanceRate: pct(okSubmissions, totalSubmissions),
    overallAccRate: pct(problemsSolved, problemsAttempted),
    avgAttemptsToSolve,
    firstTrySolves,
    firstTryRate: pct(firstTrySolves, problemsSolved),
    hardestSolved: hardestSolved
      ? {
          name: hardestSolved.name,
          rating: hardestSolved.rating,
          attempts: hardestSolved.attempts,
        }
      : null,
    hardestUnsolved: hardestUnsolved
      ? {
          name: hardestUnsolved.name,
          rating: hardestUnsolved.rating,
          attempts: hardestUnsolved.attempts,
        }
      : null,
    verdictCounts,
    languageCounts,
    difficultyDist,
    focusAreas,
    tagMastery,
    contestStats,
  };
}

async function computeContestStats(handleId) {
  const all = await prisma.ratingChange.findMany({
    where: { handleId },
    orderBy: { ratingUpdateTime: "asc" },
  });

  if (all.length === 0) {
    return { totalContests: 0, currentStreak: 0, bestStreak: 0, extremes: null };
  }

  const bestRank = all.reduce((best, r) => (r.rank < best.rank ? r : best));
  const worstRank = all.reduce((worst, r) => (r.rank > worst.rank ? r : worst));
  const biggestGain = all.reduce((best, r) =>
    r.ratingChange > best.ratingChange ? r : best
  );
  const biggestDrop = all.reduce((worst, r) =>
    r.ratingChange < worst.ratingChange ? r : worst
  );

  let currentStreak = 0;
  for (let i = all.length - 1; i >= 0; i--) {
    if (all[i].ratingChange >= 0) currentStreak++;
    else break;
  }

  let bestStreak = 0,
    streak = 0;
  for (const r of all) {
    if (r.ratingChange >= 0) {
      streak++;
      bestStreak = Math.max(bestStreak, streak);
    } else {
      streak = 0;
    }
  }

  const toContest = (r) => ({
    contestId: r.contestId,
    contestName: r.contestName,
    date: r.ratingUpdateTime,
    rank: r.rank,
    ratingChange: r.ratingChange,
    oldRating: r.oldRating,
    newRating: r.newRating,
  });

  return {
    totalContests: all.length,
    currentStreak,
    bestStreak,
    extremes: {
      bestRank: toContest(bestRank),
      worstRank: toContest(worstRank),
      biggestGain: toContest(biggestGain),
      biggestDrop: toContest(biggestDrop),
    },
  };
}

async function saveStats(handleId, stats) {
  const data = stats ?? (await computeStats(handleId));
  await prisma.handleStats.upsert({
    where: { handleId },
    update: data,
    create: { handleId, ...data },
  });
  return data;
}

// Read the precomputed row; if the handle has never had a stats job run
// (e.g. first deploy after this feature shipped), compute and persist inline.
async function getStats(handleId) {
  const row = await prisma.handleStats.findUnique({ where: { handleId } });
  if (row) return row;
  return saveStats(handleId);
}

module.exports = { computeStats, computeContestStats, saveStats, getStats };
