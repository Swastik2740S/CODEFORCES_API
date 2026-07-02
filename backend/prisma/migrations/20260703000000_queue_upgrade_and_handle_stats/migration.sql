-- ===========================================================================
-- Queue upgrade + precomputed dashboard stats
--   1. SyncJob: retry/backoff/priority/session columns, startedAt now nullable
--   2. HandleStats: precomputed per-handle dashboard statistics
--   3. Data repair: deduplicate Problem rows created with NULL contestId
--      (old upsert looked up contestId=0 but created with NULL, so the lookup
--       never matched and every sync created duplicates)
--   4. Partial unique index: at most one active (pending/running) job per
--      (handleId, jobType) -- queue-level dedup instead of check-then-insert
-- ===========================================================================

-- DropIndex
DROP INDEX "SyncJob_startedAt_idx";

-- DropIndex
DROP INDEX "SyncJob_status_idx";

-- AlterTable
ALTER TABLE "SyncJob" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "heartbeatAt" TIMESTAMP(3),
ADD COLUMN     "maxAttempts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "runAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "syncSessionId" TEXT,
ALTER COLUMN "startedAt" DROP NOT NULL,
ALTER COLUMN "startedAt" DROP DEFAULT;

-- Preserve job ordering semantics for pre-existing rows
UPDATE "SyncJob" SET "createdAt" = "startedAt" WHERE "startedAt" IS NOT NULL;

-- CreateTable
CREATE TABLE "HandleStats" (
    "id" TEXT NOT NULL,
    "handleId" TEXT NOT NULL,
    "totalSubmissions" INTEGER NOT NULL DEFAULT 0,
    "problemsAttempted" INTEGER NOT NULL DEFAULT 0,
    "problemsSolved" INTEGER NOT NULL DEFAULT 0,
    "acceptanceRate" INTEGER NOT NULL DEFAULT 0,
    "overallAccRate" INTEGER NOT NULL DEFAULT 0,
    "avgAttemptsToSolve" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "firstTrySolves" INTEGER NOT NULL DEFAULT 0,
    "firstTryRate" INTEGER NOT NULL DEFAULT 0,
    "hardestSolved" JSONB,
    "hardestUnsolved" JSONB,
    "verdictCounts" JSONB,
    "languageCounts" JSONB,
    "difficultyDist" JSONB,
    "focusAreas" JSONB,
    "tagMastery" JSONB,
    "contestStats" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandleStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HandleStats_handleId_key" ON "HandleStats"("handleId");

-- CreateIndex
CREATE INDEX "Submission_handleId_verdict_idx" ON "Submission"("handleId", "verdict");

-- CreateIndex
CREATE INDEX "SyncJob_status_runAfter_priority_idx" ON "SyncJob"("status", "runAfter", "priority");

-- CreateIndex
CREATE INDEX "SyncJob_syncSessionId_idx" ON "SyncJob"("syncSessionId");

-- AddForeignKey
ALTER TABLE "HandleStats" ADD CONSTRAINT "HandleStats_handleId_fkey" FOREIGN KEY ("handleId") REFERENCES "CodeforcesHandle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- -- Data repair: dedupe Problem rows with NULL contestId ---------------------
-- Keep the first row per (index, name), repoint submissions at it,
-- drop junction rows for the duplicates, then delete the duplicates.

WITH canon AS (
  SELECT MIN(id) AS keep_id, "index", "name"
  FROM "Problem"
  WHERE "contestId" IS NULL
  GROUP BY "index", "name"
),
mapping AS (
  SELECT p.id AS dup_id, c.keep_id
  FROM "Problem" p
  JOIN canon c ON p."index" = c."index" AND p."name" = c."name"
  WHERE p."contestId" IS NULL AND p.id <> c.keep_id
)
UPDATE "Submission" s
SET "problemId" = m.keep_id
FROM mapping m
WHERE s."problemId" = m.dup_id;

WITH canon AS (
  SELECT MIN(id) AS keep_id, "index", "name"
  FROM "Problem"
  WHERE "contestId" IS NULL
  GROUP BY "index", "name"
)
DELETE FROM "ContestProblem" cp
USING "Problem" p, canon c
WHERE cp."problemId" = p.id
  AND p."contestId" IS NULL
  AND p."index" = c."index" AND p."name" = c."name"
  AND p.id <> c.keep_id;

WITH canon AS (
  SELECT MIN(id) AS keep_id, "index", "name"
  FROM "Problem"
  WHERE "contestId" IS NULL
  GROUP BY "index", "name"
)
DELETE FROM "Problem" p
USING canon c
WHERE p."contestId" IS NULL
  AND p."index" = c."index" AND p."name" = c."name"
  AND p.id <> c.keep_id;

-- -- Queue-level dedup: one active job per (handleId, jobType) ----------------
-- createMany(..., skipDuplicates) maps to ON CONFLICT DO NOTHING, which
-- respects this partial index, so concurrent sync triggers cannot double-queue.
CREATE UNIQUE INDEX "SyncJob_active_handle_jobtype_key"
ON "SyncJob" ("handleId", "jobType")
WHERE "status" IN ('pending', 'running');
