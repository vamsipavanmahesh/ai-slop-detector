import { AuthService } from '../services/auth.service';
import { createErrorResponse } from '../utils/response';
import type { Env, JWTPayload, ErrorResponse } from '../types/index';

export class AuthMiddleware {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Require authentication for a request
   */
  async requireAuth(request: Request, env: Env): Promise<JWTPayload> {
    const authorization = request.headers.get('Authorization');
    
    if (!authorization) {
      throw new Error('Authentication required: Missing authorization header');
    }

    if (!authorization.startsWith('Bearer ')) {
      throw new Error('Authentication required: Invalid authorization format');
    }

    try {
      return await this.authService.extractUserFromToken(authorization, env);
    } catch (error) {
      throw new Error('Authentication required: Invalid token');
    }
  }

  /**
   * Create authentication error response
   */
  createAuthErrorResponse(error: Error): Response {
    const errorMessage = error.message.includes('Authentication required') 
      ? error.message 
      : 'Authentication required';
    
    return createErrorResponse(errorMessage, 401);
  }

  /**
   * Optional authentication - doesn't throw if no token provided
   */
  async optionalAuth(request: Request, env: Env): Promise<JWTPayload | null> {
    const authorization = request.headers.get('Authorization');
    
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return null;
    }

    try {
      return this.authService.extractUserFromToken(authorization, env);
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if user has admin privileges
   */
  async requireAdmin(request: Request, env: Env): Promise<JWTPayload> {
    const user = await this.requireAuth(request, env);
    
    // For now, we'll use a simple email-based admin check
    // In a real application, you'd have a proper role system
    const adminEmails = ['admin@example.com']; // Configure this based on your needs
    
    if (!adminEmails.includes(user.email)) {
      throw new Error('Admin privileges required');
    }
    
    return user;
  }

  /**
   * Create admin error response
   */
  createAdminErrorResponse(): Response {
    return createErrorResponse('Admin privileges required', 403);
  }
} 