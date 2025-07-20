# Authentication System Documentation

## Overview

This backend implements a complete OAuth flow with Google and JWT-based authentication for the AI Slop Detector Chrome extension.

## Architecture

### OAuth Flow
1. **Chrome Extension** → Google OAuth popup
2. **Google** → Returns ID token to extension
3. **Extension** → Sends ID token to `/google/sign_in`
4. **Backend** → Validates ID token with Google
5. **Backend** → Creates/updates user in database
6. **Backend** → Returns JWT token (1 year expiry)
7. **Extension** → Stores JWT for future API calls

### JWT Authentication
- **Token Duration**: 1 year for better UX
- **Token Blacklisting**: Revoked tokens stored in database
- **Rate Limiting**: Per-user daily limits
- **Security**: Signature validation + blacklist checking

## API Endpoints

### Authentication Endpoints

#### POST `/google/sign_in`
Google OAuth sign-in endpoint.

**Request Body:**
```json
{
  "idToken": "google-id-token-from-extension"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-uuid",
    "google_id": "google-user-id",
    "email": "user@example.com",
    "name": "User Name",
    "picture_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z",
    "last_login_at": "2024-01-01T00:00:00Z"
  },
  "isNewUser": true
}
```

#### POST `/auth/logout`
Logout endpoint that blacklists the JWT token.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "message": "Successfully logged out"
}
```

#### POST `/auth/verify`
Verify JWT token validity.

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "userId": "user-uuid",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

### Analysis Endpoints

#### POST `/analyze-quick`
Quick content analysis (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "url": "https://example.com",
  "text": "Content to analyze...",
  "mode": "quick",
  "lastModified": "2024-01-01T00:00:00Z"
}
```

#### POST `/analyze-deep`
Deep content analysis (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt-token>
```

**Request Body:**
```json
{
  "url": "https://example.com",
  "text": "Content to analyze...",
  "mode": "deep",
  "lastModified": "2024-01-01T00:00:00Z"
}
```

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Token Blacklist Table
```sql
CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Usage Analytics Table (Updated)
```sql
ALTER TABLE usage_analytics 
ADD COLUMN user_uuid UUID REFERENCES users(id) ON DELETE CASCADE;
```

## Environment Variables

### Required Variables
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `JWT_SECRET`: Secret key for JWT signing (32+ characters)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID

### Example Configuration
```bash
# Production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

## Security Features

### JWT Security
- **Long-lived tokens**: 1-year expiration for better UX
- **Token blacklisting**: Revoked tokens stored in database
- **Signature validation**: All tokens verified on each request
- **Expiration checking**: Automatic token expiration handling

### Rate Limiting
- **Per-user limits**: 50 requests per day per user
- **User-based tracking**: Uses authenticated user ID
- **Graceful degradation**: Allows requests on database errors

### Data Privacy
- **Minimal data storage**: Only essential user information
- **Secure transmission**: HTTPS for all communications
- **Token hashing**: Blacklisted tokens stored as SHA-256 hashes

## Error Handling

### Authentication Errors
```json
{
  "error": "Authentication failed",
  "message": "Invalid JWT token"
}
```

### Rate Limit Errors
```json
{
  "error": "Rate limit exceeded",
  "retryAfter": 86400
}
```

### Validation Errors
```json
{
  "error": "Invalid request data"
}
```

## Chrome Extension Integration

### Google OAuth Setup
1. Create Google OAuth 2.0 client in Google Cloud Console
2. Add Chrome extension ID to authorized origins
3. Configure OAuth consent screen
4. Get client ID for backend configuration

### Token Storage
```javascript
// Store JWT token
chrome.storage.local.set({ jwtToken: response.token });

// Retrieve token for API calls
chrome.storage.local.get(['jwtToken'], (result) => {
  const token = result.jwtToken;
  // Use token in Authorization header
});
```

### API Calls
```javascript
// Example API call with authentication
fetch('https://api.example.com/analyze-quick', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwtToken}`
  },
  body: JSON.stringify({
    url: 'https://example.com',
    text: 'Content to analyze...',
    mode: 'quick'
  })
});
```

## Monitoring and Analytics

### Authentication Metrics
- Login success rate
- Token validation success rate
- Blacklisted token count
- User retention after login

### Performance Metrics
- Authentication response time
- Token validation latency
- Rate limiting effectiveness
- Cache hit rates

### Security Metrics
- Failed authentication attempts
- Invalid token requests
- Rate limit violations
- Token blacklist size

## Deployment

### Prerequisites
1. Supabase database with required tables
2. Google OAuth client configured
3. Environment variables set
4. Cloudflare Workers account

### Deployment Steps
1. Install dependencies: `npm install`
2. Configure environment variables in `wrangler.toml`
3. Deploy to Cloudflare Workers: `npm run deploy`
4. Test authentication endpoints
5. Monitor logs and metrics

### Database Setup
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    picture_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create token blacklist table
CREATE TABLE token_blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update usage_analytics table
ALTER TABLE usage_analytics 
ADD COLUMN user_uuid UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);
```

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

### Manual Testing
1. Test Google OAuth flow
2. Test JWT token validation
3. Test rate limiting
4. Test token blacklisting
5. Test error scenarios

## Troubleshooting

### Common Issues
1. **Invalid JWT token**: Check JWT_SECRET configuration
2. **Google OAuth errors**: Verify GOOGLE_CLIENT_ID
3. **Database errors**: Check Supabase connection
4. **Rate limiting**: Verify user_uuid field in usage_analytics

### Debug Logs
- Authentication errors logged to console
- Rate limiting violations tracked
- Database errors reported
- Token blacklist operations logged

## Future Enhancements

### Planned Features
- Refresh token support
- Multi-provider OAuth (GitHub, Microsoft)
- Advanced rate limiting tiers
- User preferences storage
- Analytics dashboard

### Security Improvements
- Token rotation
- IP-based rate limiting
- Advanced threat detection
- Audit logging 