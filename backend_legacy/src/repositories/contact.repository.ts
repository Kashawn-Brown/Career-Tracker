/**
 * Contact Repository
 * 
 * Handles all database operations related to contacts.
 * Extends BaseRepository with contact-specific methods.
 */

import { Contact, Prisma } from '@prisma/client';
import { BaseRepository } from './base.repository.js';

export type ContactWithRelations = Contact & {
  user?: any;
  jobConnections?: any[];
};

export interface ContactFilters {
  userId?: number;
  company?: string;
  role?: string;
  connectionType?: string;
  hasEmail?: boolean;
  hasPhone?: boolean;
  hasLinkedin?: boolean;
}

export class ContactRepository extends BaseRepository<
  Contact,
  Prisma.ContactCreateInput,
  Prisma.ContactUpdateInput,
  Prisma.ContactWhereInput
> {
  constructor() {
    super('contact');
  }

  /**
   * Find contact with all relations
   */
  async findByIdWithRelations(id: number, tx?: Prisma.TransactionClient): Promise<ContactWithRelations | null> {
    return this.findById(
      id,
      {
        user: true,
        jobConnections: {
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
      },
      tx
    );
  }

  /**
   * Find contacts by user with filters
   */
  async findByUserWithFilters(
    userId: number,
    filters: ContactFilters = {},
    options?: {
      pagination?: { page?: number; limit?: number };
      orderBy?: Prisma.ContactOrderByWithRelationInput;
    },
    tx?: Prisma.TransactionClient
  ): Promise<ContactWithRelations[]> {
    const where: Prisma.ContactWhereInput = {
      userId,
      ...this.buildFiltersWhere(filters),
    };

    return this.findMany(
      where,
      {
        include: {
          jobConnections: {
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
          },
        },
        orderBy: options?.orderBy || { createdAt: 'desc' },
        pagination: options?.pagination,
      },
      tx
    );
  }

  /**
   * Find contacts by company
   */
  async findByCompany(
    company: string,
    userId?: number,
    tx?: Prisma.TransactionClient
  ): Promise<ContactWithRelations[]> {
    const where: Prisma.ContactWhereInput = {
      company: { contains: company, mode: 'insensitive' },
    };

    if (userId) {
      where.userId = userId;
    }

    return this.findMany(
      where,
      {
        include: {
          jobConnections: true,
        },
        orderBy: { name: 'asc' },
      },
      tx
    );
  }

  /**
   * Find contacts by connection type
   */
  async findByConnectionType(
    connectionType: string,
    userId?: number,
    tx?: Prisma.TransactionClient
  ): Promise<ContactWithRelations[]> {
    const where: Prisma.ContactWhereInput = { connectionType };

    if (userId) {
      where.userId = userId;
    }

    return this.findMany(
      where,
      {
        include: {
          jobConnections: true,
        },
        orderBy: { name: 'asc' },
      },
      tx
    );
  }

  /**
   * Search contacts
   */
  async searchContacts(
    query: string,
    userId?: number,
    options?: {
      pagination?: { page?: number; limit?: number };
    },
    tx?: Prisma.TransactionClient
  ): Promise<ContactWithRelations[]> {
    const where: Prisma.ContactWhereInput = {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { company: { contains: query, mode: 'insensitive' } },
        { role: { contains: query, mode: 'insensitive' } },
        { notes: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (userId) {
      where.userId = userId;
    }

    return this.findMany(
      where,
      {
        include: {
          jobConnections: true,
        },
        orderBy: { name: 'asc' },
        pagination: options?.pagination,
      },
      tx
    );
  }

  /**
   * Find contact by email
   */
  async findByEmail(
    email: string,
    userId?: number,
    tx?: Prisma.TransactionClient
  ): Promise<Contact | null> {
    const where: Prisma.ContactWhereInput = { email };

    if (userId) {
      where.userId = userId;
    }

    return this.findFirst(where, undefined, tx);
  }

  /**
   * Find contacts with LinkedIn profiles
   */
  async findWithLinkedIn(
    userId?: number,
    tx?: Prisma.TransactionClient
  ): Promise<ContactWithRelations[]> {
    const where: Prisma.ContactWhereInput = {
      linkedinUrl: { not: null },
    };

    if (userId) {
      where.userId = userId;
    }

    return this.findMany(
      where,
      {
        include: {
          jobConnections: true,
        },
        orderBy: { name: 'asc' },
      },
      tx
    );
  }

  /**
   * Get contact statistics for a user
   */
  async getContactStats(userId: number, tx?: Prisma.TransactionClient): Promise<{
    total: number;
    byCompany: { company: string; count: number }[];
    byConnectionType: { connectionType: string; count: number }[];
    withEmail: number;
    withPhone: number;
    withLinkedIn: number;
  }> {
    const client = tx || this.prisma;

    const [
      total,
      byCompany,
      byConnectionType,
      withEmail,
      withPhone,
      withLinkedIn,
    ] = await Promise.all([
      client.contact.count({ where: { userId } }),
      client.contact.groupBy({
        by: ['company'],
        where: { userId, company: { not: null } },
        _count: { company: true },
        orderBy: { _count: { company: 'desc' } },
        take: 10,
      }),
      client.contact.groupBy({
        by: ['connectionType'],
        where: { userId, connectionType: { not: null } },
        _count: { connectionType: true },
      }),
      client.contact.count({ where: { userId, email: { not: null } } }),
      client.contact.count({ where: { userId, phone: { not: null } } }),
      client.contact.count({ where: { userId, linkedinUrl: { not: null } } }),
    ]);

    return {
      total,
      byCompany: byCompany.map(item => ({
        company: item.company || 'Unknown',
        count: item._count.company,
      })),
      byConnectionType: byConnectionType.map(item => ({
        connectionType: item.connectionType || 'Unknown',
        count: item._count.connectionType,
      })),
      withEmail,
      withPhone,
      withLinkedIn,
    };
  }

  /**
   * Update contact information
   */
  async updateContactInfo(
    id: number,
    data: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      role?: string;
      linkedinUrl?: string;
      connectionType?: string;
      notes?: string;
    },
    tx?: Prisma.TransactionClient
  ): Promise<Contact> {
    return this.update(id, data, undefined, tx);
  }

  /**
   * Build filters for where clause
   */
  private buildFiltersWhere(filters: ContactFilters): Prisma.ContactWhereInput {
    const where: Prisma.ContactWhereInput = {};

    if (filters.company) {
      where.company = { contains: filters.company, mode: 'insensitive' };
    }

    if (filters.role) {
      where.role = { contains: filters.role, mode: 'insensitive' };
    }

    if (filters.connectionType) {
      where.connectionType = filters.connectionType;
    }

    if (filters.hasEmail !== undefined) {
      if (filters.hasEmail) {
        where.email = { not: null };
      } else {
        where.email = null;
      }
    }

    if (filters.hasPhone !== undefined) {
      if (filters.hasPhone) {
        where.phone = { not: null };
      } else {
        where.phone = null;
      }
    }

    if (filters.hasLinkedin !== undefined) {
      if (filters.hasLinkedin) {
        where.linkedinUrl = { not: null };
      } else {
        where.linkedinUrl = null;
      }
    }

    return where;
  }
} 