# Architecture Documentation

## Overview

The AI Slop Detector Backend follows a **layered architecture** pattern that promotes separation of concerns, maintainability, and testability. This document outlines the architectural decisions, patterns, and implementation details.

## Architecture Layers

### 1. Controllers Layer (`/controllers`)

**Purpose**: Handle HTTP requests and responses, coordinate between services, and manage request/response formatting.

**Responsibilities**:
- Parse and validate incoming HTTP requests
- Coordinate service calls
- Format HTTP responses
- Handle HTTP-specific concerns (headers, status codes, etc.)

**Components**:
- `AuthController`: Handles authentication endpoints
- `AnalysisController`: Handles content analysis endpoints

**Example**:
```typescript
export class AuthController {
  private authService: AuthService;

  async handleGoogleSignIn(request: Request, env: Env): Promise<Response> {
    // Parse request, call service, format response
  }
}
```

### 2. Services Layer (`/services`)

**Purpose**: Contain business logic and orchestrate complex operations.

**Responsibilities**:
- Implement core business logic
- Coordinate between multiple services
- Handle data transformation
- Manage external API calls

**Components**:
- `AuthService`: Authentication business logic
- `AnalysisService`: Content analysis orchestration
- `CacheService`: Caching operations
- `RateLimitService`: Rate limiting logic
- `ValidationService`: Request validation

**Example**:
```typescript
export class AnalysisService {
  async analyzeContent(requestData: AnalysisRequest, env: Env, userId: string): Promise<ApiResponse> {
    // Orchestrate rate limiting, caching, and analysis
  }
}
```

### 3. Middleware Layer (`/middleware`)

**Purpose**: Handle cross-cutting concerns like authentication and authorization.

**Responsibilities**:
- Authenticate requests
- Authorize access
- Validate tokens
- Handle authentication errors

**Components**:
- `AuthMiddleware`: Authentication and authorization

**Example**:
```typescript
export class AuthMiddleware {
  async requireAuth(request: Request, env: Env): Promise<JWTPayload> {
    // Extract and validate JWT token
  }
}
```

### 4. Utilities Layer (`/utils`)

**Purpose**: Provide pure utility functions and common helpers.

**Responsibilities**:
- Standardize HTTP responses
- Provide common utilities
- Handle cross-cutting concerns

**Components**:
- `response.ts`: HTTP response utilities

**Example**:
```typescript
export function createErrorResponse(message: string, status: number): Response {
  // Create standardized error responses
}
```

### 5. Types Layer (`/types`)

**Purpose**: Define TypeScript interfaces and types.

**Responsibilities**:
- Define data structures
- Ensure type safety
- Document data contracts

**Components**:
- `index.ts`: All type definitions

## Design Patterns

### 1. Dependency Injection

Services are injected into controllers, promoting loose coupling and testability.

```typescript
export class AnalysisController {
  private analysisService: AnalysisService;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.analysisService = new AnalysisService();
    this.authMiddleware = new AuthMiddleware();
  }
}
```

### 2. Single Responsibility Principle

Each class has a single, well-defined purpose:

- **Controllers**: Handle HTTP concerns
- **Services**: Handle business logic
- **Middleware**: Handle cross-cutting concerns
- **Utilities**: Provide common functionality

### 3. Separation of Concerns

Clear boundaries between layers:

- **HTTP Layer**: Controllers handle HTTP-specific logic
- **Business Layer**: Services contain core business logic
- **Data Layer**: Services interact with external APIs and databases

## Data Flow

### Request Flow

1. **HTTP Request** → `index.ts`
2. **Route Matching** → `routes.ts`
3. **Controller** → Parse request, validate
4. **Middleware** → Authenticate/authorize
5. **Service** → Execute business logic
6. **Response** → Format and return

### Example Flow: Content Analysis

```
POST /analyze-quick
    ↓
AnalysisController.handleAnalysisRequest()
    ↓
AuthMiddleware.requireAuth()
    ↓
AnalysisService.analyzeContent()
    ↓
RateLimitService.checkRateLimit()
    ↓
CacheService.getCache() / CacheService.setCache()
    ↓
AI Provider (OpenAI/Anthropic)
    ↓
Response
```

## Error Handling Strategy

### 1. Layered Error Handling

- **Controllers**: Handle HTTP-specific errors
- **Services**: Handle business logic errors
- **Middleware**: Handle authentication errors
- **Utilities**: Provide standardized error responses

### 2. Error Types

- **Validation Errors**: 400 Bad Request
- **Authentication Errors**: 401 Unauthorized
- **Authorization Errors**: 403 Forbidden
- **Rate Limit Errors**: 429 Too Many Requests
- **Server Errors**: 500 Internal Server Error

### 3. Error Response Format

```typescript
interface ErrorResponse {
  error: string;
  message?: string;
  retryAfter?: number;
}
```

## Caching Strategy

### 1. Multi-Factor Cache Keys

```
{url_hash}_{content_hash}_{mode}
```

- **URL Hash**: Normalized URL for consistency
- **Content Hash**: SHA-256 of analyzed text
- **Mode**: Separate caches for quick/deep analysis

### 2. Cache Invalidation

- **Time-based**: 24-hour TTL
- **Content-based**: Automatic when content changes
- **Manual**: Admin-triggered clearing

### 3. Cache Service Responsibilities

- Generate cache keys
- Check cache existence
- Store cache entries
- Handle cache expiration
- Provide cache statistics

## Rate Limiting Strategy

### 1. Daily Limits

- **Limit**: 50 analyses per day per user
- **Tracking**: Based on authenticated user IDs
- **Storage**: Daily usage analytics table

### 2. Rate Limit Service Responsibilities

- Check current usage
- Increment usage counters
- Calculate retry times
- Provide usage statistics
- Handle rate limit resets

## Authentication Strategy

### 1. Google OAuth Flow

1. **Frontend**: Obtain Google ID token
2. **Backend**: Verify token with Google
3. **Database**: Find or create user
4. **JWT**: Generate session token
5. **Response**: Return user data and token

### 2. JWT Token Management

- **Generation**: Custom JWT implementation for Cloudflare Workers
- **Validation**: Token signature and expiration checks
- **Blacklisting**: Secure logout with token invalidation
- **Cleanup**: Automatic expired token removal

### 3. Auth Service Responsibilities

- Verify Google tokens
- Manage user creation/updates
- Generate and validate JWTs
- Handle token blacklisting
- Clean up expired tokens

## Testing Strategy

### 1. Test Structure

```
src/__tests__/
├── services/          # Unit tests for business logic
├── controllers/       # Integration tests for HTTP handlers
├── middleware/        # Authentication tests
└── index.test.ts     # Main application tests
```

### 2. Testing Patterns

- **Service Tests**: Mock dependencies, test business logic
- **Controller Tests**: Mock services, test HTTP handling
- **Middleware Tests**: Mock auth service, test auth flow
- **Integration Tests**: Test complete request flows

### 3. Mock Strategy

- **Database**: Mock D1 database operations
- **External APIs**: Mock fetch calls
- **Authentication**: Mock JWT operations
- **Rate Limiting**: Mock usage tracking

## Performance Considerations

### 1. Edge Computing Benefits

- **Global Distribution**: Sub-100ms response times
- **Cold Start Optimization**: Minimal initialization
- **Resource Limits**: Efficient memory usage

### 2. Caching Optimization

- **Hit Rates**: Target >80% cache hit rate
- **Storage**: Efficient cache key generation
- **TTL**: Balance freshness vs performance

### 3. Database Optimization

- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed queries for performance
- **Batch Operations**: Minimize database round trips

## Security Considerations

### 1. Authentication Security

- **JWT Security**: Secure token generation and validation
- **Token Blacklisting**: Secure logout mechanism
- **Google OAuth**: Verified token validation

### 2. Data Security

- **No Content Storage**: Only cryptographic hashes stored
- **Row Level Security**: Database-level access controls
- **Environment Variables**: Secure configuration management

### 3. API Security

- **HTTPS**: All communications encrypted
- **Rate Limiting**: Abuse prevention
- **Input Validation**: Comprehensive request validation

## Monitoring and Observability

### 1. Metrics to Track

- **Request Volume**: Usage patterns and growth
- **Cache Effectiveness**: Hit rates and storage
- **Error Rates**: API and business logic errors
- **Authentication**: Login patterns and security
- **Performance**: Response times and throughput

### 2. Logging Strategy

- **Structured Logging**: JSON format for parsing
- **Error Tracking**: Detailed error context
- **Performance Monitoring**: Request timing and bottlenecks

## Future Enhancements

### 1. Potential Improvements

- **Service Discovery**: Dynamic service registration
- **Circuit Breakers**: Fault tolerance patterns
- **Event Sourcing**: Audit trail and analytics
- **Microservices**: Further service decomposition

### 2. Scalability Considerations

- **Horizontal Scaling**: Multiple worker instances
- **Database Sharding**: Distributed data storage
- **Caching Layers**: Multi-level caching strategy
- **Load Balancing**: Intelligent request distribution

## Conclusion

This layered architecture provides:

- **Maintainability**: Clear separation of concerns
- **Testability**: Isolated components for testing
- **Scalability**: Modular design for growth
- **Security**: Proper authentication and authorization
- **Performance**: Efficient caching and rate limiting

The architecture follows industry best practices and provides a solid foundation for future enhancements and scaling. 