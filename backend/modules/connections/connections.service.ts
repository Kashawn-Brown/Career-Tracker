import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { AppError } from "../../errors/app-error.js";
import { connectionSelect } from "./connections.dto.js";
import type {
  CreateConnectionInput,
  UpdateConnectionInput,
  ListConnectionsParams,
} from "./connections.dto.js";

/**
 * Service layer:
 * - Keep Prisma usage out of the HTTP route handlers
 * - Enforce user scoping + basic normalization
 */

/**
 * Creates a new connection for the current user.
 * Requires JWT.
 */
export async function createConnection(input: CreateConnectionInput) {
  return prisma.connection.create({
    data: {
      userId: input.userId,
      name: input.name.trim(),
      company: normalizeNullableString(input.company),
      title: normalizeNullableString(input.title),
      email: normalizeNullableString(input.email),
      linkedInUrl: normalizeNullableString(input.linkedInUrl),
      notes: normalizeNullableString(input.notes),
      phone: normalizeNullableString(input.phone),
      relationship: normalizeNullableString(input.relationship),
      location: normalizeNullableString(input.location),
      status: input.status ?? null,
    },
    select: connectionSelect,
  });
}

/**
 * Lists the current users connections.
 * Supports pagination + sorting + filtering.
 * Requires JWT.
 */
export async function listConnections(params: ListConnectionsParams) {
  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 20;

  const sortBy = params.sortBy ?? "name";
  const sortDir = params.sortDir ?? "desc";

  // Build a typed Prisma where-clause so TS can validate our query shape.
  const where: Prisma.ConnectionWhereInput = { userId: params.userId };

  // Optional filters
  if (params.status) where.status = params.status;

  // Basic text search across name, company, title, email
  if (params.q) {
    where.OR = [
      { name: { contains: params.q, mode: "insensitive" } },
      { company: { contains: params.q, mode: "insensitive" } },
      { title: { contains: params.q, mode: "insensitive" } },
      { email: { contains: params.q, mode: "insensitive" } },
      { phone: { contains: params.q, mode: "insensitive" } },
    ];
  }

  const skip = (page - 1) * pageSize;

  const [total, items] = await prisma.$transaction([
    prisma.connection.count({ where }),
    prisma.connection.findMany({
      where,
      orderBy: [{ [sortBy]: sortDir }, { updatedAt: "desc" }],
      skip,
      take: pageSize,
      select: connectionSelect,
    }),
  ]);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Gets a connection by ID for the current user.
 * Requires JWT.
 */
export async function getConnectionById(userId: string, id: string) {
  const conn = await prisma.connection.findFirst({
    where: { id, userId },
    select: connectionSelect,
  });

  if (!conn) throw new AppError("Connection not found", 404);
  return conn;
}

/**
 * Updates a connection for the current user.
 * Requires JWT.
 */
export async function updateConnection(
  userId: string,
  id: string,
  input: UpdateConnectionInput
) {
  const data: any = {};

  if (input.name !== undefined) data.name = input.name.trim();
  if (input.company !== undefined) data.company = normalizeNullableString(input.company);
  if (input.title !== undefined) data.title = normalizeNullableString(input.title);
  if (input.email !== undefined) data.email = normalizeNullableString(input.email);
  if (input.linkedInUrl !== undefined) data.linkedInUrl = normalizeNullableString(input.linkedInUrl);
  if (input.notes !== undefined) data.notes = normalizeNullableString(input.notes);
  if (input.phone !== undefined) data.phone = normalizeNullableString(input.phone);
  if (input.relationship !== undefined) data.relationship = normalizeNullableString(input.relationship);
  if (input.location !== undefined) data.location = normalizeNullableString(input.location);
  if (input.status !== undefined) data.status = input.status;

  return prisma.$transaction(async (db: Prisma.TransactionClient) => {
    const result = await db.connection.updateMany({
      where: { id, userId },
      data,
    });

    if (result.count === 0) throw new AppError("Connection not found", 404);

    return db.connection.findFirst({
      where: { id, userId },
      select: connectionSelect,
    });
  });
}

/**
 * Deletes a connection for the current user.
 * Requires JWT.
 */
export async function deleteConnection(userId: string, id: string) {
  const result = await prisma.connection.deleteMany({
    where: { id, userId },
  });

  if (result.count === 0) throw new AppError("Connection not found", 404);

  return { ok: true };
}


// Helper to normalize nullable string fields
const normalizeNullableString = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};
