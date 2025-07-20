# OAuth Flow: Chrome Extension to Backend

## Overview
This document explains the complete OAuth flow from Chrome extension to backend, using Google OAuth 2.0 with ID tokens and long-lived JWT tokens.

## Complete OAuth Flow

```mermaid
sequenceDiagram
    participant User as User
    participant CE as Chrome Extension
    participant Google as Google OAuth
    participant API as Cloudflare Workers API
    participant DB as Supabase Database
    participant AI as AI Providers
    
    User->>CE: 1. Click Login Button
    CE->>Google: 2. Launch OAuth Popup
    Google->>User: 3. Show Google Login
    User->>Google: 4. Enter Credentials
    Google-->>CE: 5. Return Access Token
    
    CE->>Google: 6. Get User Info + ID Token
    Google-->>CE: 7. Return User Data + ID Token
    
    CE->>API: 8. POST /google/sign_in
    Note over CE,API: {idToken: "google-id-token"}
    
    API->>Google: 9. Validate ID Token
    Google-->>API: 10. Token Valid + User Info
    
    API->>DB: 11. Check User Exists
    alt New User
        DB-->>API: 12a. User Not Found
        API->>DB: 13a. Create New User
        DB-->>API: 14a. User Created
        Note over API: isNewUser = true
    else Existing User
        DB-->>API: 12b. User Found
        API->>DB: 13b. Update Last Login
        Note over API: isNewUser = false
    end
    
    API->>API: 15. Generate JWT (1 year)
    API-->>CE: 16. Return JWT + User Info
    Note over CE,API: {token: "jwt", user: {...}, isNewUser: true}
    
    CE->>CE: 17. Store JWT Locally
    CE->>User: 18. Show Logged In UI
    
    Note over User,AI: Future API Calls
    User->>CE: 19. Click Analyze Content
    CE->>API: 20. POST /analyze-quick
    Note over CE,API: Authorization: Bearer {jwt}
    
    API->>API: 21. Validate JWT
    API->>DB: 22. Check Token Blacklist
    API->>DB: 23. Check Rate Limit (user_id)
    
    API->>AI: 24. Analyze Content
    AI-->>API: 25. Analysis Result
    API-->>CE: 26. Return Analysis
    CE->>User: 27. Show Analysis Results
```

## Token Management Flow

```mermaid
graph TD
    subgraph "Chrome Extension Token Management"
        Login[User Login]
        StoreToken[Store JWT in Chrome Storage]
        GetToken[Get Token for API Calls]
        ValidateToken[Validate Token Locally]
        ClearToken[Clear Token on Logout]
    end
    
    subgraph "Backend Token Management"
        GenerateJWT[Generate JWT (1 year)]
        ValidateJWT[Validate JWT Signature]
        CheckBlacklist[Check Token Blacklist]
        BlacklistToken[Add Token to Blacklist]
    end
    
    subgraph "Database"
        Users[(Users Table)]
        Blacklist[(Token Blacklist)]
    end
    
    Login --> GenerateJWT
    GenerateJWT --> StoreToken
    GetToken --> ValidateJWT
    ValidateJWT --> CheckBlacklist
    CheckBlacklist --> Blacklist
    ClearToken --> BlacklistToken
    BlacklistToken --> Blacklist
```

## Security Flow

```mermaid
graph TD
    subgraph "Request Security Flow"
        Request[Incoming Request]
        ExtractJWT[Extract JWT from Header]
        ValidateSignature[Validate JWT Signature]
        CheckExpiration[Check Token Expiration]
        CheckBlacklist[Check Token Blacklist]
        ExtractUserID[Extract User ID]
        Allow[Allow Request]
        Block[Block Request]
    end
    
    subgraph "Database Checks"
        BlacklistDB[(Token Blacklist)]
        UsersDB[(Users Table)]
    end
    
    Request --> ExtractJWT
    ExtractJWT --> ValidateSignature
    ValidateSignature --> CheckExpiration
    CheckExpiration --> CheckBlacklist
    CheckBlacklist --> BlacklistDB
    CheckBlacklist --> ExtractUserID
    ExtractUserID --> UsersDB
    ExtractUserID --> Allow
    ValidateSignature --> Block
    CheckExpiration --> Block
    CheckBlacklist --> Block
```

## Rate Limiting with User ID

```mermaid
graph TD
    subgraph "Rate Limiting Flow"
        Request[API Request]
        ExtractUser[Extract User ID from JWT]
        CheckDailyLimit[Check Daily Limit]
        IncrementUsage[Increment Usage Counter]
        AllowRequest[Allow Request]
        BlockRequest[Block Request]
    end
    
    subgraph "Database"
        Analytics[(Usage Analytics)]
        Users[(Users Table)]
    end
    
    Request --> ExtractUser
    ExtractUser --> CheckDailyLimit
    CheckDailyLimit --> Analytics
    CheckDailyLimit -->|Under Limit| IncrementUsage
    CheckDailyLimit -->|Over Limit| BlockRequest
    IncrementUsage --> Analytics
    IncrementUsage --> AllowRequest
    BlockRequest --> Response[429 Too Many Requests]
```



## Error Handling Flow

```mermaid
graph TD
    subgraph "Error Scenarios"
        NetworkError[Network Error]
        InvalidToken[Invalid JWT Token]
        ExpiredToken[Expired Token]
        BlacklistedToken[Blacklisted Token]
        RateLimitExceeded[Rate Limit Exceeded]
        GoogleAuthError[Google Auth Error]
    end
    
    subgraph "Error Responses"
        ClearToken[Clear Local Token]
        ShowLogin[Show Login UI]
        ShowError[Show Error Message]
        RetryRequest[Retry Request]
    end
    
    NetworkError --> RetryRequest
    InvalidToken --> ClearToken
    ExpiredToken --> ClearToken
    BlacklistedToken --> ClearToken
    RateLimitExceeded --> ShowError
    GoogleAuthError --> ShowError
    
    ClearToken --> ShowLogin
    ShowError --> ShowLogin
```

## Implementation Steps

### Step 1: Chrome Extension Setup
1. **Manifest Configuration**
   - Add OAuth2 permissions
   - Configure Google client ID
   - Set up identity API

2. **Google OAuth Handler**
   - Launch OAuth popup
   - Handle access token
   - Get ID token from Google

3. **Token Storage**
   - Store JWT securely
   - Handle token expiration
   - Clear tokens on logout

### Step 2: Backend Authentication
1. **Google Token Validation**
   - Verify ID token with Google
   - Extract user information
   - Handle validation errors

2. **User Management**
   - Check if user exists
   - Create new users
   - Update login timestamps

3. **JWT Generation**
   - Generate 1-year tokens
   - Include user information
   - Set proper claims

### Step 3: Security Implementation
1. **Token Blacklisting**
   - Store hashed tokens
   - Check blacklist on requests
   - Clean up expired tokens

2. **Rate Limiting**
   - Use user ID for limits
   - Track daily usage
   - Handle limit exceeded

3. **Error Handling**
   - Network failures
   - Authentication errors
   - Rate limit errors

## Security Considerations

### Token Security
- **Long-lived tokens**: 1-year expiration for better UX
- **Blacklisting**: Revoke tokens on logout
- **Secure storage**: Use Chrome's secure storage APIs
- **Validation**: Check signature, expiration, and blacklist

### Data Privacy
- **Minimal data**: Only store necessary user information
- **GDPR compliance**: Allow data deletion
- **Secure transmission**: HTTPS for all communications

### API Security
- **CORS policies**: Proper cross-origin handling
- **Request validation**: Validate all inputs
- **Rate limiting**: Prevent abuse

## Benefits of This Approach

1. **User Experience**
   - One-click Google login
   - Long-lived sessions (1 year)
   - Seamless authentication

2. **Security**
   - Server-side token validation
   - Token blacklisting for logout
   - Rate limiting per user

3. **Scalability**
   - Stateless JWT tokens
   - No session storage needed
   - Global edge network

4. **Maintenance**
   - Simple token management
   - Easy to debug
   - Clear error handling

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