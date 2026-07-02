// Manually queue a sync for the active handle.
//   node trigger-sync.js         → incremental sync (profile + ratings + submissions)
//   node trigger-sync.js --full  → full re-crawl of submissions (picks up old rejudges)
require("dotenv").config();
const crypto = require("crypto");
const prisma = require("./client");

async function main() {
  const handle = await prisma.codeforcesHandle.findFirst({ where: { isActive: true } });
  if (!handle) { console.error("No active handle found"); process.exit(1); }

  const full = process.argv.includes("--full");
  const jobTypes = ["profile", "ratings", full ? "submissions_full" : "submissions"];
  const sessionId = crypto.randomUUID();

  await prisma.syncJob.createMany({
    data: jobTypes.map((jobType) => ({
      jobType,
      status: "pending",
      handleId: handle.id,
      syncSessionId: sessionId,
    })),
    skipDuplicates: true, // partial unique index blocks duplicate active jobs
  });

  console.log(`✅ ${full ? "Full" : "Incremental"} sync queued for ${handle.handle} (session ${sessionId})`);
  await prisma.$disconnect();
}
main();
