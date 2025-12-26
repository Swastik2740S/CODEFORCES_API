const prisma = require("../client");
const cf = require("../services/codeforces.service");

async function processJob(job) {
  const handle = await prisma.codeforcesHandle.findUnique({
    where: { id: job.handleId },
  });

  if (!handle) throw new Error("Handle not found");

  if (job.jobType === "profile") {
    const profile = await cf.getUserInfo(handle.handle);

    await prisma.codeforcesHandle.update({
      where: { id: handle.id },
      data: {
        rating: profile.rating,
        maxRating: profile.maxRating,
        rank: profile.rank,
        maxRank: profile.maxRank,
        contribution: profile.contribution,
        avatar: profile.avatar,
        titlePhoto: profile.titlePhoto,
        lastSyncedAt: new Date(),
      },
    });
  }

  if (job.jobType === "ratings") {
    const ratings = await cf.getUserRating(handle.handle);

    for (const r of ratings) {
      await prisma.ratingChange.upsert({
        where: {
          handleId_contestId: {
            handleId: handle.id,
            contestId: r.contestId,
          },
        },
        update: {},
        create: {
          handleId: handle.id,
          contestId: r.contestId,
          contestName: r.contestName,
          oldRating: r.oldRating,
          newRating: r.newRating,
          ratingChange: r.newRating - r.oldRating,
          rank: r.rank,
          ratingUpdateTime: new Date(
            r.ratingUpdateTimeSeconds * 1000
          ),
        },
      });
    }
  }

  if (job.jobType === "submissions") {
    const count = await syncSubmissions(handle);

    await prisma.syncJob.update({
      where: { id: job.id },
      data: { recordsProcessed: count },
    });
  }
}


async function runWorker() {
  console.log("🚀 Sync Worker started");

  while (true) {
    const job = await prisma.syncJob.findFirst({
      where: { status: "pending" },
      orderBy: { startedAt: "asc" },
    });

    if (!job) {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }

    try {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "running" },
      });

      await processJob(job);

      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: "completed", completedAt: new Date() },
      });

      console.log(`✅ Job ${job.id} completed`);
    } catch (err) {
      console.error(err);

      await prisma.syncJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: err.message,
          completedAt: new Date(),
        },
      });
    }
  }
}

async function syncSubmissions(handle) {
  let from = 1;
  const BATCH_SIZE = 1000;
  let fetched = 0;

  while (true) {
    const submissions = await cf.getUserSubmissions(
      handle.handle,
      from,
      BATCH_SIZE
    );

    if (submissions.length === 0) break;

    for (const s of submissions) {
      // 1️⃣ Ensure problem exists
      const problem = await prisma.problem.upsert({
        where: {
          contestId_index: {
            contestId: s.problem.contestId ?? 0,
            index: s.problem.index,
          },
        },
        update: {},
        create: {
          contestId: s.problem.contestId,
          index: s.problem.index,
          name: s.problem.name,
          rating: s.problem.rating,
          tags: s.problem.tags,
        },
      });

      // 2️⃣ Insert submission (idempotent)
      await prisma.submission.upsert({
        where: { submissionId: s.id },
        update: {},
        create: {
          submissionId: s.id,
          handleId: handle.id,
          problemId: problem.id,
          verdict: s.verdict,
          programmingLanguage: s.programmingLanguage,
          creationTime: new Date(s.creationTimeSeconds * 1000),
        },
      });
    }

    fetched += submissions.length;
    from += BATCH_SIZE;

    // Stop if less than batch size (end reached)
    if (submissions.length < BATCH_SIZE) break;
  }

  return fetched;
}

runWorker();
