import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create a test user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      resumeLink: 'https://example.com/resume.pdf',
      githubLink: 'https://github.com/testuser',
      linkedinLink: 'https://linkedin.com/in/testuser',
    },
  });

  console.log('✅ Created user:', user);

  // Create sample job applications
  const jobApp1 = await prisma.jobApplication.create({
    data: {
      userId: user.id,
      company: 'Tech Corp',
      position: 'Frontend Developer',
      status: 'applied',
      type: 'full-time',
      salary: 75000,
      jobLink: 'https://techcorp.com/jobs/frontend-dev',
      compatibilityScore: 8,
      notes: 'Great company culture, interesting tech stack with React and TypeScript.',
      tags: {
        create: [
          { label: 'React' },
          { label: 'TypeScript' },
          { label: 'Remote' }
        ]
      },
      people: {
        create: [
          { 
            name: 'John Smith', 
            role: 'Hiring Manager',
            email: 'john.smith@techcorp.com'
          }
        ]
      }
    },
  });

  const jobApp2 = await prisma.jobApplication.create({
    data: {
      userId: user.id,
      company: 'Startup Inc',
      position: 'Full Stack Developer',
      status: 'interview',
      type: 'full-time',
      salary: 85000,
      jobLink: 'https://startup.com/careers/fullstack',
      compatibilityScore: 9,
      notes: 'Small team, lots of growth potential. They use Node.js and React.',
      isStarred: true,
      followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      tags: {
        create: [
          { label: 'Node.js' },
          { label: 'React' },
          { label: 'Startup' },
          { label: 'Growth' }
        ]
      },
      people: {
        create: [
          { 
            name: 'Jane Doe', 
            role: 'CTO',
            email: 'jane.doe@startup.com'
          },
          { 
            name: 'Mike Johnson', 
            role: 'Lead Developer',
            email: 'mike.johnson@startup.com'
          }
        ]
      }
    },
  });

  const jobApp3 = await prisma.jobApplication.create({
    data: {
      userId: user.id,
      company: 'Enterprise Solutions',
      position: 'Senior Backend Developer',
      status: 'rejected',
      type: 'full-time',
      salary: 95000,
      jobLink: 'https://enterprise.com/careers/senior-backend',
      compatibilityScore: 6,
      notes: 'Large enterprise, good benefits but slower pace. They were looking for more Java experience.',
      tags: {
        create: [
          { label: 'Java' },
          { label: 'Enterprise' },
          { label: 'Backend' }
        ]
      },
      people: {
        create: [
          { 
            name: 'Robert Wilson', 
            role: 'Technical Lead',
            email: 'robert.wilson@enterprise.com'
          }
        ]
      }
    },
  });

  console.log('✅ Created job applications:', { jobApp1, jobApp2, jobApp3 });
  console.log('🎉 Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  }); 