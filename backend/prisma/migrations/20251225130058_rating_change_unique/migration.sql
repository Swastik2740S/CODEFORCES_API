/*
  Warnings:

  - A unique constraint covering the columns `[handleId,contestId]` on the table `RatingChange` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "RatingChange_handleId_contestId_key" ON "RatingChange"("handleId", "contestId");
