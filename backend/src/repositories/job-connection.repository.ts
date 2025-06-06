/**
 * Job Connection Repository
 * 
 * Handles all database operations related to job connections.
 * Extends BaseRepository with job connection-specific methods.
 */

import { JobConnection, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export type JobConnectionWithRelations = JobConnection & {
  contact?: any;
  jobApplication?: any;
};

export interface JobConnectionFilters {
  jobApplicationId?: number;
  contactId?: number;
  connectionType?: string;
  status?: string;
  hasContact?: boolean;
  contactedAfter?: Date;
  contactedBefore?: Date;
}

export class JobConnectionRepository extends BaseRepository<
  JobConnection,
  Prisma.JobConnectionCreateInput,
  Prisma.JobConnectionUpdateInput,
  Prisma.JobConnectionWhereInput
> {
  constructor() {
    super('jobConnection');
  }

  /**
   * Find job connection with all relations
   */
  async findByIdWithRelations(id: number, tx?: Prisma.TransactionClient): Promise<JobConnectionWithRelations | null> {
    return this.findById(
      id,
      {
        contact: true,
        jobApplication: {
          select: {
            id: true,
            company: true,
            position: true,
            status: true,
            userId: true,
          },
        },
      },
      tx
    );
  }

  /**
   * Find job connections by job application
   */
  async findByJobApplication(
    jobApplicationId: number,
    tx?: Prisma.TransactionClient
  ): Promise<JobConnectionWithRelations[]> {
    return this.findMany(
      { jobApplicationId },
      {
        include: {
          contact: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      tx
    );
  }

  /**
   * Find job connections by contact
   */
  async findByContact(
    contactId: number,
    tx?: Prisma.TransactionClient
  ): Promise<JobConnectionWithRelations[]> {
    return this.findMany(
      { contactId },
      {
        include: {
          jobApplication: {
            select: {
              id: true,
              company: true,
              position: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      tx
    );
  }

  /**
   * Find job connections by user (through job applications)
   */
  async findByUser(
    userId: number,
    filters: JobConnectionFilters = {},
    options?: {
      pagination?: { page?: number; limit?: number };
      orderBy?: Prisma.JobConnectionOrderByWithRelationInput;
    },
    tx?: Prisma.TransactionClient
  ): Promise<JobConnectionWithRelations[]> {
    const where: Prisma.JobConnectionWhereInput = {
      jobApplication: { userId },
      ...this.buildFiltersWhere(filters),
    };

    return this.findMany(
      where,
      {
        include: {
          contact: true,
          jobApplication: {
            select: {
              id: true,
              company: true,
              position: true,
              status: true,
            },
          },
        },
        orderBy: options?.orderBy || { createdAt: 'desc' },
        pagination: options?.pagination,
      },
      tx
    );
  }

  /**
   * Find job connections by status
   */
  async findByStatus(
    status: string,
    userId?: number,
    tx?: Prisma.TransactionClient
  ): Promise<JobConnectionWithRelations[]> {
    const where: Prisma.JobConnectionWhereInput = { status };

    if (userId) {
      where.jobApplication = { userId };
    }

    return this.findMany(
      where,
      {
        include: {
          contact: true,
          jobApplication: {
            select: {
              id: true,
              company: true,
              position: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      tx
    );
  }

  /**
   * Find job connections by connection type
   */
  async findByConnectionType(
    connectionType: string,
    userId?: number,
    tx?: Prisma.TransactionClient
  ): Promise<JobConnectionWithRelations[]> {
    const where: Prisma.JobConnectionWhereInput = { connectionType };

    if (userId) {
      where.jobApplication = { userId };
    }

    return this.findMany(
      where,
      {
        include: {
          contact: true,
          jobApplication: {
            select: {
              id: true,
              company: true,
              position: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      tx
    );
  }

  /**
   * Search job connections
   */
  async searchJobConnections(
    query: string,
    userId?: number,
    options?: {
      pagination?: { page?: number; limit?: number };
    },
    tx?: Prisma.TransactionClient
  ): Promise<JobConnectionWithRelations[]> {
    const where: Prisma.JobConnectionWhereInput = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { company: { contains: query, mode: 'insensitive' } },
        { role: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (userId) {
      where.jobApplication = { userId };
    }

    return this.findMany(
      where,
      {
        include: {
          contact: true,
          jobApplication: {
            select: {
              id: true,
              company: true,
              position: true,
              status: true,
            },
          },
        },
        orderBy: { name: 'asc' },
        pagination: options?.pagination,
      },
      tx
    );
  }

  /**
   * Update job connection status
   */
  async updateStatus(
    id: number,
    status: string,
    contactedAt?: Date,
    tx?: Prisma.TransactionClient
  ): Promise<JobConnection> {
    const updateData: Prisma.JobConnectionUpdateInput = { status };
    
    if (contactedAt) {
      updateData.contactedAt = contactedAt;
    } else if (status === 'contacted') {
      updateData.contactedAt = new Date();
    }

    return this.update(id, updateData, undefined, tx);
  }

  /**
   * Mark as contacted
   */
  async markAsContacted(
    id: number,
    contactedAt?: Date,
    notes?: string,
    tx?: Prisma.TransactionClient
  ): Promise<JobConnection> {
    const updateData: Prisma.JobConnectionUpdateInput = {
      status: 'contacted',
      contactedAt: contactedAt || new Date(),
    };

    if (notes) {
      updateData.notes = notes;
    }

    return this.update(id, updateData, undefined, tx);
  }

  /**
   * Get job connection statistics for a user
   */
  async getJobConnectionStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
    total: number;
    byStatus: { status: string; count: number }[];
    byConnectionType: { connectionType: string; count: number }[];
    contacted: number;
    notContacted: number;
    recentContacts: number;
  }> {
    const client = tx || this.prisma;

    const [
      total,
      byStatus,
      byConnectionType,
      contacted,
      notContacted,
      recentContacts,
    ] = await Promise.all([
      client.jobConnection.count({
        where: { jobApplication: { userId } },
      }),
      client.jobConnection.groupBy({
        by: ['status'],
        where: { jobApplication: { userId } },
        _count: { status: true },
      }),
      client.jobConnection.groupBy({
        by: ['connectionType'],
        where: { jobApplication: { userId } },
        _count: { connectionType: true },
      }),
      client.jobConnection.count({
        where: {
          jobApplication: { userId },
          status: 'contacted',
        },
      }),
      client.jobConnection.count({
        where: {
          jobApplication: { userId },
          status: 'not_contacted',
        },
      }),
      client.jobConnection.count({
        where: {
          jobApplication: { userId },
          contactedAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map(item => ({
        status: item.status,
        count: item._count.status,
      })),
      byConnectionType: byConnectionType.map(item => ({
        connectionType: item.connectionType,
        count: item._count.connectionType,
      })),
      contacted,
      notContacted,
      recentContacts,
    };
  }

  /**
   * Find connections that need follow-up
   */
  async findNeedingFollowUp(
    userId?: number,
    daysSinceContact: number = 14,
    tx?: Prisma.TransactionClient
  ): Promise<JobConnectionWithRelations[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceContact);

    const where: Prisma.JobConnectionWhereInput = {
      status: 'contacted',
      contactedAt: {
        lte: cutoffDate,
      },
    };

    if (userId) {
      where.jobApplication = { userId };
    }

    return this.findMany(
      where,
      {
        include: {
          contact: true,
          jobApplication: {
            select: {
              id: true,
              company: true,
              position: true,
              status: true,
            },
          },
        },
        orderBy: { contactedAt: 'asc' },
      },
      tx
    );
  }

  /**
   * Build filters for where clause
   */
  private buildFiltersWhere(filters: JobConnectionFilters): Prisma.JobConnectionWhereInput {
    const where: Prisma.JobConnectionWhereInput = {};

    if (filters.jobApplicationId) {
      where.jobApplicationId = filters.jobApplicationId;
    }

    if (filters.contactId) {
      where.contactId = filters.contactId;
    }

    if (filters.connectionType) {
      where.connectionType = filters.connectionType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.hasContact !== undefined) {
      if (filters.hasContact) {
        where.contactId = { not: null };
      } else {
        where.contactId = null;
      }
    }

    if (filters.contactedAfter || filters.contactedBefore) {
      where.contactedAt = {};
      if (filters.contactedAfter) {
        where.contactedAt.gte = filters.contactedAfter;
      }
      if (filters.contactedBefore) {
        where.contactedAt.lte = filters.contactedBefore;
      }
    }

    return where;
  }
} 