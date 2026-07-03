const crypto = require("crypto");
const { Prisma } = require("@prisma/client");
const prisma = require("../client");
const cfService = require("../services/codeforces.service");
const { getStats } = require("../services/stats.service");

// Peers: compare your profile against ANY public Codeforces handle.
// Unknown handles are created as "shadow handles" (userId = null) and synced
// through the normal job queue at low priority, so real users' syncs always
// win the rate-limit budget. Once synced, comparisons are pure DB reads.

const PEER_SYNC_PRIORITY = 0;           // below user-triggered syncs (10)
const FRESHNESS_MS = 24 * 60 * 60 * 1000; // don't re-crawl CF more than daily per peer
const RECENT_FORM_CONTESTS = 5;          // "recent form" = rating delta over last N contests

// Abuse guard: a NEW shadow handle costs a CF verification call plus a full
// sync pipeline, so cap how many one user can create per day. Re-comparing
// existing peers is unlimited (freshness gate already protects the budget).
const DAILY_NEW_PEER_LIMIT = 10;

function serverError(res, err, label) {
  console.error(`[peers] ${label}:`, err);
  return res.status(500).json({ error: "Internal server error" });
}

const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

// Errors with a .status are expected control flow (bad handle, budget hit);
// everything else is a real 500.
function respondError(res, err, label) {
  if (err.status) return res.status(err.status).json({ error: err.message });
  return serverError(res, err, label);
}

const findByHandle = (handle) =>
  prisma.codeforcesHandle.findFirst({
    where: { handle: { equals: handle, mode: "insensitive" } },
  });

const getMyActiveHandle = (userId) =>
  prisma.codeforcesHandle.findFirst({
    where: { userId, isActive: true },
  });

// ── Daily new-peer budget (reuses RateLimitTracker's (endpoint, window) row) ──

function todayWindow() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function newPeerBudgetExceeded(userId) {
  const row = await prisma.rateLimitTracker.findUnique({
    where: {
      endpoint_windowStart: {
        endpoint: `peer-new:${userId}`,
        windowStart: todayWindow(),
      },
    },
  });
  return (row?.requestCount ?? 0) >= DAILY_NEW_PEER_LIMIT;
}

async function recordNewPeer(userId) {
  await prisma.rateLimitTracker.upsert({
    where: {
      endpoint_windowStart: {
        endpoint: `peer-new:${userId}`,
        windowStart: todayWindow(),
      },
    },
    update: { requestCount: { increment: 1 } },
    create: {
      endpoint: `peer-new:${userId}`,
      windowStart: todayWindow(),
      requestCount: 1,
    },
  });
}

// Find an existing handle row (owned or shadow) or verify the handle on CF and
// create a new shadow row. Throws httpError on bad handle / exhausted budget.
async function ensurePeerHandle(raw, userId) {
  let peer = await findByHandle(raw);
  if (peer) return peer;

  if (await newPeerBudgetExceeded(userId)) {
    throw httpError(
      429,
      `Daily limit of ${DAILY_NEW_PEER_LIMIT} new peers reached — try again tomorrow`
    );
  }

  // One rate-limited CF call to verify + canonicalize the handle.
  let cfUser;
  try {
    cfUser = await cfService.getUserInfo(raw);
  } catch {
    throw httpError(404, `Handle "${raw}" not found on Codeforces`);
  }

  // Canonical spelling may differ from what the user typed.
  peer = await findByHandle(cfUser.handle);
  if (peer) return peer;

  peer = await prisma.codeforcesHandle.create({
    data: {
      handle: cfUser.handle,
      userId: null, // shadow handle
      isActive: false,
      rating: cfUser.rating,
      maxRating: cfUser.maxRating,
      rank: cfUser.rank,
      maxRank: cfUser.maxRank,
      avatar: cfUser.avatar,
      titlePhoto: cfUser.titlePhoto,
    },
  });
  await recordNewPeer(userId);
  return peer;
}

// Rating delta + contest count over each handle's last N contests.
async function recentForm(handleIds) {
  if (handleIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw`
    SELECT "handleId",
           COALESCE(SUM("ratingChange"), 0)::int AS delta,
           COUNT(*)::int AS contests
    FROM (
      SELECT "handleId", "ratingChange",
             ROW_NUMBER() OVER (PARTITION BY "handleId" ORDER BY "ratingUpdateTime" DESC) AS rn
      FROM "RatingChange"
      WHERE "handleId" IN (${Prisma.join(handleIds)})
    ) t
    WHERE rn <= ${RECENT_FORM_CONTESTS}
    GROUP BY "handleId"
  `;
  return new Map(rows.map((r) => [r.handleId, { delta: r.delta, contests: r.contests }]));
}

async function solvedLast30Days(handleIds) {
  if (handleIds.length === 0) return new Map();
  const rows = await prisma.activity.groupBy({
    by: ["handleId"],
    where: {
      handleId: { in: handleIds },
      date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    _sum: { problemsSolved: true },
  });
  return new Map(rows.map((r) => [r.handleId, r._sum.problemsSolved ?? 0]));
}

const HANDLE_CARD_SELECT = {
  id: true,
  handle: true,
  rating: true,
  maxRating: true,
  rank: true,
  maxRank: true,
  avatar: true,
  lastSyncedAt: true,
  stats: { select: { problemsSolved: true, contestStats: true, updatedAt: true } },
};

function handleCard(h, forms, active30) {
  const form = forms.get(h.id) ?? { delta: 0, contests: 0 };
  return {
    handle: h.handle,
    rating: h.rating,
    maxRating: h.maxRating,
    rank: h.rank,
    maxRank: h.maxRank,
    avatar: h.avatar,
    lastSyncedAt: h.lastSyncedAt,
    synced: !!h.stats,
    problemsSolved: h.stats?.problemsSolved ?? 0,
    totalContests: h.stats?.contestStats?.totalContests ?? 0,
    recentDelta: form.delta,
    recentContests: form.contests,
    solvedLast30Days: active30.get(h.id) ?? 0,
  };
}

// ── GET /api/peers ────────────────────────────────────────────────────────────
// The user's friends list, enriched for the Peers landing view.
exports.listFriends = async (req, res) => {
  try {
    const friends = await prisma.friend.findMany({
      where: { userId: req.userId },
      include: { handle: { select: HANDLE_CARD_SELECT } },
      orderBy: { createdAt: "asc" },
    });

    const ids = friends.map((f) => f.handle.id);
    const [forms, active30] = await Promise.all([
      recentForm(ids),
      solvedLast30Days(ids),
    ]);

    res.json({
      friends: friends.map((f) => ({
        ...handleCard(f.handle, forms, active30),
        followedAt: f.createdAt,
      })),
    });
  } catch (err) {
    serverError(res, err, "list-friends");
  }
};

// ── POST /api/peers/:handle/follow ────────────────────────────────────────────
exports.follow = async (req, res) => {
  try {
    const raw = (req.params.handle ?? "").trim();
    if (!raw) return res.status(400).json({ error: "Handle is required" });

    const myActive = await getMyActiveHandle(req.userId);
    const peer = await ensurePeerHandle(raw, req.userId);
    if (myActive && peer.id === myActive.id) {
      return res.status(400).json({ error: "You can't add yourself as a friend" });
    }

    await prisma.friend.upsert({
      where: { userId_handleId: { userId: req.userId, handleId: peer.id } },
      update: {},
      create: { userId: req.userId, handleId: peer.id },
    });

    res.status(201).json({ handle: peer.handle });
  } catch (err) {
    respondError(res, err, "follow");
  }
};

// ── DELETE /api/peers/:handle ─────────────────────────────────────────────────
exports.unfollow = async (req, res) => {
  try {
    const peer = await findByHandle((req.params.handle ?? "").trim());
    if (!peer) return res.status(404).json({ error: "Handle not found" });

    await prisma.friend.deleteMany({
      where: { userId: req.userId, handleId: peer.id },
    });

    res.json({ message: `Unfollowed ${peer.handle}` });
  } catch (err) {
    serverError(res, err, "unfollow");
  }
};

// ── GET /api/peers/leaderboard ────────────────────────────────────────────────
// You + your friends, ranked by rating (client can re-sort by any column).
exports.leaderboard = async (req, res) => {
  try {
    const [me, friends] = await Promise.all([
      prisma.codeforcesHandle.findFirst({
        where: { userId: req.userId, isActive: true },
        select: HANDLE_CARD_SELECT,
      }),
      prisma.friend.findMany({
        where: { userId: req.userId },
        include: { handle: { select: HANDLE_CARD_SELECT } },
      }),
    ]);

    const rows = new Map(); // dedup: a friend may BE my handle's twin
    if (me) rows.set(me.id, { row: me, isMe: true });
    for (const f of friends) {
      if (!rows.has(f.handle.id)) rows.set(f.handle.id, { row: f.handle, isMe: false });
    }

    const ids = [...rows.keys()];
    const [forms, active30] = await Promise.all([
      recentForm(ids),
      solvedLast30Days(ids),
    ]);

    const leaderboard = [...rows.values()]
      .map(({ row, isMe }) => ({ ...handleCard(row, forms, active30), isMe }))
      .sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));

    res.json({ leaderboard });
  } catch (err) {
    serverError(res, err, "leaderboard");
  }
};

// ── POST /api/peers/:handle/sync ──────────────────────────────────────────────
// Ensure the peer exists and has fresh data. Responds either
// { ready: true } (compare immediately) or { ready: false, sessionId } (poll
// the existing sync-session endpoint until it completes).
exports.syncPeer = async (req, res) => {
  try {
    const raw = (req.params.handle ?? "").trim();
    if (!raw) return res.status(400).json({ error: "Handle is required" });

    const myActive = await getMyActiveHandle(req.userId);
    const peer = await ensurePeerHandle(raw, req.userId);

    if (myActive && peer.id === myActive.id) {
      return res.status(400).json({ error: "That's your own handle — pick a rival!" });
    }

    // Fresh enough? (HandleStats existing means a full pipeline has completed;
    // lastSyncedAt alone is not enough — it defaults to the row's creation time.)
    const stats = await prisma.handleStats.findUnique({
      where: { handleId: peer.id },
      select: { updatedAt: true },
    });
    const fresh =
      stats && Date.now() - new Date(peer.lastSyncedAt).getTime() < FRESHNESS_MS;

    if (fresh) {
      return res.json({ ready: true, handle: peer.handle });
    }

    // A sync may already be in flight for this peer (someone else asked too).
    const active = await prisma.syncJob.findFirst({
      where: { handleId: peer.id, status: { in: ["pending", "running"] } },
      orderBy: { createdAt: "desc" },
      select: { syncSessionId: true },
    });
    if (active) {
      return res.status(202).json({
        ready: false,
        handle: peer.handle,
        sessionId: active.syncSessionId,
      });
    }

    const sessionId = crypto.randomUUID();
    await prisma.syncJob.createMany({
      data: ["profile", "ratings", "submissions"].map((jobType) => ({
        jobType,
        status: "pending",
        handleId: peer.id,
        syncSessionId: sessionId,
        priority: PEER_SYNC_PRIORITY,
      })),
      skipDuplicates: true,
    });

    res.status(202).json({ ready: false, handle: peer.handle, sessionId });
  } catch (err) {
    respondError(res, err, "sync");
  }
};

// ── GET /api/peers/compare/:handle ────────────────────────────────────────────
exports.compare = async (req, res) => {
  try {
    const me = await getMyActiveHandle(req.userId);
    if (!me) return res.status(400).json({ error: "No active Codeforces handle" });

    const peer = await findByHandle((req.params.handle ?? "").trim());
    if (!peer) {
      return res.status(404).json({ error: "Peer not synced yet — start a sync first" });
    }
    if (peer.id === me.id) {
      return res.status(400).json({ error: "That's your own handle — pick a rival!" });
    }

    // Check the row directly instead of getStats(): getStats would compute and
    // persist an EMPTY stats row for a peer whose sync hasn't finished, which
    // would then fool syncPeer's freshness check into skipping the real sync.
    const peerStats = await prisma.handleStats.findUnique({
      where: { handleId: peer.id },
    });
    if (!peerStats) {
      return res.status(409).json({ error: "Peer sync still in progress — try again shortly" });
    }

    const [meStats, meRatings, peerRatings, suggestions, friend] =
      await Promise.all([
        getStats(me.id),
        fetchRatings(me.id),
        fetchRatings(peer.id),
        practiceSuggestions(me.id, peer.id, me.rating ?? 1200),
        prisma.friend.findUnique({
          where: { userId_handleId: { userId: req.userId, handleId: peer.id } },
        }),
      ]);

    res.json({
      me: buildSide(me, meStats, meRatings),
      peer: buildSide(peer, peerStats, peerRatings),
      isFriend: !!friend,
      commonContests: buildCommonContests(meRatings, peerRatings),
      practiceSuggestions: suggestions,
    });
  } catch (err) {
    serverError(res, err, "compare");
  }
};

function fetchRatings(handleId) {
  return prisma.ratingChange.findMany({
    where: { handleId },
    orderBy: { ratingUpdateTime: "asc" },
    select: {
      contestId: true,
      contestName: true,
      newRating: true,
      ratingChange: true,
      rank: true,
      ratingUpdateTime: true,
    },
  });
}

function buildSide(handleRow, stats, ratings) {
  return {
    handle: handleRow.handle,
    rating: handleRow.rating,
    maxRating: handleRow.maxRating,
    rank: handleRow.rank,
    maxRank: handleRow.maxRank,
    avatar: handleRow.avatar,
    lastSyncedAt: handleRow.lastSyncedAt,
    stats: {
      problemsSolved: stats.problemsSolved,
      problemsAttempted: stats.problemsAttempted,
      totalSubmissions: stats.totalSubmissions,
      acceptanceRate: stats.acceptanceRate,
      overallAccRate: stats.overallAccRate,
      avgAttemptsToSolve: stats.avgAttemptsToSolve,
      firstTryRate: stats.firstTryRate,
      hardestSolved: stats.hardestSolved,
      totalContests: stats.contestStats?.totalContests ?? 0,
      bestRank: stats.contestStats?.extremes?.bestRank?.rank ?? null,
      bestStreak: stats.contestStats?.bestStreak ?? 0,
    },
    tagMastery: stats.tagMastery ?? [],
    ratingHistory: ratings.map((r) => ({
      date: r.ratingUpdateTime,
      rating: r.newRating,
      contestName: r.contestName,
    })),
  };
}

function buildCommonContests(meRatings, peerRatings) {
  const peerByContest = new Map(peerRatings.map((r) => [r.contestId, r]));
  const contests = [];
  let meWins = 0;
  let peerWins = 0;
  let ties = 0;

  for (const mine of meRatings) {
    const theirs = peerByContest.get(mine.contestId);
    if (!theirs) continue;

    let winner = "tie";
    if (mine.rank < theirs.rank) { winner = "me"; meWins++; }
    else if (mine.rank > theirs.rank) { winner = "peer"; peerWins++; }
    else ties++;

    contests.push({
      contestId: mine.contestId,
      contestName: mine.contestName,
      date: mine.ratingUpdateTime,
      myRank: mine.rank,
      peerRank: theirs.rank,
      myDelta: mine.ratingChange,
      peerDelta: theirs.ratingChange,
      winner,
    });
  }

  contests.sort((a, b) => new Date(b.date) - new Date(a.date));
  return { contests, record: { meWins, peerWins, ties } };
}

// Problems the peer solved that I haven't, closest to my rating first —
// a ready-made practice list.
async function practiceSuggestions(myId, peerId, myRating) {
  // Dedupe the peer's ACs in a subquery first: SELECT DISTINCT would forbid
  // ordering by ABS(...) since the expression isn't in the select list.
  const rows = await prisma.$queryRaw`
    SELECT p."contestId", p."index", p."name", p."rating", p."tags"
    FROM (
      SELECT DISTINCT s."problemId"
      FROM "Submission" s
      WHERE s."handleId" = ${peerId} AND s.verdict = 'OK'
    ) solved
    JOIN "Problem" p ON p.id = solved."problemId"
    WHERE p."rating" IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM "Submission" ms
        WHERE ms."handleId" = ${myId}
          AND ms."problemId" = p.id
          AND ms.verdict = 'OK'
      )
    ORDER BY ABS(p."rating" - ${myRating}) ASC, p."rating" DESC
    LIMIT 30
  `;
  return rows;
}
