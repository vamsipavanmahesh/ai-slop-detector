import { AuthService } from '../../services/auth.service';
import type { Env, AuthRequest } from '../../types/index';

// Mock fetch
global.fetch = jest.fn();

// Mock crypto for JWT operations
Object.defineProperty(global, 'crypto', {
  value: {
    subtle: {
      importKey: jest.fn().mockResolvedValue('mock-key'),
      sign: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4]))
    },
    randomUUID: jest.fn().mockReturnValue('mock-uuid')
  }
});

// Mock crypto-js
jest.mock('crypto-js', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('mock-hash')
  })
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockEnv: Env;

  beforeEach(() => {
    authService = new AuthService();
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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('authenticateWithGoogle', () => {
    it('should authenticate user with Google successfully', async () => {
      const mockGoogleUser = {
        sub: 'google-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg'
      };

      const mockRequestData: AuthRequest = {
        idToken: 'mock-id-token'
      };

      // Mock Google token verification
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockGoogleUser,
          aud: 'test-google-client-id'
        })
      });

      // Mock database operations
      (mockEnv.DB.first as jest.Mock).mockResolvedValueOnce(null); // No existing user
      (mockEnv.DB.run as jest.Mock).mockResolvedValueOnce({ error: null });

      const result = await authService.authenticateWithGoogle(mockRequestData, mockEnv);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('isNewUser');
      expect(result.isNewUser).toBe(true);
      expect(result.user.email).toBe(mockGoogleUser.email);
    });

    it('should return existing user if found', async () => {
      const mockGoogleUser = {
        sub: 'google-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg'
      };

      const mockRequestData: AuthRequest = {
        idToken: 'mock-id-token'
      };

      const existingUser = {
        id: 'existing-user-id',
        google_id: 'google-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture_url: 'https://example.com/picture.jpg',
        created_at: '2023-01-01T00:00:00Z',
        last_login_at: '2023-01-01T00:00:00Z'
      };

      // Mock Google token verification
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockGoogleUser,
          aud: 'test-google-client-id'
        })
      });

      // Mock database operations
      (mockEnv.DB.first as jest.Mock).mockResolvedValueOnce(existingUser);
      (mockEnv.DB.run as jest.Mock).mockResolvedValueOnce({ error: null });

      const result = await authService.authenticateWithGoogle(mockRequestData, mockEnv);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('isNewUser');
      expect(result.isNewUser).toBe(false);
      expect(result.user.id).toBe(existingUser.id);
    });

    it('should throw error for invalid Google token', async () => {
      const mockRequestData: AuthRequest = {
        idToken: 'invalid-token'
      };

      // Mock Google token verification failure
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false
      });

      await expect(authService.authenticateWithGoogle(mockRequestData, mockEnv))
        .rejects.toThrow('Failed to authenticate with Google');
    });

    it('should throw error for invalid client ID', async () => {
      const mockRequestData: AuthRequest = {
        idToken: 'mock-id-token'
      };

      // Mock Google token verification with wrong client ID
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          sub: 'google-user-id',
          email: 'test@example.com',
          name: 'Test User',
          picture: 'https://example.com/picture.jpg',
          aud: 'wrong-client-id'
        })
      });

      await expect(authService.authenticateWithGoogle(mockRequestData, mockEnv))
        .rejects.toThrow('Failed to authenticate with Google');
    });

    it('should throw error when database operation fails', async () => {
      const mockGoogleUser = {
        sub: 'google-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/picture.jpg'
      };

      const mockRequestData: AuthRequest = {
        idToken: 'mock-id-token'
      };

      // Mock Google token verification
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockGoogleUser,
          aud: 'test-google-client-id'
        })
      });

      // Mock database operation failure
      (mockEnv.DB.first as jest.Mock).mockResolvedValueOnce(null);
      (mockEnv.DB.run as jest.Mock).mockResolvedValueOnce({ error: 'Database error' });

      await expect(authService.authenticateWithGoogle(mockRequestData, mockEnv))
        .rejects.toThrow('Failed to create user');
    });
  });

  describe('extractUserFromToken', () => {
    it('should extract user from valid JWT token', async () => {
      // Mock the private methods by spying on the class
      const verifyJWTSpy = jest.spyOn(authService as any, 'verifyJWT').mockResolvedValue({
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        iat: 1635729600,
        exp: 1635816000
      });

      const checkTokenBlacklistSpy = jest.spyOn(authService as any, 'checkTokenBlacklist').mockResolvedValue(undefined);

      const mockToken = 'valid.jwt.token';
      const mockAuthorization = `Bearer ${mockToken}`;

      // Mock database operations
      (mockEnv.DB.first as jest.Mock).mockResolvedValueOnce(null); // No blacklisted token

      const result = await authService.extractUserFromToken(mockAuthorization, mockEnv);

      expect(verifyJWTSpy).toHaveBeenCalledWith(mockToken, mockEnv.JWT_SECRET);
      expect(checkTokenBlacklistSpy).toHaveBeenCalledWith(mockToken, mockEnv);
      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('name');

      verifyJWTSpy.mockRestore();
      checkTokenBlacklistSpy.mockRestore();
    });

    it('should throw error for invalid token format', async () => {
      const mockAuthorization = 'InvalidFormat token';

      await expect(authService.extractUserFromToken(mockAuthorization, mockEnv))
        .rejects.toThrow('Authentication failed: Invalid token');
    });

    it('should throw error for missing Bearer prefix', async () => {
      const mockAuthorization = 'just-a-token';

      await expect(authService.extractUserFromToken(mockAuthorization, mockEnv))
        .rejects.toThrow('Authentication failed: Invalid token');
    });

    it('should throw error when JWT verification fails', async () => {
      const verifyJWTSpy = jest.spyOn(authService as any, 'verifyJWT').mockRejectedValue(new Error('Invalid token format'));

      const mockToken = 'invalid.token';
      const mockAuthorization = `Bearer ${mockToken}`;

      await expect(authService.extractUserFromToken(mockAuthorization, mockEnv))
        .rejects.toThrow('Authentication failed: Invalid token');

      verifyJWTSpy.mockRestore();
    });

    it('should throw error when token is blacklisted', async () => {
      const verifyJWTSpy = jest.spyOn(authService as any, 'verifyJWT').mockResolvedValue({
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        iat: 1635729600,
        exp: 1635816000
      });

      const checkTokenBlacklistSpy = jest.spyOn(authService as any, 'checkTokenBlacklist').mockRejectedValue(new Error('Token is blacklisted'));

      const mockToken = 'blacklisted.token';
      const mockAuthorization = `Bearer ${mockToken}`;

      await expect(authService.extractUserFromToken(mockAuthorization, mockEnv))
        .rejects.toThrow('Authentication failed: Invalid token');

      verifyJWTSpy.mockRestore();
      checkTokenBlacklistSpy.mockRestore();
    });
  });

  describe('addTokenToBlacklist', () => {
    it('should add token to blacklist successfully', async () => {
      const token = 'test-token';
      const userId = 'test-user-id';

      // Mock database operations
      (mockEnv.DB.run as jest.Mock).mockResolvedValueOnce({ error: null });

      await expect(authService.addTokenToBlacklist(token, userId, mockEnv))
        .resolves.not.toThrow();
    });

    it('should throw error when database operation fails', async () => {
      const token = 'test-token';
      const userId = 'test-user-id';

      // Mock database operations failure
      (mockEnv.DB.run as jest.Mock).mockResolvedValueOnce({ error: 'Database error' });

      await expect(authService.addTokenToBlacklist(token, userId, mockEnv))
        .rejects.toThrow('Failed to blacklist token');
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should cleanup expired tokens successfully', async () => {
      // Mock database operations
      (mockEnv.DB.run as jest.Mock).mockResolvedValueOnce({ error: null });

      await expect(authService.cleanupExpiredTokens(mockEnv))
        .resolves.not.toThrow();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database operations failure
      (mockEnv.DB.run as jest.Mock).mockResolvedValueOnce({ error: 'Database error' });

      await expect(authService.cleanupExpiredTokens(mockEnv))
        .resolves.not.toThrow();
    });
  });
}); 