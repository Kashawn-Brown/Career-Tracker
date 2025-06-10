# Admin User Bootstrap Strategies

This document outlines common business practices for creating the first admin user(s) in production applications.

## The Problem

All applications with role-based access control face the "chicken and egg" problem:
- Regular users register with `USER` role by default
- Admin functions require `ADMIN` role
- How do you create the first admin when no admins exist?

## Common Enterprise Solutions

### 1. **Database Seeding Scripts** (Most Common ⭐)

**How it works:**
- Scripts run during initial deployment/migration
- Create admin users with predefined credentials
- Usually part of automated deployment process

**Implementation:**
```typescript
// prisma/seeds/admin.seed.ts
await prisma.user.upsert({
  where: { email: 'admin@company.com' },
  update: {},
  create: {
    email: 'admin@company.com',
    name: 'System Administrator',
    role: 'ADMIN',
    password: await hashPassword(process.env.INITIAL_ADMIN_PASSWORD),
    emailVerified: true
  }
});
```

**Pros:** Predictable, automated, version controlled
**Cons:** Requires deployment pipeline changes

### 2. **Environment-Driven Admin Creation** (Common)

**How it works:**
- Server checks for admin users on startup
- Creates one automatically if none exist
- Uses environment variables for credentials

**Implementation:**
```typescript
// src/services/bootstrap.service.ts
async function ensureAdminExists() {
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  
  if (adminCount === 0 && process.env.AUTO_CREATE_ADMIN === 'true') {
    await createAdminUser({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      name: 'Auto-Generated Admin'
    });
  }
}
```

**Pros:** Self-healing, flexible, no deployment dependencies
**Cons:** Requires careful environment variable management

### 3. **CLI Management Commands** (Developer Friendly)

**How it works:**
- Command-line tools for admin operations
- Can create admins or promote existing users
- Usually npm scripts or custom CLI tools

**Implementation:**
```bash
# Create new admin
npm run admin:create --email=admin@company.com --name="John Admin"

# Promote existing user
npm run admin:promote --email=existing-user@company.com

# List all admins
npm run admin:list
```

**Pros:** Flexible, auditable, can be run post-deployment
**Cons:** Requires manual execution, operational overhead

### 4. **Special Registration Endpoints** (Temporary)

**How it works:**
- Protected endpoints that create admin users
- Usually secured by secret tokens/keys
- Often disabled after initial setup

**Implementation:**
```typescript
// POST /api/admin/bootstrap
// Headers: { "X-Bootstrap-Secret": "secret-from-env" }
app.post('/api/admin/bootstrap', (req, res) => {
  if (req.headers['x-bootstrap-secret'] !== process.env.BOOTSTRAP_SECRET) {
    return res.status(403).json({ error: 'Invalid bootstrap secret' });
  }
  
  // Create admin user...
});
```

**Pros:** HTTP-based, can be done remotely
**Cons:** Security risk if not properly disabled, complex setup

### 5. **Database Direct Access** (Emergency Only)

**How it works:**
- Direct database manipulation
- Raw SQL or ORM commands
- Usually only for emergencies

**Implementation:**
```sql
-- Direct PostgreSQL
UPDATE users 
SET role = 'ADMIN' 
WHERE email = 'user@company.com';
```

**Pros:** Always works, bypasses application logic
**Cons:** No validation, no audit trail, requires database access

## Security Considerations

### Password Management
- **Never hardcode passwords** in source code
- Use strong, randomly generated initial passwords
- **Force password change** on first login
- Consider using temporary passwords with expiration

### Access Control
- **Limit who can create admins** (separate from regular user registration)
- **Audit all admin creation** events
- **Use principle of least privilege** (start with minimal admin permissions)

### Environment Security
- **Secure environment variables** containing admin credentials
- **Rotate bootstrap secrets** regularly
- **Disable bootstrap endpoints** after initial setup

## Recommended Approach for Career Tracker

For this application, I recommend a **hybrid approach**:

1. **Primary:** Environment-driven creation on startup
   - Check for admin users on server start
   - Create one if none exist using env variables
   - Force password change on first login

2. **Secondary:** CLI commands for ongoing management
   - Promote existing users to admin
   - Create additional admins
   - List/audit admin users

3. **Emergency:** Database direct access documented procedure
   - Clear instructions for emergency admin creation
   - Only for production issues

## Implementation Priority

This admin bootstrap functionality is **not part of Task 2.5** (User Profile Routes), but should be considered for a future task focused on admin/user management features.

---

*Last updated: 2025-06-10*
*Related to: User management, authentication, role-based access control* 