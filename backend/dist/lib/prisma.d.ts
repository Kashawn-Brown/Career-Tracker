/**
 * This module initializes and exports a Prisma client instance for database interactions.
 * It implements a singleton pattern to prevent multiple client instances in development:
 * - Uses globalThis to store a single instance across hot reloads
 * - Configures logging based on environment (more verbose in development)
 * - Ensures only one database connection is maintained
 */
import { PrismaClient } from '@prisma/client';
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export default prisma;
//# sourceMappingURL=prisma.d.ts.map