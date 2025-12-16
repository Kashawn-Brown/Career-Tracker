/**
 * Job Application Multi-Select Filters Integration Tests
 * 
 * Tests the integration between service and repository layers for multi-select filtering.
 * Verifies that the filtering logic works correctly without full HTTP setup.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { jobApplicationService } from '../../services/job-application.service.js';

const prisma = new PrismaClient();

describe('Job Application Multi-Select Filters Integration', () => {
  let testUserId: number;
  let createdApplicationIds: number[] = [];

  beforeEach(async () => {
    // Create test user
    const testUser = await prisma.user.create({
      data: {
        email: `test-multifilter-${Date.now()}@example.com`,
        password: 'hashedpassword123',
        name: 'Multi-Filter Test User',
        emailVerified: true,
        role: 'USER'
      }
    });
    testUserId = testUser.id;

    // Create test job applications with diverse data for filtering
    const testApplications = [
      {
        userId: testUserId,
        company: 'Apple',
        position: 'Senior Software Engineer',
        status: 'applied',
        workArrangement: 'remote',
        type: 'full-time',
        salary: 200000,
        dateApplied: new Date('2024-01-15')
      },
      {
        userId: testUserId,
        company: 'Google',
        position: 'Product Manager',
        status: 'interview',
        workArrangement: 'hybrid',
        type: 'full-time',
        salary: 180000,
        dateApplied: new Date('2024-01-20')
      },
      {
        userId: testUserId,
        company: 'Microsoft',
        position: 'Data Scientist',
        status: 'applied',
        workArrangement: 'remote',
        type: 'contract',
        salary: 160000,
        dateApplied: new Date('2024-01-25')
      },
      {
        userId: testUserId,
        company: 'Netflix',
        position: 'Frontend Developer',
        status: 'rejected',
        workArrangement: 'in_office',
        type: 'full-time',
        salary: 150000,
        dateApplied: new Date('2024-01-30')
      },
      {
        userId: testUserId,
        company: 'Amazon',
        position: 'Backend Engineer',
        status: 'offer',
        workArrangement: 'remote',
        type: 'full-time',
        salary: 190000,
        dateApplied: new Date('2024-02-01')
      }
    ];

    for (const appData of testApplications) {
      const app = await prisma.jobApplication.create({
        data: appData
      });
      createdApplicationIds.push(app.id);
    }
  });

  afterEach(async () => {
    // Clean up test data
    if (createdApplicationIds.length > 0) {
      await prisma.jobApplication.deleteMany({
        where: { id: { in: createdApplicationIds } }
      });
    }

    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } });
    }

    createdApplicationIds = [];
  });

  describe('Multi-Select Company Filtering', () => {
    it('should filter by multiple companies using array parameter', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        companies: ['Apple', 'Google', 'Microsoft']
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(3);
      
      const companies = result.data?.jobApplications.map(app => app.company) || [];
      expect(companies).toContain('Apple');
      expect(companies).toContain('Google');
      expect(companies).toContain('Microsoft');
      expect(companies).not.toContain('Netflix');
      expect(companies).not.toContain('Amazon');
    });

    it('should work with single company in array format', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        companies: ['Apple']
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(1);
      expect(result.data?.jobApplications[0].company).toBe('Apple');
    });
  });

  describe('Multi-Select Status Filtering', () => {
    it('should filter by multiple statuses', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        statuses: ['applied', 'interview']
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(3); // 2 applied + 1 interview
      
      const statuses = result.data?.jobApplications.map(app => app.status) || [];
      expect(statuses.filter(s => s === 'applied')).toHaveLength(2);
      expect(statuses.filter(s => s === 'interview')).toHaveLength(1);
      expect(statuses).not.toContain('rejected');
      expect(statuses).not.toContain('offer');
    });
  });

  describe('Multi-Select Work Arrangement Filtering', () => {
    it('should filter by multiple work arrangements', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        workArrangements: ['remote', 'hybrid']
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(4); // 3 remote + 1 hybrid
      
      const arrangements = result.data?.jobApplications.map(app => app.workArrangement) || [];
      expect(arrangements.filter(a => a === 'remote')).toHaveLength(3);
      expect(arrangements.filter(a => a === 'hybrid')).toHaveLength(1);
      expect(arrangements).not.toContain('in_office');
    });
  });

  describe('Multi-Select Job Type Filtering', () => {
    it('should filter by multiple job types', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        jobTypes: ['full-time', 'contract']
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(5); // 4 full-time + 1 contract (all of them)
      
      const types = result.data?.jobApplications.map(app => app.type) || [];
      expect(types.filter(t => t === 'full-time')).toHaveLength(4);
      expect(types.filter(t => t === 'contract')).toHaveLength(1);
    });
  });

  describe('Combined Multi-Select Filtering', () => {
    it('should combine multiple multi-select filters (AND logic)', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        companies: ['Apple', 'Google'],
        statuses: ['applied', 'interview']
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(2); // Apple(applied) + Google(interview)
      
      const apps = result.data?.jobApplications || [];
      expect(apps.some(app => app.company === 'Apple' && app.status === 'applied')).toBe(true);
      expect(apps.some(app => app.company === 'Google' && app.status === 'interview')).toBe(true);
    });

    it('should combine multi-select with other filters', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        companies: ['Google', 'Amazon'],
        salaryMin: 175000
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(2); // Google (180k) + Amazon (190k)
      
      const apps = result.data?.jobApplications || [];
      apps.forEach(app => {
        expect(['Google', 'Amazon']).toContain(app.company);
        expect(app.salary).toBeGreaterThanOrEqual(175000);
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should prioritize multi-select over single-value when both provided', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        company: 'Apple',  // single value
        companies: ['Google', 'Microsoft']  // multi-select should win
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(2);
      
      const companies = result.data?.jobApplications.map(app => app.company) || [];
      expect(companies).toContain('Google');
      expect(companies).toContain('Microsoft');
      expect(companies).not.toContain('Apple'); // Single value should be ignored
    });

    it('should fall back to single-value when multi-select is empty', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        company: 'Apple',
        companies: []  // empty array
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(1);
      expect(result.data?.jobApplications[0].company).toBe('Apple');
    });
  });

  describe('Edge Cases', () => {
    it('should return empty results for non-matching multi-select filters', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        companies: ['NonExistentCompany', 'AnotherFakeCompany']
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(0);
    });

    it('should handle pagination with multi-select filters', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        companies: ['Apple', 'Google', 'Microsoft'],
        page: 1,
        limit: 2
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(2);
      expect(result.data?.pagination?.total).toBe(3);
      expect(result.data?.pagination?.totalPages).toBe(2);
    });

    it('should handle sorting with multi-select filters', async () => {
      const result = await jobApplicationService.listJobApplications({
        userId: testUserId,
        companies: ['Apple', 'Google'],
        sortBy: 'salary',
        sortOrder: 'desc'
      });

      expect(result.success).toBe(true);
      expect(result.data?.jobApplications).toHaveLength(2);
      
      const salaries = result.data?.jobApplications.map(app => app.salary) || [];
      expect(salaries[0]).toBeGreaterThanOrEqual(salaries[1]); // Descending order
    });
  });
}); 