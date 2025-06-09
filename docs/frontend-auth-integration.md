# Frontend Authentication Integration Guide

This guide provides comprehensive documentation for integrating the Career Tracker authentication system with frontend applications.

## Table of Contents

1. [Authentication Flow Diagrams](#authentication-flow-diagrams)
2. [Token Storage Recommendations](#token-storage-recommendations)
3. [OAuth Redirect Handling](#oauth-redirect-handling)
4. [Automatic Token Refresh Implementation](#automatic-token-refresh-implementation)
5. [API Reference](#api-reference)
6. [Security Best Practices](#security-best-practices)

---

## Authentication Flow Diagrams

### 1. User Registration Flow

```
Frontend → Backend: POST /api/auth/register
                    { name, email, password }

Backend → Backend: Validate input & hash password
Backend → Backend: Create user (emailVerified: false)
Backend → Backend: Generate email verification token
Backend → EmailQueue: Queue verification email
Backend → Frontend: 201 Created + JWT tokens
                    { user, tokens: { access, refresh } }

EmailQueue → SendGrid: Process email job
SendGrid → User: Send verification email

User → Frontend: Click verification link
Frontend → Backend: POST /api/auth/verify-email
                    { token }
Backend → Backend: Mark user as verified
Backend → EmailQueue: Queue welcome email
Backend → Frontend: 200 Success
```

### 2. User Login Flow

```
Frontend → Backend: POST /api/auth/login
                    { email, password }

Backend → Backend: Validate credentials
Backend → Backend: Generate JWT tokens
Backend → Frontend: 200 Success + tokens
                    { user, tokens: { access, refresh } }

Frontend → Frontend: Store tokens securely
Frontend → Frontend: Redirect to dashboard
```

### 3. Protected Route Access Flow

```
Frontend → Backend: GET /api/job-applications
                    Authorization: Bearer <access_token>

Backend → Middleware: requireAuth middleware
Middleware → Middleware: Verify JWT signature
Middleware → Middleware: Check expiration

If Token valid:
    Middleware → Backend: Attach user to req.user
    Backend → Backend: Process request
    Backend → Frontend: 200 Success + data
    
If Token invalid/expired:
    Middleware → Frontend: 401 Unauthorized
    Frontend → Frontend: Attempt token refresh
```

---

## Token Storage Recommendations

### HTTP-Only Cookies (Recommended for Production)

**Advantages:**
- Immune to XSS attacks
- Automatically sent with requests
- Can be secured with SameSite and Secure flags

**Backend Implementation:**
```typescript
// Set HTTP-only cookies
res.cookie('accessToken', tokens.accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // HTTPS only in production
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000, // 15 minutes
  path: '/'
});

res.cookie('refreshToken', tokens.refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/api/auth/refresh'
});
```

**Frontend Implementation:**
```typescript
// No JavaScript access needed - tokens are automatically sent
const response = await fetch('/api/job-applications', {
  credentials: 'include' // Important: include cookies
});
```

### Local Storage (Current Implementation)

**Advantages:**
- Simple to implement
- Full JavaScript control
- Works well with SPAs

**Disadvantages:**
- Vulnerable to XSS attacks
- Requires manual token attachment

**Implementation:**
```typescript
// Store tokens
const storeTokens = (tokens: { accessToken: string; refreshToken: string }) => {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
};

// Retrieve and use tokens
const getAccessToken = (): string | null => {
  return localStorage.getItem('accessToken');
};

const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
  const token = getAccessToken();
  
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};
```

### Memory Storage (Most Secure)

**Advantages:**
- Immune to XSS and CSRF
- Cleared on page refresh/close

**Disadvantages:**
- Lost on page refresh
- Requires refresh token strategy

```typescript
class TokenManager {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  
  setTokens(tokens: { accessToken: string; refreshToken: string }) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
  }
  
  getAccessToken(): string | null {
    return this.accessToken;
  }
  
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }
}
```

---

## OAuth Redirect Handling

### Frontend OAuth Integration

```typescript
export const OAuthLogin: React.FC = () => {
  const [loading, setLoading] = useState(false);
  
  const handleOAuthLogin = async (provider: 'google' | 'linkedin') => {
    setLoading(true);
    
    try {
      // Get OAuth URL from backend
      const response = await fetch(`/api/auth/oauth/${provider}/url`);
      const { authUrl } = await response.json();
      
      // Open OAuth popup
      const popup = window.open(
        authUrl,
        'oauth-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );
      
      // Listen for success message
      const messageListener = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;
        
        if (event.data.type === 'OAUTH_SUCCESS') {
          popup?.close();
          storeTokens(event.data.tokens);
          window.location.href = '/dashboard';
        }
        
        if (event.data.type === 'OAUTH_ERROR') {
          popup?.close();
          console.error('OAuth error:', event.data.error);
        }
      };
      
      window.addEventListener('message', messageListener);
      
    } catch (error) {
      console.error('OAuth initialization error:', error);
      setLoading(false);
    }
  };
  
  return (
    <div>
      <button onClick={() => handleOAuthLogin('google')}>
        Continue with Google
      </button>
      <button onClick={() => handleOAuthLogin('linkedin')}>
        Continue with LinkedIn
      </button>
    </div>
  );
};
```

### OAuth Callback Handling

```typescript
// Backend OAuth callback sends success message to parent window
res.send(`
  <script>
    window.opener.postMessage({
      type: 'OAUTH_SUCCESS',
      tokens: ${JSON.stringify(tokens)}
    }, '${process.env.FRONTEND_URL}');
    window.close();
  </script>
`);
```

---

## Automatic Token Refresh Implementation

### Frontend Automatic Refresh

```typescript
class AuthManager {
  private refreshPromise: Promise<void> | null = null;
  
  async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    let response = await this.fetchWithAuth(url, options);
    
    // If token expired, try refresh
    if (response.status === 401) {
      await this.refreshAccessToken();
      response = await this.fetchWithAuth(url, options);
    }
    
    return response;
  }
  
  private async fetchWithAuth(url: string, options: RequestInit): Promise<Response> {
    const token = getAccessToken();
    
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
  }
  
  private async refreshAccessToken(): Promise<void> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }
    
    this.refreshPromise = this.doRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }
  
  private async doRefresh(): Promise<void> {
    try {
      const refreshToken = getRefreshToken();
      
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Refresh failed');
      }
      
      const data = await response.json();
      
      // Update stored tokens (if using localStorage)
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
      }
      
    } catch (error) {
      // Refresh failed - redirect to login
      this.clearTokens();
      window.location.href = '/login';
      throw error;
    }
  }
}

export const authManager = new AuthManager();
```

### Axios Interceptor Example

```typescript
import axios from 'axios';

// Request interceptor to add auth header
axios.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for automatic refresh
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        await authManager.refreshAccessToken();
        
        // Retry original request with new token
        const newToken = getAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed - redirect to login
        authManager.clearTokens();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

---

## API Reference

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "message": "User registered successfully. Please check your email for verification.",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": false,
    "role": "USER"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "john@example.com",
    "name": "John Doe",
    "emailVerified": true,
    "role": "USER"
  },
  "tokens": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "abc123def456..."
}
```

**Response:**
```json
{
  "message": "Email verified successfully! Welcome to Career Tracker."
}
```

#### Refresh Tokens
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:**
```json
{
  "message": "Tokens refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Resend Verification Email
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a new verification email has been sent."
}
```

#### Protected Route Example
```http
GET /api/job-applications
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (Success):**
```json
{
  "applications": [
    {
      "id": 1,
      "position": "Software Engineer",
      "company": "TechCorp",
      "status": "pending"
    }
  ]
}
```

**Response (Unauthorized):**
```json
{
  "error": "Authentication required",
  "message": "Please provide a valid access token"
}
```

### Error Responses

All authentication endpoints return standardized error responses:

#### 400 Bad Request
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "email",
      "message": "Invalid email format"
    },
    {
      "field": "password", 
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

#### 401 Unauthorized
```json
{
  "error": "Invalid credentials",
  "message": "Email or password is incorrect"
}
```

#### 403 Forbidden
```json
{
  "error": "Account not verified",
  "message": "Please verify your email before accessing this resource"
}
```

#### 429 Too Many Requests
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many login attempts. Please try again in 15 minutes."
}
```

---

## Security Best Practices

### 1. Token Security
- **Access tokens**: Short expiration (15 minutes)
- **Refresh tokens**: Longer expiration (7 days) with rotation
- **HTTP-only cookies**: Recommended for production
- **Secure flag**: Always use HTTPS in production

### 2. CSRF Protection
- Use `SameSite=Strict` for cookies
- Implement CSRF tokens for state-changing operations
- Validate `Origin` and `Referer` headers

### 3. XSS Prevention
- Sanitize all user inputs
- Use Content Security Policy (CSP)
- Avoid storing sensitive data in localStorage

### 4. Password Security
- Minimum 8 characters with complexity requirements
- bcrypt hashing with salt rounds ≥ 12
- Rate limiting on login attempts

### 5. General Security
- Always use HTTPS in production
- Implement proper CORS policies
- Regular security audits and dependency updates
- Monitor for suspicious activity

---

## Environment Variables

```bash
# Required for authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-refresh-token-secret-here

# OAuth providers (future implementation)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
LINKEDIN_CLIENT_ID=your-linkedin-client-id
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret

# URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3002

# Email service
SENDGRID_API_KEY=your-sendgrid-api-key
FROM_EMAIL=noreply@career-tracker.com
FROM_NAME=Career Tracker

# Redis (for queue)
REDIS_URL=redis://localhost:6379
```

---

## Implementation Checklist

### ✅ Completed
- [x] JWT middleware (requireAuth, extractUser, roleBasedAccess)
- [x] Email service with SendGrid integration
- [x] Background email queue with Bull/Redis
- [x] User registration with email verification
- [x] Login/logout functionality
- [x] Token refresh endpoint

### 🔄 Next Steps (Future Implementation)
- [ ] HTTP-only cookies for enhanced security
- [ ] OAuth providers (Google, LinkedIn)
- [ ] Automatic token refresh in frontend
- [ ] Rate limiting for authentication endpoints
- [ ] Session management for better UX
- [ ] Two-factor authentication for enterprise users

This documentation provides a complete guide for integrating the Career Tracker authentication system with any frontend framework while maintaining security best practices. 