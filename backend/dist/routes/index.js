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
    // Other routes will be registered here in future tasks
    // Example: fastify.register(require('./jobApplications'), { prefix: '/api/job-applications' });
}
//# sourceMappingURL=index.js.map