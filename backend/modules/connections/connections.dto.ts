// Centralized “public” shapes returned to API clients.
// Keeps Prisma selects consistent and prevents leaking future fields.

export const connectionSelect = {
    id: true,
    userId: false,
  
    name: true,
    company: true,
    title: true,
    email: true,
    linkedInUrl: true,
    notes: true,
    phone: true,
    relationship: true,
    location: true,
    status: true,
  
    createdAt: true,
    updatedAt: true,
  } as const;
  
  export type CreateConnectionInput = {
    userId: string;
    name: string;
    company?: string;
    title?: string;
    email?: string;
    linkedInUrl?: string;
    notes?: string;
    phone?: string;
    relationship?: string;
    location?: string;
    status?: boolean;
  };
  
  export type UpdateConnectionInput = {
    name?: string;
    company?: string;
    title?: string;
    email?: string;
    linkedInUrl?: string;
    notes?: string;
    phone?: string;
    relationship?: string;
    location?: string;
    status?: boolean;
  };
  
  export type ListConnectionsParams = {
    userId: string;
    q?: string;
    status?: boolean;

    page?: number;
    pageSize?: number;
    sortBy?: "updatedAt" | "createdAt" | "name" | "company" | "title" | "relationship" | "location";
    sortDir?: "asc" | "desc";
  };
  
  