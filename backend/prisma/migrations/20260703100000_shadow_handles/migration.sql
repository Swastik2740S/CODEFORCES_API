-- Shadow handles: CodeforcesHandle rows with no owning user. These are public
-- CF profiles synced on demand for the Peers comparison page; they reuse the
-- same sync queue and HandleStats pipeline as user-owned handles.

-- AlterTable
ALTER TABLE "CodeforcesHandle" ALTER COLUMN "userId" DROP NOT NULL;
