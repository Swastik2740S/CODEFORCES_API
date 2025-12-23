-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeforcesHandle" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER,
    "maxRating" INTEGER,
    "rank" TEXT,
    "maxRank" TEXT,
    "contribution" INTEGER,
    "lastOnlineTime" TIMESTAMP(3),
    "registrationTime" TIMESTAMP(3),
    "friendOfCount" INTEGER,
    "avatar" TEXT,
    "titlePhoto" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeforcesHandle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "defaultView" TEXT NOT NULL DEFAULT '6months',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "contestId" INTEGER,
    "problemsetName" TEXT,
    "index" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "rating" INTEGER,
    "tags" TEXT[],
    "solvedCount" INTEGER,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contest" (
    "id" TEXT NOT NULL,
    "contestId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "phase" TEXT,
    "durationSeconds" INTEGER,
    "startTime" TIMESTAMP(3),
    "relativeTimeSeconds" INTEGER,
    "preparedBy" TEXT,
    "websiteUrl" TEXT,
    "description" TEXT,
    "difficulty" INTEGER,
    "kind" TEXT,
    "icpcRegion" TEXT,
    "country" TEXT,
    "city" TEXT,
    "season" TEXT,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestProblem" (
    "id" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "index" TEXT NOT NULL,
    "points" DOUBLE PRECISION,

    CONSTRAINT "ContestProblem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContestParticipation" (
    "id" TEXT NOT NULL,
    "handleId" TEXT NOT NULL,
    "contestId" TEXT NOT NULL,
    "rank" INTEGER,
    "oldRating" INTEGER,
    "newRating" INTEGER,
    "ratingChange" INTEGER,
    "problemsSolved" INTEGER NOT NULL DEFAULT 0,
    "totalProblems" INTEGER NOT NULL DEFAULT 0,
    "penalty" INTEGER,
    "participatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContestParticipation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "handleId" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "contestId" INTEGER,
    "creationTime" TIMESTAMP(3) NOT NULL,
    "relativeTimeSeconds" INTEGER,
    "programmingLanguage" TEXT,
    "verdict" TEXT,
    "testset" TEXT,
    "passedTestCount" INTEGER,
    "timeConsumedMillis" INTEGER,
    "memoryConsumedBytes" BIGINT,
    "points" DOUBLE PRECISION,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RatingChange" (
    "id" TEXT NOT NULL,
    "handleId" TEXT NOT NULL,
    "contestId" INTEGER NOT NULL,
    "contestName" TEXT NOT NULL,
    "oldRating" INTEGER NOT NULL,
    "newRating" INTEGER NOT NULL,
    "ratingChange" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "ratingUpdateTime" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RatingChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "handleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "problemsSolved" INTEGER NOT NULL DEFAULT 0,
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "contestsAttended" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncJob" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "handleId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "recordsProcessed" INTEGER,

    CONSTRAINT "SyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitTracker" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "windowStart" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CodeforcesHandle_handle_key" ON "CodeforcesHandle"("handle");

-- CreateIndex
CREATE INDEX "CodeforcesHandle_userId_idx" ON "CodeforcesHandle"("userId");

-- CreateIndex
CREATE INDEX "CodeforcesHandle_handle_idx" ON "CodeforcesHandle"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "UserPreferences"("userId");

-- CreateIndex
CREATE INDEX "Problem_rating_idx" ON "Problem"("rating");

-- CreateIndex
CREATE INDEX "Problem_tags_idx" ON "Problem"("tags");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_contestId_index_key" ON "Problem"("contestId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "Contest_contestId_key" ON "Contest"("contestId");

-- CreateIndex
CREATE INDEX "Contest_contestId_idx" ON "Contest"("contestId");

-- CreateIndex
CREATE INDEX "Contest_startTime_idx" ON "Contest"("startTime");

-- CreateIndex
CREATE INDEX "ContestProblem_contestId_idx" ON "ContestProblem"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestProblem_contestId_problemId_key" ON "ContestProblem"("contestId", "problemId");

-- CreateIndex
CREATE INDEX "ContestParticipation_handleId_idx" ON "ContestParticipation"("handleId");

-- CreateIndex
CREATE INDEX "ContestParticipation_contestId_idx" ON "ContestParticipation"("contestId");

-- CreateIndex
CREATE UNIQUE INDEX "ContestParticipation_handleId_contestId_key" ON "ContestParticipation"("handleId", "contestId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_submissionId_key" ON "Submission"("submissionId");

-- CreateIndex
CREATE INDEX "Submission_handleId_idx" ON "Submission"("handleId");

-- CreateIndex
CREATE INDEX "Submission_problemId_idx" ON "Submission"("problemId");

-- CreateIndex
CREATE INDEX "Submission_verdict_idx" ON "Submission"("verdict");

-- CreateIndex
CREATE INDEX "Submission_creationTime_idx" ON "Submission"("creationTime");

-- CreateIndex
CREATE INDEX "RatingChange_handleId_idx" ON "RatingChange"("handleId");

-- CreateIndex
CREATE INDEX "RatingChange_contestId_idx" ON "RatingChange"("contestId");

-- CreateIndex
CREATE INDEX "RatingChange_ratingUpdateTime_idx" ON "RatingChange"("ratingUpdateTime");

-- CreateIndex
CREATE INDEX "Activity_handleId_idx" ON "Activity"("handleId");

-- CreateIndex
CREATE INDEX "Activity_date_idx" ON "Activity"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_handleId_date_key" ON "Activity"("handleId", "date");

-- CreateIndex
CREATE INDEX "SyncJob_jobType_idx" ON "SyncJob"("jobType");

-- CreateIndex
CREATE INDEX "SyncJob_status_idx" ON "SyncJob"("status");

-- CreateIndex
CREATE INDEX "SyncJob_startedAt_idx" ON "SyncJob"("startedAt");

-- CreateIndex
CREATE INDEX "RateLimitTracker_endpoint_idx" ON "RateLimitTracker"("endpoint");

-- CreateIndex
CREATE INDEX "RateLimitTracker_windowStart_idx" ON "RateLimitTracker"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitTracker_endpoint_windowStart_key" ON "RateLimitTracker"("endpoint", "windowStart");

-- AddForeignKey
ALTER TABLE "CodeforcesHandle" ADD CONSTRAINT "CodeforcesHandle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestProblem" ADD CONSTRAINT "ContestProblem_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestProblem" ADD CONSTRAINT "ContestProblem_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestParticipation" ADD CONSTRAINT "ContestParticipation_handleId_fkey" FOREIGN KEY ("handleId") REFERENCES "CodeforcesHandle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContestParticipation" ADD CONSTRAINT "ContestParticipation_contestId_fkey" FOREIGN KEY ("contestId") REFERENCES "Contest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_handleId_fkey" FOREIGN KEY ("handleId") REFERENCES "CodeforcesHandle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RatingChange" ADD CONSTRAINT "RatingChange_handleId_fkey" FOREIGN KEY ("handleId") REFERENCES "CodeforcesHandle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
