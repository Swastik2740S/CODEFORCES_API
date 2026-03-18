// trigger-sync.js
const prisma = require('./client');
async function main() {
  const handle = await prisma.codeforcesHandle.findFirst({ where: { isActive: true } });
  if (!handle) { console.error('No active handle found'); process.exit(1); }
  for (const jobType of ['profile', 'ratings', 'submissions']) {
    await prisma.syncJob.create({ data: { jobType, status: 'pending', handleId: handle.id } });
  }
  console.log('✅ Jobs queued for', handle.handle);
  await prisma.$disconnect();
}
main();