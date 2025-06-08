import { PrismaClient } from '@prisma/client';

async function debugTags() {
  const prisma = new PrismaClient();
  
  try {
    console.log('=== Direct Prisma Query ===');
    const directResult = await prisma.tag.findMany({
      where: {
        jobApplications: {
          some: { userId: 1 }
        }
      },
      include: {
        jobApplications: {
          where: { userId: 1 }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log('Direct result count:', directResult.length);
    console.log('First tag:', JSON.stringify(directResult[0], null, 2));
    
    console.log('\n=== All tag fields ===');
    if (directResult.length > 0) {
      console.log('Available fields:', Object.keys(directResult[0]));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugTags(); 