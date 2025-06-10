# UserAuth Separation Implementation Plan

## Overview
This document outlines the comprehensive plan for separating authentication-related fields from the User model into a dedicated UserAuth table. This refactoring will improve data organization and separation of concerns.

## Current State
The User model currently contains mixed concerns:
- Core user data (id, email, name, role)
- Authentication data (password, provider, providerId, emailVerified)
- Profile data (resumeLink, githubLink, linkedinLink)
- Email management (secondaryEmail, secondaryEmailVerified)

## Target Architecture
After separation:
- **User**: Core identity and profile data
- **UserAuth**: All authentication-related data
- **UserSecurity**: Account lockout and security data (separate effort)

---

## Phase 1: Database Schema Changes

### 1.1 Create UserAuth Model
```prisma
model UserAuth {
  id            String       @id @default(cuid())
  userId        Int          @unique
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  password      String?
  provider      AuthProvider @default(LOCAL)
  providerId    String?
  emailVerified Boolean      @default(false)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  @@index([provider, providerId])
  @@map("user_auth")
}
```

### 1.2 Update User Model
**Remove these fields:**
- `password`
- `provider` 
- `providerId`
- `emailVerified`

**Add this relation:**
- `userAuth UserAuth?`

### 1.3 Migration Strategy
1. Create `UserAuth` table
2. Migrate existing data:
   ```sql
   INSERT INTO user_auth (userId, password, provider, providerId, emailVerified) 
   SELECT id, password, provider, providerId, emailVerified FROM users
   ```
3. Drop columns from `users` table
4. Update foreign key constraints
5. Verify data integrity

---

## Phase 2: Type System Updates

### 2.1 Prisma Generated Types
- All existing `User` types will lose auth fields
- Need to update imports where auth data is needed

### 2.2 Custom Type Definitions
```typescript
// New composite types needed
type UserWithAuth = User & { userAuth: UserAuth };
type UserAuthData = Pick<UserAuth, 'password' | 'provider' | 'providerId' | 'emailVerified'>;

// Update existing interfaces
interface LoginRequest { /* no changes */ }
interface RegisterRequest { /* no changes */ }
// But response types need updating to include userAuth relation
```

### 2.3 Database Query Updates
```typescript
// OLD PATTERN:
const user = await prisma.user.findUnique({ where: { email } });
if (user.password) { /* ... */ }

// NEW PATTERN:
const user = await prisma.user.findUnique({ 
  where: { email }, 
  include: { userAuth: true } 
});
if (user.userAuth?.password) { /* ... */ }
```

---

## Phase 3: Service Layer Refactoring

### 3.1 AuthService Changes

**Field Access Pattern Changes:**
```typescript
// OLD -> NEW
user.password -> user.userAuth?.password
user.emailVerified -> user.userAuth?.emailVerified
user.provider -> user.userAuth?.provider
user.providerId -> user.userAuth?.providerId
```

**Methods Requiring Complete Rewrite:**

**hashPassword()**
- OLD: Update user record directly
- NEW: Create/update UserAuth record

**verifyPassword()**
- OLD: Access user.password directly
- NEW: Load UserAuth relation, access userAuth.password

**updatePassword()**
- OLD: Update user.password
- NEW: Update userAuth.password via relation

**verifyEmail()**
- OLD: Update user.emailVerified
- NEW: Update userAuth.emailVerified

### 3.2 UserService Changes

**Registration Flow:**
```typescript
// OLD: Single user creation
const user = await prisma.user.create({
  data: { email, name, password: hashedPassword }
});

// NEW: Transaction with User + UserAuth
const user = await prisma.$transaction(async (tx) => {
  const newUser = await tx.user.create({
    data: { email, name }
  });
  
  await tx.userAuth.create({
    data: {
      userId: newUser.id,
      password: hashedPassword,
      emailVerified: false
    }
  });
  
  return newUser;
});
```

**Profile Updates:**
- Most remain the same
- Any auth-related updates must target UserAuth table

**User Deletion:**
- Cascade should handle UserAuth automatically
- Verify in tests

### 3.3 OAuth Service Changes

**Provider Linking:**
```typescript
// OLD: Update user fields directly
await prisma.user.update({
  where: { id },
  data: { provider, providerId }
});

// NEW: Update via UserAuth relation
await prisma.userAuth.update({
  where: { userId: id },
  data: { provider, providerId }
});
```

**Account Merging:**
- More complex - need to handle UserAuth records
- May need to merge UserAuth data during account linking

---

## Phase 4: Route Handler Updates

### 4.1 Authentication Routes (`/auth/*`)

**Login Route (`/auth/login`):**
```typescript
// OLD:
const user = await prisma.user.findUnique({ where: { email }});
if (!user?.password) throw new Error('Invalid credentials');

// NEW:
const user = await prisma.user.findUnique({ 
  where: { email }, 
  include: { userAuth: true }
});
if (!user?.userAuth?.password) throw new Error('Invalid credentials');
```

**Register Route (`/auth/register`):**
```typescript
// OLD: Single user creation with password
const user = await userService.createUser({ email, name, password });

// NEW: Transaction-based creation
const user = await userService.createUserWithAuth({ email, name, password });
```

**Email Verification (`/auth/verify-email`):**
```typescript
// OLD:
await prisma.user.update({
  where: { id: userId },
  data: { emailVerified: true }
});

// NEW:
await prisma.userAuth.update({
  where: { userId },
  data: { emailVerified: true }
});
```

**Password Reset (`/auth/reset-password`):**
```typescript
// OLD:
await prisma.user.update({
  where: { id: userId },
  data: { password: newHashedPassword }
});

// NEW:
await prisma.userAuth.update({
  where: { userId },
  data: { password: newHashedPassword }
});
```

### 4.2 OAuth Routes (`/auth/google`, `/auth/github`)

**Provider Callback Handling:**
```typescript
// OLD: Single upsert with mixed data
const user = await prisma.user.upsert({
  where: { email },
  create: { email, name, provider, providerId },
  update: { provider, providerId }
});

// NEW: Separate User and UserAuth handling
const user = await prisma.$transaction(async (tx) => {
  const user = await tx.user.upsert({
    where: { email },
    create: { email, name },
    update: { name }
  });
  
  await tx.userAuth.upsert({
    where: { userId: user.id },
    create: { userId: user.id, provider, providerId, emailVerified: true },
    update: { provider, providerId }
  });
  
  return user;
});
```

### 4.3 User Profile Routes
- Most profile routes unaffected
- Routes that check authentication status need userAuth inclusion
- Provider-specific logic needs userAuth data

---

## Phase 5: Middleware Updates

### 5.1 Authentication Middleware
```typescript
// authenticate.middleware.ts

// OLD: Direct password check
if (user.provider === 'LOCAL' && !user.password) {
  throw new Error('Account setup incomplete');
}

// NEW: UserAuth relation check
if (user.userAuth?.provider === 'LOCAL' && !user.userAuth.password) {
  throw new Error('Account setup incomplete');
}
```

**Session Validation:**
- Need to include userAuth in user queries for auth checks
- Update middleware to load userAuth when needed

### 5.2 Authorization Middleware
- Most authorization checks on `user.role` stay the same
- Provider-specific checks need `user.userAuth?.provider`
- Email verification checks need `user.userAuth?.emailVerified`

---

## Phase 6: Utility and Helper Updates

### 6.1 Database Query Helpers
```typescript
// Create reusable query helpers
const getUserWithAuth = (where: Prisma.UserWhereUniqueInput) =>
  prisma.user.findUnique({ 
    where, 
    include: { userAuth: true }
  });

const getUsersWithAuth = (where?: Prisma.UserWhereInput) =>
  prisma.user.findMany({ 
    where, 
    include: { userAuth: true }
  });
```

### 6.2 Validation Schemas
```typescript
// Request schemas mostly unchanged (validate input data)
// Response schemas need updating for nested userAuth structure

// OLD response schema:
const UserResponse = z.object({
  id: z.number(),
  email: z.string(),
  emailVerified: z.boolean(),
  provider: z.enum(['LOCAL', 'GOOGLE', 'GITHUB'])
});

// NEW response schema:
const UserResponse = z.object({
  id: z.number(),
  email: z.string(),
  userAuth: z.object({
    emailVerified: z.boolean(),
    provider: z.enum(['LOCAL', 'GOOGLE', 'GITHUB'])
  }).optional()
});
```

---

## Phase 7: Test Updates

### 7.1 Unit Tests
```typescript
// Auth service tests need updates:

// OLD test data:
const mockUser = {
  id: 1,
  email: 'test@example.com',
  password: 'hashed_password',
  emailVerified: true
};

// NEW test data:
const mockUser = {
  id: 1,
  email: 'test@example.com',
  userAuth: {
    password: 'hashed_password',
    emailVerified: true,
    provider: 'LOCAL'
  }
};
```

**Test Updates Needed:**
- Mock userAuth relation in test data
- Update assertions from `user.password` to `user.userAuth?.password`
- Add transaction tests for user+userAuth creation
- Test userAuth cascade deletion

### 7.2 Integration Tests
- API tests mostly unchanged (request/response format similar)
- Database assertions need updating to check UserAuth table
- Seed data needs UserAuth records

### 7.3 Mock Data Updates
```typescript
// Test fixtures need userAuth objects
const createTestUser = async (overrides = {}) => {
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
      ...overrides
    }
  });
  
  await prisma.userAuth.create({
    data: {
      userId: user.id,
      password: 'hashed_password',
      emailVerified: true,
      provider: 'LOCAL'
    }
  });
  
  return prisma.user.findUnique({
    where: { id: user.id },
    include: { userAuth: true }
  });
};
```

---

## Phase 8: Performance Considerations

### 8.1 Query Optimization
```typescript
// Avoid N+1 queries when loading multiple users
const usersWithAuth = await prisma.user.findMany({
  include: { userAuth: true }
});

// Consider selective loading based on use case
const publicProfile = await prisma.user.findUnique({
  where: { id },
  select: { id: true, email: true, name: true } // No auth data
});

const fullProfile = await prisma.user.findUnique({
  where: { id },
  include: { userAuth: true } // With auth data
});
```

### 8.2 Caching Updates
- Session caching might need userAuth data
- Cache invalidation on userAuth updates
- Consider caching strategies for frequently accessed auth data

---

## Phase 9: Migration & Deployment Strategy

### 9.1 Data Migration Script
```sql
-- 1. Backup existing data
CREATE TABLE users_backup AS SELECT * FROM users;

-- 2. Create UserAuth table (via Prisma migrate)
-- (Prisma will generate this)

-- 3. Migrate existing data
INSERT INTO user_auth (userId, password, provider, providerId, emailVerified, createdAt, updatedAt)
SELECT id, password, provider, providerId, emailVerified, NOW(), NOW() 
FROM users 
WHERE password IS NOT NULL OR provider != 'LOCAL';

-- 4. Verify data integrity
SELECT 
  (SELECT COUNT(*) FROM users WHERE password IS NOT NULL) as users_with_password,
  (SELECT COUNT(*) FROM user_auth WHERE password IS NOT NULL) as userauth_with_password;

-- 5. Drop old columns (via Prisma migrate)
-- (Prisma will generate this)
```

### 9.2 Rollback Plan
```sql
-- Script to reverse migration if needed
-- 1. Re-add columns to User table
ALTER TABLE users 
ADD COLUMN password VARCHAR(255),
ADD COLUMN provider VARCHAR(50) DEFAULT 'LOCAL',
ADD COLUMN providerId VARCHAR(255),
ADD COLUMN emailVerified BOOLEAN DEFAULT false;

-- 2. Migrate data back
UPDATE users 
SET 
  password = ua.password,
  provider = ua.provider,
  providerId = ua.providerId,
  emailVerified = ua.emailVerified
FROM user_auth ua 
WHERE users.id = ua.userId;

-- 3. Drop UserAuth table
DROP TABLE user_auth;
```

### 9.3 Zero-Downtime Deployment
1. **Phase 1**: Deploy code that supports both patterns
2. **Phase 2**: Run migration to create UserAuth and migrate data
3. **Phase 3**: Deploy code that uses only new pattern
4. **Phase 4**: Remove old column support

---

## Phase 10: Affected Files Inventory

### Backend Files Requiring Updates:

**Database & Schema:**
- `prisma/schema.prisma` - Core model changes
- `prisma/migrations/` - New migration files

**Services:**
- `src/services/auth.service.ts` - Major refactoring
- `src/services/user.service.ts` - Registration and user management
- `src/services/oauth.service.ts` - Provider integration
- `src/services/email.service.ts` - Email verification flows

**Routes:**
- `src/routes/auth.routes.ts` - All auth endpoints
- `src/routes/user.routes.ts` - User profile management
- `src/routes/oauth.routes.ts` - OAuth callbacks

**Middleware:**
- `src/middleware/authenticate.middleware.ts` - Authentication checks
- `src/middleware/authorize.middleware.ts` - Authorization logic

**Types & Schemas:**
- `src/types/auth.types.ts` - Type definitions
- `src/schemas/auth.schemas.ts` - Response schemas
- `src/schemas/user.schemas.ts` - User response schemas

**Tests:**
- `src/tests/auth.test.ts` - Authentication tests
- `src/tests/user.test.ts` - User service tests
- `src/tests/oauth.test.ts` - OAuth integration tests
- `src/tests/fixtures/` - Test data fixtures
- `src/tests/helpers/` - Test helper functions

**Database:**
- `prisma/seed.ts` - Seed data updates
- Database migration files

---

## Estimated Effort & Timeline

**Total Estimated Effort:** 2-3 days

**Breakdown:**
- Day 1: Schema changes, basic service updates, migration
- Day 2: Route handlers, middleware, core functionality
- Day 3: Tests, edge cases, deployment verification

**Risk Factors:**
- OAuth integration complexity
- Transaction handling for user creation
- Test data setup complexity
- Potential performance impacts

**Success Criteria:**
- All existing functionality works unchanged
- Clean separation of concerns achieved
- No data loss during migration
- All tests pass
- Performance maintained or improved

---

## Notes for Future Implementation

**Pre-Implementation Checklist:**
- [ ] Create comprehensive test coverage for current auth flows
- [ ] Document current API contracts
- [ ] Set up staging environment for migration testing
- [ ] Plan rollback procedures
- [ ] Review performance baseline

**During Implementation:**
- [ ] Implement changes incrementally
- [ ] Test each phase thoroughly
- [ ] Monitor performance impacts
- [ ] Validate data integrity at each step

**Post-Implementation:**
- [ ] Monitor error rates
- [ ] Verify all auth flows work correctly
- [ ] Update documentation
- [ ] Plan cleanup of any temporary code

This separation will significantly improve the codebase architecture and make future auth-related changes much cleaner to implement. 