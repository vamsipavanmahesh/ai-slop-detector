import { AuthService } from '../services/auth.service';
import { createErrorResponse } from '../utils/response';
import type { Env, AuthRequest, ErrorResponse } from '../types/index';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  // Google OAuth sign-in endpoint
  async handleGoogleSignIn(request: Request, env: Env): Promise<Response> {
    try {
      // Parse request body
      const requestData: AuthRequest = await request.json();
      
      if (!requestData.idToken) {
        return createErrorResponse('Missing ID token', 400);
      }
      
      // Authenticate with Google
      const authResponse = await this.authService.authenticateWithGoogle(requestData, env);
      
      // Return only necessary data to frontend (no sensitive Google data)
      const safeResponse = {
        token: authResponse.token,
        user: {
          id: authResponse.user.id,
          email: authResponse.user.email,
          name: authResponse.user.name,
          pictureUrl: authResponse.user.picture_url
        },
        isNewUser: authResponse.isNewUser
      };
      
      return new Response(JSON.stringify(safeResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Google sign-in error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResponse('Authentication failed', 401, errorMessage);
    }
  }

  // Logout endpoint
  async handleLogout(request: Request, env: Env): Promise<Response> {
    try {
      // Extract token from authorization header
      const authorization = request.headers.get('Authorization');
      if (!authorization) {
        return createErrorResponse('Missing authorization header', 401);
      }
      
      // Extract user from token
      const user = await this.authService.extractUserFromToken(authorization, env);
      
      // Add token to blacklist
      await this.authService.addTokenToBlacklist(authorization.substring(7), user.userId, env);
      
      // Clean up expired tokens (background task)
      this.authService.cleanupExpiredTokens(env).catch(console.error);
      
      return new Response(JSON.stringify({ 
        message: 'Successfully logged out' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Logout error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResponse('Logout failed', 401, errorMessage);
    }
  }

  // Verify token endpoint
  async handleVerifyToken(request: Request, env: Env): Promise<Response> {
    try {
      const authorization = request.headers.get('Authorization');
      if (!authorization) {
        return createErrorResponse('Missing authorization header', 401);
      }
      
      // Extract and verify user from token
      const user = await this.authService.extractUserFromToken(authorization, env);
      
      return new Response(JSON.stringify({ 
        valid: true,
        user: {
          userId: user.userId,
          email: user.email,
          name: user.name
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('Token verification error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ 
        valid: false,
        error: 'Invalid token',
        message: errorMessage 
      } as ErrorResponse), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
} 