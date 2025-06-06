# Database Schema Documentation

## Overview

This database schema is designed for a job application tracking system that allows users to manage their job search process, track applications, contacts, documents, and organize with tags.

## Database Structure

### Tables

#### Users (`users`)
- **Purpose**: Stores user profile information
- **Key Fields**:
  - `id`: Primary key (auto-increment)
  - `email`: Unique user email
  - `name`: User's full name
  - `resumeLink`, `githubLink`, `linkedinLink`: Optional profile links
  - `createdAt`, `updatedAt`: Timestamps

#### Job Applications (`job_applications`)
- **Purpose**: Main entity for tracking job applications
- **Key Fields**:
  - `id`: Primary key (auto-increment)
  - `userId`: Foreign key to users table
  - `company`: Company name
  - `position`: Job position title
  - `dateApplied`: When the application was submitted
  - `status`: Application status (applied, interview, offer, rejected, withdrawn)
  - `type`: Job type (full-time, part-time, contract, internship)
  - `salary`: Expected/offered salary
  - `jobLink`: URL to job posting
  - `compatibilityScore`: User-defined compatibility rating (0-10)
  - `notes`: Additional notes about the application
  - `isStarred`: Whether the application is marked as important
  - `followUpDate`: When to follow up
  - `deadline`: Application deadline

#### Tags (`tags`)
- **Purpose**: Categorizing job applications with labels
- **Key Fields**:
  - `id`: Primary key (auto-increment)
  - `label`: Tag name (e.g., "React", "Remote", "Startup")
  - `jobApplicationId`: Foreign key to job_applications table

#### Contacts (`contacts`)
- **Purpose**: User's personal professional network (reusable contacts)
- **Key Fields**:
  - `id`: Primary key (auto-increment)
  - `userId`: Foreign key to users table (whose network this contact belongs to)
  - `name`: Contact's name
  - `email`, `phone`: Contact information
  - `company`: Where they work
  - `role`: Their job title
  - `linkedinUrl`: LinkedIn profile URL
  - `connectionType`: How you know them (alumni, colleague, conference, etc.)
  - `notes`: Context about the relationship

#### Job Connections (`job_connections`)
- **Purpose**: Specific networking connections for each job application
- **Key Fields**:
  - `id`: Primary key (auto-increment)
  - `jobApplicationId`: Foreign key to job_applications table
  - `contactId`: Optional foreign key to contacts table (for reusable contacts)
  - `name`, `email`, `phone`, `company`, `role`: Job-specific contact info (can override contact data)
  - `connectionType`: Type of connection for this job (referral, introduction, etc.)
  - `status`: Connection status (not_contacted, contacted, responded, helped, declined)
  - `notes`: Job-specific notes about this connection
  - `contactedAt`: When you reached out to them

#### Documents (`documents`)
- **Purpose**: Storing uploaded files related to job applications
- **Key Fields**:
  - `id`: Primary key (auto-increment)
  - `fileUrl`: URL/path to the stored file
  - `fileName`: Original file name
  - `fileSize`: File size in bytes
  - `type`: Document type (resume, cover_letter, portfolio)
  - `jobApplicationId`: Foreign key to job_applications table

## Relationships

- **One-to-Many**: User → Job Applications
- **One-to-Many**: User → Contacts (personal network)
- **One-to-Many**: Job Application → Tags
- **One-to-Many**: Job Application → Job Connections
- **One-to-Many**: Job Application → Documents
- **Many-to-One**: Job Connection → Contact (optional, for reusable contacts)

### Networking Model

The system supports a hybrid networking approach:

1. **Personal Network (`contacts`)**: Reusable contacts in your professional network
2. **Job-Specific Connections (`job_connections`)**: Connections specific to each job application

**Example**: Derek is in your contacts table once, but can be referenced by multiple job connections with different contact info (personal vs work email) and different relationship contexts per job.

## Indexes

Performance indexes are created on:
- `users.email` (unique)
- `job_applications.userId`
- `job_applications.status`
- `job_applications.dateApplied`
- `tags.jobApplicationId`
- `contacts.userId`
- `job_connections.jobApplicationId`
- `job_connections.contactId`
- `documents.jobApplicationId`
- `documents.type`

## Migration Process

### Initial Setup
1. **Generate Prisma Client**: `npm run db:generate`
2. **Create Migration**: `npm run db:migrate`
3. **Seed Database**: `npm run db:seed`

### Development Workflow
1. **Modify Schema**: Edit `schema.prisma`
2. **Create Migration**: `npm run db:migrate`
3. **Generate Client**: `npm run db:generate` (usually automatic)

### Available Scripts
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Create and apply migrations
- `npm run db:reset` - Reset database (⚠️ destroys all data)
- `npm run db:seed` - Populate with test data
- `npm run db:studio` - Open Prisma Studio GUI
- `npm run db:push` - Push schema changes without migration (dev only)

### Migration Files
Migrations are stored in `prisma/migrations/` with timestamps:
- `migration_lock.toml` - Ensures migration consistency
- `YYYYMMDDHHMMSS_name/migration.sql` - Individual migration files

## Seed Data

The seed script (`seed.ts`) creates:
- 1 test user (test@example.com)
- 3 contacts in the user's professional network (Derek, Sarah, Mike)
- 3 sample job applications with different statuses
- Associated tags and job connections for each application
- Examples of both reusable contacts and one-off connections

### Seed Data Examples:

**Contacts (Reusable Network)**:
- Derek Smith (colleague at TD Bank)
- Sarah Johnson (university alumni at Google)  
- Mike Chen (conference contact, CTO at Startup Inc)

**Job Connections**:
- Tech Corp job: One-off recruiter contact
- Startup Inc job: Uses Mike Chen contact + additional interviewer
- TD Bank job: Uses Derek Smith contact with personal email override

## Database Reset Script

For development purposes, you can reset the entire database:

```bash
npm run db:reset
```

This will:
1. Drop all tables
2. Re-run all migrations
3. Automatically run the seed script

⚠️ **Warning**: This destroys all data. Use only in development.

## Future Schema Changes

When modifying the schema:
1. Edit `schema.prisma`
2. Run `npm run db:migrate` to create a new migration
3. The migration will be automatically applied
4. Prisma client will be regenerated

Always review the generated migration SQL before applying to production. 