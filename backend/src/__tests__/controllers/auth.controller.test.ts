import { AuthController } from '../../controllers/auth.controller';
import type { Env } from '../../types/index';

// Mock the AuthService
jest.mock('../../services/auth.service');

describe('AuthController', () => {
  let authController: AuthController;
  let mockEnv: Env;
  let mockAuthService: any;

  beforeEach(() => {
    authController = new AuthController();
    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-key',
      OPENAI_API_KEY: 'test-openai-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      JWT_SECRET: 'test-jwt-secret',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      DB: {
        prepare: jest.fn().mockReturnThis(),
        bind: jest.fn().mockReturnThis(),
        first: jest.fn(),
        run: jest.fn()
      }
    };

    // Get mocked AuthService
    mockAuthService = require('../../services/auth.service');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGoogleSignIn', () => {
    it('should handle successful Google sign in', async () => {
      const mockRequest = new Request('https://api.example.com/google/sign_in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: 'mock-google-id-token'
        })
      });

      const mockAuthResponse = {
        token: 'mock-jwt-token',
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          picture_url: 'https://example.com/picture.jpg'
        },
        isNewUser: true
      };

      mockAuthService.AuthService.prototype.authenticateWithGoogle.mockResolvedValue(mockAuthResponse);

      const response = await authController.handleGoogleSignIn(mockRequest, mockEnv);

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody).toEqual({
        token: mockAuthResponse.token,
        user: {
          id: mockAuthResponse.user.id,
          email: mockAuthResponse.user.email,
          name: mockAuthResponse.user.name,
          pictureUrl: mockAuthResponse.user.picture_url
        },
        isNewUser: mockAuthResponse.isNewUser
      });
    });

    it('should handle authentication failure', async () => {
      const mockRequest = new Request('https://api.example.com/google/sign_in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: 'invalid-token'
        })
      });

      mockAuthService.AuthService.prototype.authenticateWithGoogle.mockRejectedValue(
        new Error('Failed to authenticate with Google')
      );

      const response = await authController.handleGoogleSignIn(mockRequest, mockEnv);

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Authentication failed');
      expect(responseBody.message).toBe('Failed to authenticate with Google');
    });

    it('should handle invalid request body', async () => {
      const mockRequest = new Request('https://api.example.com/google/sign_in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json'
      });

      const response = await authController.handleGoogleSignIn(mockRequest, mockEnv);

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Authentication failed');
    });

    it('should handle missing idToken', async () => {
      const mockRequest = new Request('https://api.example.com/google/sign_in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await authController.handleGoogleSignIn(mockRequest, mockEnv);

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Missing ID token');
    });
  });

  describe('handleLogout', () => {
    it('should handle successful logout', async () => {
      const mockRequest = new Request('https://api.example.com/auth/logout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify({
          token: 'mock-jwt-token'
        })
      });

      const mockUserData = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockAuthService.AuthService.prototype.extractUserFromToken.mockResolvedValue(mockUserData);
      mockAuthService.AuthService.prototype.addTokenToBlacklist.mockResolvedValue(undefined);
      mockAuthService.AuthService.prototype.cleanupExpiredTokens.mockResolvedValue(undefined);

      const response = await authController.handleLogout(mockRequest, mockEnv);

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.message).toBe('Successfully logged out');
    });

    it('should handle logout failure', async () => {
      const mockRequest = new Request('https://api.example.com/auth/logout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-jwt-token'
        },
        body: JSON.stringify({
          token: 'mock-jwt-token'
        })
      });

      mockAuthService.AuthService.prototype.extractUserFromToken.mockRejectedValue(
        new Error('Failed to blacklist token')
      );

      const response = await authController.handleLogout(mockRequest, mockEnv);

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Logout failed');
      expect(responseBody.message).toBe('Failed to blacklist token');
    });

    it('should handle missing authorization header', async () => {
      const mockRequest = new Request('https://api.example.com/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const response = await authController.handleLogout(mockRequest, mockEnv);

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Missing authorization header');
    });

    it('should handle token extraction failure', async () => {
      const mockRequest = new Request('https://api.example.com/auth/logout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          token: 'mock-jwt-token'
        })
      });

      mockAuthService.AuthService.prototype.extractUserFromToken.mockRejectedValue(
        new Error('Invalid token')
      );

      const response = await authController.handleLogout(mockRequest, mockEnv);

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Logout failed');
    });
  });

  describe('handleVerifyToken', () => {
    it('should handle valid token verification', async () => {
      const mockRequest = new Request('https://api.example.com/auth/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token'
        }
      });

      const mockUserData = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        iat: 1635729600,
        exp: 1635816000
      };

      mockAuthService.AuthService.prototype.extractUserFromToken.mockResolvedValue(mockUserData);

      const response = await authController.handleVerifyToken(mockRequest, mockEnv);

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.valid).toBe(true);
      expect(responseBody.user).toEqual({
        userId: mockUserData.userId,
        email: mockUserData.email,
        name: mockUserData.name
      });
    });

    it('should handle invalid token', async () => {
      const mockRequest = new Request('https://api.example.com/auth/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        }
      });

      mockAuthService.AuthService.prototype.extractUserFromToken.mockRejectedValue(
        new Error('Authentication failed: Invalid token')
      );

      const response = await authController.handleVerifyToken(mockRequest, mockEnv);

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.valid).toBe(false);
      expect(responseBody.error).toBe('Invalid token');
      expect(responseBody.message).toBe('Authentication failed: Invalid token');
    });

    it('should handle missing authorization header', async () => {
      const mockRequest = new Request('https://api.example.com/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await authController.handleVerifyToken(mockRequest, mockEnv);

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Missing authorization header');
    });

    it('should handle token extraction errors', async () => {
      const mockRequest = new Request('https://api.example.com/auth/verify', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer expired-token'
        }
      });

      mockAuthService.AuthService.prototype.extractUserFromToken.mockRejectedValue(
        new Error('Token expired')
      );

      const response = await authController.handleVerifyToken(mockRequest, mockEnv);

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.valid).toBe(false);
      expect(responseBody.error).toBe('Invalid token');
      expect(responseBody.message).toBe('Token expired');
    });
  });
}); 