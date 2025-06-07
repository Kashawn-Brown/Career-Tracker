/**
 * This module initializes and exports a Prisma client instance for database interactions.
 * It implements a singleton pattern to prevent multiple client instances in development:
 * - Uses globalThis to store a single instance across hot reloads
 * - Configures logging based on environment (more verbose in development)
 * - Ensures only one database connection is maintained
 */
import { PrismaClient } from '@prisma/client';
// Define a type for the global object that will store our Prisma instance
const globalForPrisma = globalThis;
// Create a new Prisma instance if one doesn't exist, or use the existing one
// Configure logging based on environment - more verbose in development
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});
// Store the prisma instance on the global object in development
// This prevents multiple instances during hot reloading
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = prisma;
// Export the Prisma instance as default for convenience
export default prisma;
//# sourceMappingURL=prisma.js.map