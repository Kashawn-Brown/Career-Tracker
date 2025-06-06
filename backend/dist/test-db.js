/**
 * Database Connection Test Utility
 *
 * This file is used to verify that the database connection is working properly.
 * It creates a Prisma client instance and performs a simple query to test connectivity.
 * Useful for debugging database issues and verifying configuration during development.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function testConnection() {
    console.log('🔌 Testing database connection...');
    const result = await prisma.user.findMany(); // Or any simple query
    console.log('✅ Query test successful:', result);
    await prisma.$disconnect();
}
testConnection().catch((err) => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
});
//# sourceMappingURL=test-db.js.map