import jobApplicationRoutes from './job-applications.js';
import tagRoutes from './tags.js';
// This file will be used to register all routes
export default async function routes(fastify) {
    // Root route
    fastify.get('/', async () => {
        return { message: 'Career Tracker API' };
    });
    // Health check route
    fastify.get('/health', async () => {
        return { status: 'ok', timestamp: new Date().toISOString() };
    });
    // Register job application routes under /api prefix
    fastify.register(jobApplicationRoutes, { prefix: '/api' });
    // Register tag routes under /api prefix
    fastify.register(tagRoutes, { prefix: '/api' });
    // Other routes will be registered here in future tasks
}
//# sourceMappingURL=index.js.map