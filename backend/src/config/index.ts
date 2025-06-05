// Configuration settings for the backend

const config = {
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
    host: process.env.HOST || '0.0.0.0',
  },
  cors: {
    // In production, you would restrict this to specific origins
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL || 'http://localhost:3000'
      : true,
    credentials: true,
  },
  database: {
    // Database configuration with Prisma ORM
    url: process.env.DATABASE_URL || '',
  },
  // For file uploads (will be implemented in a later task)
  uploads: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  }
};

export default config; 