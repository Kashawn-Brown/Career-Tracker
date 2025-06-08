import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugTags() {
  console.log('Checking tags for user 1...');
  
  // Check raw tag data
  const allTags = await prisma.tag.findMany({
    where: {
      jobApplications: {
        some: { userId: 1 }
      }
    }
  });
  
  console.log('Raw tag data:', JSON.stringify(allTags, null, 2));
  
  await prisma.$disconnect();
}

debugTags().catch(console.error); 