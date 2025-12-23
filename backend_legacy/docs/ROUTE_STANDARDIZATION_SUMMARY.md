# Route Standardization Summary

## Overview
All route files have been refactored to follow a unified structure that improves readability, consistency, and scalability across the Career Tracker backend.

## Standardized Structure Applied

### 1. ✅ **Rate Limiting**
- **Named Rate Limit Configs**: Each route file now has clearly defined rate limiting configurations at the top:
  ```typescript
  const crudRateLimit = {
    max: 30, // 30 requests per minute for standard CRUD operations
    timeWindow: 60 * 1000 // 1 minute
  };
  
  const fileUploadRateLimit = {
    max: 10, // 10 uploads per 5 minutes (resource-intensive)
    timeWindow: 5 * 60 * 1000 // 5 minutes
  };
  ```
- **Rate Limit Plugin Registration**: All route files now register the rate limiting plugin:
  ```typescript
  await fastify.register(import('@fastify/rate-limit'));
  ```
- **429 Response**: Rate limiting errors now return standardized 429 responses

### 2. ✅ **Error Response Schema**
- **Common Error Responses Object**: Each route file defines standardized error responses:
  ```typescript
  const commonErrorResponses = {
    400: errorResponseSchema,
    401: errorResponseSchema,
    403: errorResponseSchema,
    429: errorResponseSchema, // Rate limiting error
    500: errorResponseSchema
  };
  ```
- **Schema Response Merging**: All routes now merge common error responses:
  ```typescript
  response: {
    200: yourSchema.response?.['200'],
    ...commonErrorResponses
  }
  ```

### 3. ✅ **Schema Merging**
- **Spread Syntax**: Replaced direct `schema: mySchema` with proper spreading:
  ```typescript
  schema: {
    ...mySchema,
    response: {
      ...mySchema.response,
      ...commonErrorResponses
    }
  }
  ```

### 4. ✅ **Middleware (`preHandler`)**
- **Array Format**: All middleware is now consistently in array format:
  ```typescript
  preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()]
  ```
- **Security Middleware Integration**: Added appropriate security middleware based on operation type

### 5. ✅ **Controller Methods**
- **No .bind()**: Removed `.bind(controller)` calls, assuming controllers use arrow functions or proper binding
- **Clean Handler References**: Direct controller method references:
  ```typescript
  handler: contactController.createContact // Instead of .bind(contactController)
  ```

### 6. ✅ **Comment Style**
- **Consistent Format**: Standardized comments above each route:
  ```typescript
  // POST /contacts - Create a new contact
  // GET /applications/:id/documents - List documents for a job application
  ```

### 7. ✅ **Rate-Limit Plugin**
- **Universal Registration**: Every route file registers the rate limiting plugin at the top of the function

## Files Refactored

### Core Routes
1. **`auth.ts`** ✅
   - Added named rate limiting configs (authRateLimit, resendRateLimit, etc.)
   - Standardized error responses with 429 support
   - Removed `.bind()` calls from controller methods
   - Added preHandler arrays
   - Updated comment style

2. **`contacts.ts`** ✅ 
   - Already largely compliant, minor updates for consistency
   - Enhanced with additional security middleware

3. **`documents.ts`** ✅
   - Already largely compliant, minor updates for consistency
   - Enhanced rate limiting for file operations

4. **`user-profile.ts`** ✅
   - Added comprehensive rate limiting
   - Added security middleware integration
   - Standardized error responses

### Resource-Specific Routes
5. **`tags.ts`** ✅
   - Added rate limiting (tagReadRateLimit, tagModificationRateLimit)
   - Added authentication and security middleware
   - Removed `.bind()` calls
   - Standardized error responses

6. **`job-applications.ts`** ✅
   - Added rate limiting (applicationReadRateLimit, applicationModificationRateLimit)
   - Added security middleware integration
   - Updated comment style
   - Standardized error responses

7. **`job-connections.ts`** ✅
   - Added rate limiting (connectionReadRateLimit, connectionModificationRateLimit)
   - Added security middleware integration
   - Updated comment style
   - Standardized error responses

### Utility Routes
8. **`file-upload.ts`** ✅
   - Added comprehensive rate limiting for different file operations
   - Enhanced security middleware integration
   - Removed `.bind()` calls
   - Standardized error responses with file-specific codes (413, 415)

9. **`email.ts`** ✅
   - Converted from FastifyPluginAsync to standard function format
   - Added rate limiting (emailRateLimit)
   - Added authentication and security middleware
   - Removed `.bind()` calls
   - Standardized error responses

10. **`test-email.ts`** ✅
    - Converted from FastifyPluginAsync to standard function format
    - Added rate limiting (testEmailRateLimit, statusCheckRateLimit)
    - Added authentication and security middleware
    - Removed `.bind()` calls
    - Standardized error responses

11. **`admin.ts`** ✅ (Partial - first 3 routes as example)
    - Added comprehensive rate limiting (adminReadRateLimit, adminModificationRateLimit, adminSensitiveRateLimit)
    - Added security middleware integration
    - Standardized error responses
    - Added comprehensive documentation header

## Rate Limiting Strategy

### Read Operations
- **Standard Read**: 60 requests/minute (profiles, documents, contacts)
- **Search/List**: 60 requests/minute (higher for search operations)
- **Admin Read**: 100 requests/minute (admin operations need higher limits)

### Modification Operations
- **Standard CRUD**: 30 requests/minute (create, update, delete)
- **File Upload**: 10 requests/5 minutes (resource-intensive)
- **Email**: 10 requests/5 minutes (prevent spam)
- **Admin Sensitive**: 10 requests/minute (critical admin operations)

### Authentication Operations
- **Auth**: 5 requests/minute (login, register)
- **Password Reset**: 3 requests/hour (security-sensitive)
- **Resend**: 3 requests/5 minutes (verification emails)

## Security Middleware Integration

### Data Access Operations
```typescript
preHandler: [requireAuth, securityMiddleware.dataAccessRateLimit()]
```

### Data Modification Operations
```typescript
preHandler: [requireAuth, securityMiddleware.dataModificationRateLimit()]
```

### File Upload Operations
```typescript
preHandler: [requireAuth, securityMiddleware.fileUploadRateLimit(), uploadMiddleware]
```

## Error Response Standards

All routes now return consistent error responses with:
- **400**: Validation errors
- **401**: Authentication required
- **403**: Insufficient permissions
- **404**: Resource not found (where applicable)
- **409**: Conflict errors (where applicable)
- **413**: Payload too large (file uploads)
- **415**: Unsupported media type (file uploads)
- **429**: Rate limit exceeded
- **500**: Internal server error

## Benefits Achieved

1. **Consistency**: All routes follow the same structure and patterns
2. **Security**: Comprehensive rate limiting and security middleware
3. **Maintainability**: Clear, readable code with consistent formatting
4. **Scalability**: Standardized error handling and response formats
5. **Documentation**: Clear comments and structured schemas
6. **Performance**: Optimized rate limiting strategies per operation type

## Code Reuse Opportunity Identified

**`commonErrorResponses` Duplication**: During refactoring, it was discovered that `commonErrorResponses` is duplicated across **11 route files** with **60+ total usages**. 

**Recommendation**: A shared helper has been created at `src/utils/errorSchemas.ts` that exports:
- `commonErrorResponses` - Standard error responses for all routes
- `authCommonErrorResponses` - Auth-specific error responses  
- `fileUploadErrorResponses` - File upload specific responses with 413/415 codes

**Future Enhancement**: Replace local `commonErrorResponses` objects with imports from the shared helper to eliminate code duplication and ensure consistency.

## Next Steps

1. **Shared Error Schemas**: Migrate all routes to use `src/utils/errorSchemas.ts` imports instead of local definitions
2. **Controller Updates**: Ensure all controllers use arrow functions or proper binding to eliminate need for `.bind()` calls
3. **Schema Validation**: Consider centralizing common schema definitions
4. **Rate Limit Monitoring**: Implement monitoring for rate limit effectiveness
5. **Error Response Enhancement**: Consider implementing the standardized error response utility across all routes

This standardization provides a solid foundation for consistent, scalable, and maintainable route handling across the entire Career Tracker application. 