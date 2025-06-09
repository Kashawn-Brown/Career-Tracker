# Authentication Flow Diagrams

Visual representation of the Career Tracker authentication system flows.

## Complete Registration & Verification Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │  Frontend   │    │  Backend    │    │ Email Queue │
│             │    │             │    │             │    │  (Redis)    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │                  │
        │ 1. Register      │                  │                  │
        │ ──────────────── │                  │                  │
        │                  │ 2. POST /api/auth/register         │
        │                  │ ──────────────── │                  │
        │                  │   {name, email,  │                  │
        │                  │    password}     │                  │
        │                  │                  │                  │
        │                  │                  │ 3. Validate &    │
        │                  │                  │    Hash Password │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │ 4. Create User   │
        │                  │                  │    (unverified)  │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │ 5. Generate      │
        │                  │                  │    Verification  │
        │                  │                  │    Token         │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │ 6. Queue Email   │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │ ✓
        │                  │ 7. 201 Created + │                  │
        │                  │    JWT Tokens    │                  │
        │                  │ ◄──────────────── │                  │
        │                  │                  │                  │
        │ 8. Success       │                  │                  │
        │    Message       │                  │                  │
        │ ◄──────────────── │                  │                  │
        │                  │                  │                  │
        │                  │                  │                  │ 9. Process
        │                  │                  │                  │    Email Job
        │                  │                  │                  │ ──────────
        │                  │                  │                  │
        │ 10. Verification │                  │                  │
        │     Email        │                  │                  │
        │ ◄──────────────────────────────────────────────────────── │
        │                  │                  │                  │
        │ 11. Click Link   │                  │                  │
        │ ──────────────── │                  │                  │
        │                  │ 12. POST /api/auth/verify-email    │
        │                  │ ──────────────── │                  │
        │                  │    {token}       │                  │
        │                  │                  │                  │
        │                  │                  │ 13. Verify Token │
        │                  │                  │     & Update User│
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │ 14. Queue        │
        │                  │                  │     Welcome Email│
        │                  │                  │ ──────────────── │
        │                  │                  │                  │ ✓
        │                  │ 15. 200 Success  │                  │
        │                  │ ◄──────────────── │                  │
        │                  │                  │                  │
        │ 16. Welcome      │                  │                  │
        │     Email        │                  │                  │
        │ ◄──────────────────────────────────────────────────────── │
```

## Login Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │  Frontend   │    │  Backend    │
│             │    │             │    │             │
└─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │
        │ 1. Enter         │                  │
        │    Credentials   │                  │
        │ ──────────────── │                  │
        │                  │ 2. POST /api/auth/login
        │                  │ ──────────────── │
        │                  │   {email,        │
        │                  │    password}     │
        │                  │                  │
        │                  │                  │ 3. Validate
        │                  │                  │    Credentials
        │                  │                  │ ──────────
        │                  │                  │
        │                  │                  │ 4. Generate
        │                  │                  │    JWT Tokens
        │                  │                  │ ──────────
        │                  │                  │
        │                  │ 5. 200 Success + │
        │                  │    User + Tokens │
        │                  │ ◄──────────────── │
        │                  │                  │
        │                  │ 6. Store Tokens  │
        │                  │ ──────────────── │
        │                  │                  │
        │ 7. Redirect to   │                  │
        │    Dashboard     │                  │
        │ ◄──────────────── │                  │
```

## Protected Route Access Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │    │  Backend    │    │ Auth        │    │ Resource    │
│             │    │             │    │ Middleware  │    │ Handler     │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │                  │
        │ 1. GET /api/job-applications        │                  │
        │    Authorization: Bearer <token>    │                  │
        │ ──────────────── │                  │                  │
        │                  │ 2. requireAuth   │                  │
        │                  │ ──────────────── │                  │
        │                  │                  │                  │
        │                  │                  │ 3. Verify JWT    │
        │                  │                  │    Signature     │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │ 4. Check         │
        │                  │                  │    Expiration    │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │ ── TOKEN VALID ── │
        │                  │                  │                  │
        │                  │                  │ 5. Attach        │
        │                  │                  │    req.user      │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │ 6. Continue to   │                  │
        │                  │    Route Handler │                  │
        │                  │ ──────────────── │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │                  │ 7. Process
        │                  │                  │                  │    Request
        │                  │                  │                  │ ──────────
        │                  │                  │                  │
        │                  │ 8. Return Data   │                  │
        │                  │ ◄────────────────────────────────── │
        │                  │                  │                  │
        │ 9. 200 Success + │                  │                  │
        │    Data          │                  │                  │
        │ ◄──────────────── │                  │                  │
```

## Token Refresh Flow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Frontend   │    │  Backend    │    │ Auth        │
│             │    │             │    │ Middleware  │
└─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │
        │ 1. API Request   │                  │
        │    (Expired Token) ────────────── │ │
        │                  │                  │
        │                  │                  │ 2. Token
        │                  │                  │    Validation
        │                  │                  │    FAILS
        │                  │                  │ ──────────
        │                  │                  │
        │                  │ 3. 401           │
        │                  │    Unauthorized  │
        │ ◄──────────────── │ ◄──────────────── │
        │                  │                  │
        │ 4. Detect 401    │                  │
        │    Auto-Refresh  │                  │
        │ ──────────────── │                  │
        │                  │                  │
        │ 5. POST /api/auth/refresh           │
        │    {refreshToken} ──────────────── │ │
        │                  │                  │
        │                  │ 6. Verify        │
        │                  │    Refresh Token │
        │                  │ ──────────────── │
        │                  │                  │
        │                  │ 7. Generate New  │
        │                  │    Access Token  │
        │                  │ ──────────────── │
        │                  │                  │
        │ 8. New Token     │                  │
        │ ◄──────────────── │                  │
        │                  │                  │
        │ 9. Retry Original│                  │
        │    Request       │                  │
        │    (New Token)   │                  │
        │ ──────────────── │                  │
        │                  │                  │
        │ 10. 200 Success  │                  │
        │ ◄──────────────── │                  │
```

## OAuth Flow (Future Implementation)

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │    │  Frontend   │    │  Backend    │    │ OAuth       │
│             │    │             │    │             │    │ Provider    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │                  │
        │ 1. Click "Login  │                  │                  │
        │    with Google"  │                  │                  │
        │ ──────────────── │                  │                  │
        │                  │ 2. Request OAuth │                  │
        │                  │    URL           │                  │
        │                  │ ──────────────── │                  │
        │                  │                  │                  │
        │                  │ 3. OAuth URL +   │                  │
        │                  │    State         │                  │
        │                  │ ◄──────────────── │                  │
        │                  │                  │                  │
        │                  │ 4. Redirect to   │                  │
        │                  │    OAuth Provider│                  │
        │                  │ ─────────────────────────────────── │
        │                  │                  │                  │
        │ 5. Show Consent  │                  │                  │
        │    Screen        │                  │                  │
        │ ◄────────────────────────────────────────────────────── │
        │                  │                  │                  │
        │ 6. Grant         │                  │                  │
        │    Permission    │                  │                  │
        │ ─────────────────────────────────────────────────────── │
        │                  │                  │                  │
        │                  │                  │ 7. Callback with │
        │                  │                  │    Auth Code     │
        │                  │                  │ ◄──────────────── │
        │                  │                  │                  │
        │                  │                  │ 8. Exchange Code │
        │                  │                  │    for Tokens    │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │ 9. Get User      │
        │                  │                  │    Profile       │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │ 10. Create/Update│
        │                  │                  │     User         │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │                  │ 11. Generate JWT │
        │                  │                  │     Tokens       │
        │                  │                  │ ──────────────── │
        │                  │                  │                  │
        │                  │ 12. Redirect to  │                  │
        │                  │     Frontend     │                  │
        │                  │     with Tokens  │                  │
        │                  │ ◄──────────────── │                  │
        │                  │                  │                  │
        │ 13. Login        │                  │                  │
        │     Successful   │                  │                  │
        │ ◄──────────────── │                  │                  │
```

## Legend

```
──────────── HTTP Request/Response
◄──────────── Response/Callback
│            Processing/Internal Operation
✓            Background Job Completed
```

## Key Security Points

1. **JWT Access Tokens**: Short-lived (15 minutes)
2. **Refresh Tokens**: Longer-lived (7 days) for seamless UX
3. **Email Verification**: Required before full account access
4. **Background Processing**: Email sending doesn't block API responses
5. **Automatic Refresh**: Transparent token renewal for users
6. **HTTPS Only**: All production traffic encrypted
7. **HTTP-Only Cookies**: Recommended for production (XSS protection) 