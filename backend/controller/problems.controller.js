const prisma = require("../client");

// Problems browser over the locally synced Problem/Submission tables.
// Note: the Problem table contains every problem touched by any synced handle
// (not the full CF problemset), which in practice covers everything relevant.

function serverError(res, err, label) {
  console.error(`[problems] ${label}:`, err);
  return res.status(500).json({ error: "Internal server error" });
}

const getActiveHandle = (userId) =>
  prisma.codeforcesHandle.findFirst({
    where: { userId, isActive: true },
    select: { id: true, handle: true, rating: true },
  });

const problemUrl = (p) =>
  p.contestId != null
    ? `https://codeforces.com/problemset/problem/${p.contestId}/${p.index}`
    : null;

// ── GET /api/problems ─────────────────────────────────────────────────────────
// ?minRating=&maxRating=&tags=dp,graphs&status=all|solved|attempted|untouched
// &search=&sort=rating|solvedCount|name&order=asc|desc&page=1&pageSize=25
exports.listProblems = async (req, res) => {
  try {
    const me = await getActiveHandle(req.userId);
    if (!me) return res.status(400).json({ error: "No active Codeforces handle" });

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 25, 1), 100);
    const status = req.query.status ?? "all";

    const where = {};

    const minRating = parseInt(req.query.minRating);
    const maxRating = parseInt(req.query.maxRating);
    if (!Number.isNaN(minRating) || !Number.isNaN(maxRating)) {
      where.rating = {
        ...(!Number.isNaN(minRating) && { gte: minRating }),
        ...(!Number.isNaN(maxRating) && { lte: maxRating }),
      };
    }

    const tags = (req.query.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (tags.length > 0) where.tags = { hasEvery: tags };

    const search = (req.query.search ?? "").trim();
    if (search) where.name = { contains: search, mode: "insensitive" };

    if (status === "solved") {
      where.submissions = { some: { handleId: me.id, verdict: "OK" } };
    } else if (status === "attempted") {
      where.AND = [
        { submissions: { some: { handleId: me.id } } },
        { submissions: { none: { handleId: me.id, verdict: "OK" } } },
      ];
    } else if (status === "untouched") {
      where.submissions = { none: { handleId: me.id } };
    }

    const order = req.query.order === "desc" ? "desc" : "asc";
    const sortField = ["rating", "solvedCount", "name"].includes(req.query.sort)
      ? req.query.sort
      : "rating";
    const orderBy =
      sortField === "name"
        ? [{ name: order }]
        : [{ [sortField]: { sort: order, nulls: "last" } }, { name: "asc" }];

    const [total, problems] = await Promise.all([
      prisma.problem.count({ where }),
      prisma.problem.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          contestId: true,
          index: true,
          name: true,
          rating: true,
          tags: true,
          solvedCount: true,
        },
      }),
    ]);

    // Per-row solve status for just this page.
    const subs = await prisma.submission.findMany({
      where: { handleId: me.id, problemId: { in: problems.map((p) => p.id) } },
      select: { problemId: true, verdict: true },
    });
    const statusById = new Map();
    for (const s of subs) {
      if (s.verdict === "OK") statusById.set(s.problemId, "solved");
      else if (statusById.get(s.problemId) !== "solved") {
        statusById.set(s.problemId, "attempted");
      }
    }

    res.json({
      page,
      pageSize,
      total,
      totalPages: Math.max(Math.ceil(total / pageSize), 1),
      problems: problems.map((p) => ({
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        rating: p.rating,
        tags: p.tags,
        url: problemUrl(p),
        status: statusById.get(p.id) ?? "untouched",
      })),
    });
  } catch (err) {
    serverError(res, err, "list");
  }
};

// ── GET /api/problems/tags ────────────────────────────────────────────────────
// Distinct tags across all known problems, for filter dropdowns.
exports.listTags = async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT DISTINCT unnest(tags) AS tag FROM "Problem" ORDER BY 1
    `;
    res.set("Cache-Control", "private, max-age=3600");
    res.json({ tags: rows.map((r) => r.tag) });
  } catch (err) {
    serverError(res, err, "tags");
  }
};
