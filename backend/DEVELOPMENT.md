# Development Guide

This guide explains how to work with the refactored AI Slop Detector Backend architecture.

## Project Structure

```
src/
├── controllers/          # HTTP request handlers
│   ├── auth.controller.ts
│   └── analysis.controller.ts
├── services/            # Business logic layer
│   ├── auth.service.ts
│   ├── analysis.service.ts
│   ├── cache.service.ts
│   ├── rate-limit.service.ts
│   └── validation.service.ts
├── middleware/          # HTTP middleware
│   └── auth.middleware.ts
├── utils/              # Pure utility functions
│   └── response.ts
├── types/              # Type definitions
│   └── index.ts
├── routes.ts           # Main routing logic
└── index.ts            # Application entry point
```

## Development Workflow

### 1. Adding New Features

When adding new features, follow this pattern:

#### Step 1: Define Types
Add new interfaces to `src/types/index.ts`:

```typescript
export interface NewFeatureRequest {
  // Define request structure
}

export interface NewFeatureResponse {
  // Define response structure
}
```

#### Step 2: Create Service
Add business logic to `src/services/`:

```typescript
export class NewFeatureService {
  async processFeature(request: NewFeatureRequest): Promise<NewFeatureResponse> {
    // Implement business logic
  }
}
```

#### Step 3: Create Controller
Add HTTP handling to `src/controllers/`:

```typescript
export class NewFeatureController {
  private newFeatureService: NewFeatureService;

  constructor() {
    this.newFeatureService = new NewFeatureService();
  }

  async handleNewFeature(request: Request, env: Env): Promise<Response> {
    // Parse request, call service, format response
  }
}
```

#### Step 4: Add Route
Update `src/routes.ts`:

```typescript
if (path === '/new-feature' && request.method === 'POST') {
  return await newFeatureController.handleNewFeature(request, env);
}
```

#### Step 5: Add Tests
Create tests in `src/__tests__/`:

```typescript
describe('NewFeatureService', () => {
  // Test business logic
});

describe('NewFeatureController', () => {
  // Test HTTP handling
});
```

### 2. Service Development Patterns

#### Service Dependencies
Services should be injected into controllers:

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

#### Error Handling
Services should throw descriptive errors:

```typescript
export class AuthService {
  async authenticateWithGoogle(requestData: AuthRequest, env: Env): Promise<AuthResponse> {
    try {
      // Business logic
    } catch (error) {
      console.error('Google authentication error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }
}
```

### 3. Testing Patterns

#### Service Tests
Test business logic in isolation:

```typescript
describe('AuthService', () => {
  let authService: AuthService;
  let mockEnv: Env;

  beforeEach(() => {
    authService = new AuthService();
    mockEnv = {
      // Mock environment
    };
  });

  it('should authenticate user with Google successfully', async () => {
    // Mock dependencies
    // Call service method
    // Assert results
  });
});
```

### 4. Error Handling Patterns

#### Layered Error Handling
Handle errors at appropriate layers:

```typescript
// Service layer - throw business errors
throw new Error('Rate limit exceeded');

// Controller layer - catch and format HTTP errors
try {
  const result = await this.service.method();
  return createSuccessResponse(result);
} catch (error) {
  return createErrorResponse('Operation failed', 500, error.message);
}
```

## Common Pitfalls

### 1. Type Safety
Always use TypeScript strict mode and proper typing:

```typescript
// Good
const userId: string = user.id;

// Bad
const userId = user.id; // Could be undefined
```

### 2. Error Handling
Don't ignore errors:

```typescript
// Good
try {
  const result = await operation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new Error('Operation failed');
}

// Bad
const result = await operation(); // Unhandled promise rejection
```

## Conclusion

Following these patterns ensures:

- **Consistency**: All code follows the same patterns
- **Maintainability**: Clear structure and separation of concerns
- **Testability**: Isolated components that are easy to test
- **Performance**: Efficient async operations and error handling
- **Security**: Proper authentication and validation

The layered architecture provides a solid foundation for building scalable, maintainable applications.