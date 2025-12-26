-- CreateIndex
CREATE INDEX "SyncJob_handleId_idx" ON "SyncJob"("handleId");

-- AddForeignKey
ALTER TABLE "SyncJob" ADD CONSTRAINT "SyncJob_handleId_fkey" FOREIGN KEY ("handleId") REFERENCES "CodeforcesHandle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
