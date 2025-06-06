# Database Access Layer (Repository Pattern)

This directory contains the database access layer implementation using the Repository pattern. It provides a clean abstraction over Prisma ORM with comprehensive CRUD operations, transaction support, error handling, and utility functions.

## Architecture Overview

The repository layer is structured as follows:

```
repositories/
├── base.repository.ts          # Abstract base repository with generic CRUD operations
├── user.repository.ts          # User-specific database operations
├── job-application.repository.ts # Job application operations with complex filtering
├── contact.repository.ts       # Contact management operations
├── tag.repository.ts          # Tag operations with bulk management
├── job-connection.repository.ts # Job connection tracking operations
├── document.repository.ts     # Document management operations
├── utils.ts                   # Utility functions and complex operations
├── index.ts                   # Centralized exports and repository instances
└── README.md                  # This documentation
```

## Key Features

### 🔧 Base Repository
- **Generic CRUD Operations**: Create, Read, Update, Delete with type safety
- **Transaction Support**: All operations support Prisma transactions
- **Pagination**: Built-in pagination with metadata
- **Error Handling**: Comprehensive error logging and handling
- **Flexible Querying**: Support for complex where clauses, includes, and ordering

### 🔒 Transaction Support
All repository methods accept an optional transaction client parameter, enabling:
- **Atomic Operations**: Multiple operations in a single transaction
- **Data Consistency**: Rollback on errors
- **Performance**: Reduced database round trips

### 📊 Advanced Features
- **Bulk Operations**: Efficient batch processing
- **Search Utilities**: Global and advanced search capabilities
- **Analytics**: Dashboard data and metrics calculation
- **Validation**: Input validation and sanitization

## Usage Examples

### Basic CRUD Operations

```typescript
import { repositories } from './repositories';

// Create a user
const user = await repositories.user.create({
  email: 'john@example.com',
  name: 'John Doe',
});

// Find user by ID with relations
const userWithData = await repositories.user.findByIdWithRelations(user.id);

// Update user
const updatedUser = await repositories.user.update(user.id, {
  name: 'John Smith',
});

// Delete user
await repositories.user.delete(user.id);
```

### Transaction Example

```typescript
import { withTransaction } from './repositories/utils';

const result = await withTransaction(async (tx) => {
  // Create job application
  const jobApp = await repositories.jobApplication.create({
    company: 'Tech Corp',
    position: 'Software Engineer',
    user: { connect: { id: userId } },
  }, tx);

  // Add tags
  await repositories.tag.createManyForJobApplication(
    jobApp.id, 
    ['javascript', 'react', 'node.js'], 
    tx
  );

  // Add document
  await repositories.document.create({
    fileUrl: 'https://example.com/resume.pdf',
    fileName: 'resume.pdf',
    type: 'resume',
    jobApplication: { connect: { id: jobApp.id } },
  }, tx);

  return jobApp;
});
```

### Advanced Filtering

```typescript
// Job applications with complex filters
const applications = await repositories.jobApplication.findByUserWithFilters(
  userId,
  {
    status: 'applied',
    dateFrom: new Date('2024-01-01'),
    dateTo: new Date('2024-12-31'),
    salaryMin: 80000,
    isStarred: true,
  },
  {
    pagination: { page: 1, limit: 10 },
    orderBy: { dateApplied: 'desc' },
  }
);
```

### Search Operations

```typescript
import { SearchUtils } from './repositories/utils';

// Global search across all user data
const searchResults = await SearchUtils.globalSearch(
  userId, 
  'software engineer',
  { pagination: { page: 1, limit: 20 } }
);

// Advanced job application search
const advancedResults = await SearchUtils.advancedJobApplicationSearch(
  userId,
  {
    query: 'react',
    status: 'applied',
    salaryMin: 70000,
    tags: ['javascript', 'frontend'],
    hasDocuments: true,
  },
  {
    pagination: { page: 1, limit: 10 },
    orderBy: 'salary',
    orderDirection: 'desc',
  }
);
```

### Analytics and Dashboard Data

```typescript
import { AnalyticsUtils } from './repositories/utils';

// Get comprehensive dashboard data
const dashboardData = await AnalyticsUtils.getUserDashboardData(userId);

// Get application metrics
const metrics = await AnalyticsUtils.getApplicationMetrics(
  userId, 
  'month'
);
```

### Bulk Operations

```typescript
import { BulkOperations } from './repositories/utils';

// Create multiple job applications with relations
const applications = await BulkOperations.createJobApplicationsWithRelations(
  userId,
  [
    {
      company: 'Tech Corp',
      position: 'Frontend Developer',
      tags: ['react', 'typescript'],
      documents: [{
        fileUrl: 'https://example.com/resume.pdf',
        fileName: 'resume.pdf',
        type: 'resume',
      }],
      jobConnections: [{
        name: 'Jane Smith',
        email: 'jane@techcorp.com',
        connectionType: 'recruiter',
      }],
    },
    // ... more applications
  ]
);
```

## Repository-Specific Features

### UserRepository
- Find by email
- User statistics
- Profile updates
- Email validation
- Search users

### JobApplicationRepository
- Complex filtering (status, date range, salary, etc.)
- Starred applications
- Upcoming follow-ups
- Search functionality
- Application statistics
- Status management

### ContactRepository
- Filter by company, role, connection type
- LinkedIn profile filtering
- Contact statistics
- Search across all contact fields
- Email and phone validation

### TagRepository
- Popular tags analysis
- Bulk tag operations
- Tag replacement for job applications
- Unique tag labels
- Tag statistics

### JobConnectionRepository
- Filter by status and connection type
- Follow-up tracking
- Contact relationship management
- Connection statistics
- Search functionality

### DocumentRepository
- File type filtering
- Size-based queries
- Recent uploads tracking
- File extension analysis
- Document statistics

## Error Handling

The repository layer includes comprehensive error handling:

```typescript
// Automatic error logging with context
try {
  const user = await repositories.user.findById(999);
} catch (error) {
  // Error is automatically logged with operation context
  // Error: User Repository - findById failed: Record not found
}
```

Error types handled:
- **PrismaClientKnownRequestError**: Database constraint violations, not found errors
- **PrismaClientUnknownRequestError**: Unknown database errors
- **PrismaClientValidationError**: Input validation errors
- **PrismaClientInitializationError**: Database connection issues

## Performance Considerations

### Pagination
All list operations support pagination to prevent memory issues:

```typescript
const paginatedResults = await repositories.jobApplication.findManyWithPagination(
  { userId },
  {
    pagination: { page: 1, limit: 20 },
    include: { tags: true, documents: true },
  }
);
```

### Selective Loading
Use `include` parameters to load only necessary relations:

```typescript
// Load only specific relations
const jobApp = await repositories.jobApplication.findById(id, {
  tags: true,
  documents: { select: { fileName: true, type: true } },
});
```

### Transactions
Use transactions for operations affecting multiple tables:

```typescript
// Atomic operation ensuring data consistency
await withTransaction(async (tx) => {
  await repositories.jobApplication.delete(jobAppId, tx);
  await repositories.tag.deleteByJobApplication(jobAppId, tx);
  await repositories.document.deleteMany({ jobApplicationId: jobAppId }, tx);
});
```

## Testing

The repository layer is designed to be easily testable:

```typescript
// Mock transaction client for testing
const mockTx = {} as Prisma.TransactionClient;

// Test repository methods with mocked transaction
const result = await repositories.user.create(userData, mockTx);
```

## Best Practices

1. **Always use transactions** for operations affecting multiple tables
2. **Use pagination** for list operations that might return large datasets
3. **Include only necessary relations** to optimize query performance
4. **Validate input data** using the ValidationUtils before database operations
5. **Handle errors appropriately** and let the repository layer log them
6. **Use the utility functions** for complex operations rather than writing custom queries
7. **Leverage the search utilities** for user-facing search functionality

## Integration with Controllers

The repository layer integrates seamlessly with Express controllers:

```typescript
// In a controller
import { repositories } from '../repositories';

export const getJobApplications = async (req: Request, res: Response) => {
  try {
    const { userId } = req.user;
    const { page = 1, limit = 10, status } = req.query;

    const applications = await repositories.jobApplication.findByUserWithFilters(
      userId,
      { status: status as string },
      { pagination: { page: Number(page), limit: Number(limit) } }
    );

    res.json(applications);
  } catch (error) {
    // Error is already logged by repository layer
    res.status(500).json({ error: 'Failed to fetch job applications' });
  }
};
```

This repository layer provides a robust, type-safe, and feature-rich foundation for all database operations in the Career Tracker application. 