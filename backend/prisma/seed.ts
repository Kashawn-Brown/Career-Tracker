/**
 * Database Seed Script
 * 
 * This script populates the database with sample data for development and testing purposes.
 * It creates:
 * - A test user with profile information
 * - Sample contacts in the user's network (colleagues, alumni, conference connections)
 * - Job applications with different statuses and associated connections
 * - Tags and job connections to demonstrate the full data model
 * 
 * Run with: npx prisma db seed
 */

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

  // Create contacts in user's network
  const contact1 = await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Derek Smith',
      email: 'derek.smith@td.com',
      phone: '+1-555-0123',
      company: 'TD Bank',
      role: 'Senior Software Engineer',
      linkedinUrl: 'https://linkedin.com/in/dereksmith',
      connectionType: 'colleague',
      notes: 'Former coworker at RBC, now at TD. Great contact for fintech opportunities.',
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Sarah Johnson',
      email: 'sarah.j@alumni.university.edu',
      phone: '+1-555-0456',
      company: 'Google',
      role: 'Product Manager',
      linkedinUrl: 'https://linkedin.com/in/sarahjohnson',
      connectionType: 'alumni',
      notes: 'University alumni, graduated same year. Works in tech product management.',
    },
  });

  const contact3 = await prisma.contact.create({
    data: {
      userId: user.id,
      name: 'Mike Chen',
      email: 'mike.chen@startup.com',
      company: 'Startup Inc',
      role: 'CTO',
      linkedinUrl: 'https://linkedin.com/in/mikechen',
      connectionType: 'conference',
      notes: 'Met at TechConf 2024. Startup CTO, very approachable and helpful.',
    },
  });

  console.log('✅ Created contacts:', { contact1, contact2, contact3 });

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
          { name: 'React' },
          { name: 'TypeScript' },
          { name: 'Remote' }
        ]
      },
      jobConnections: {
        create: [
          {
            // One-off contact (not in contacts table)
            name: 'John Smith',
            email: 'john.smith@techcorp.com',
            company: 'Tech Corp',
            role: 'Hiring Manager',
            connectionType: 'recruiter',
            status: 'contacted',
            notes: 'Initial contact through LinkedIn. Scheduled phone screening.',
            contactedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
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
          { name: 'Node.js' },
          { name: 'React' },
          { name: 'Startup' },
          { name: 'Growth' }
        ]
      },
      jobConnections: {
        create: [
          {
            // Using existing contact
            contactId: contact3.id,
            name: contact3.name,
            email: 'mike.chen@startup.com', // Using work email for this job
            company: contact3.company,
            role: contact3.role,
            connectionType: 'referral',
            status: 'helped',
            notes: 'Mike referred me directly to the hiring team. Great advocate!',
            contactedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
          },
          {
            // Additional one-off contact
            name: 'Lisa Wong',
            email: 'lisa.wong@startup.com',
            company: 'Startup Inc',
            role: 'Lead Developer',
            connectionType: 'interviewer',
            status: 'responded',
            notes: 'Technical interviewer. Very knowledgeable about the tech stack.',
          }
        ]
      }
    },
  });

  const jobApp3 = await prisma.jobApplication.create({
    data: {
      userId: user.id,
      company: 'TD Bank',
      position: 'Senior Backend Developer',
      status: 'applied',
      type: 'full-time',
      salary: 95000,
      jobLink: 'https://td.com/careers/senior-backend',
      compatibilityScore: 9,
      notes: 'Great opportunity at a stable company. Derek can provide insider insights.',
      tags: {
        create: [
          { name: 'Java' },
          { name: 'Spring Boot' },
          { name: 'Banking' },
          { name: 'Enterprise' }
        ]
      },
      jobConnections: {
        create: [
          {
            // Using existing contact with job-specific override
            contactId: contact1.id,
            name: contact1.name,
            email: 'derek.personal@gmail.com', // Using personal email for this connection
            phone: contact1.phone,
            company: contact1.company,
            role: contact1.role,
            connectionType: 'referral',
            status: 'contacted',
            notes: 'Derek is helping me understand the team culture and can put in a good word.',
            contactedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
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
