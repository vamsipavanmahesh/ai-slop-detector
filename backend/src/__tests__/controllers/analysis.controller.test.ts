import { AnalysisController } from '../../controllers/analysis.controller';
import type { Env } from '../../types/index';

// Mock the AnalysisService and AuthService
jest.mock('../../services/analysis.service');
jest.mock('../../services/auth.service');

describe('AnalysisController', () => {
  let analysisController: AnalysisController;
  let mockEnv: Env;
  let mockAnalysisService: any;
  let mockAuthService: any;

  beforeEach(() => {
    analysisController = new AnalysisController();
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

    // Get mocked services
    mockAnalysisService = require('../../services/analysis.service');
    mockAuthService = require('../../services/auth.service');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleAnalysisRequest', () => {
    it('should handle successful quick analysis', async () => {
      const mockRequest = new Request('https://api.example.com/analyze-quick', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          text: 'This is a test content for analysis',
          mode: 'quick'
        })
      });

      const mockUserData = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockAnalysisResult = {
        classification: 'ai-generated',
        confidenceLevel: 'high',
        confidenceScore: 0.85,
        keyIndicators: ['repetitive patterns', 'unnatural flow'],
        reasoning: 'The text shows clear signs of AI generation',
        metadata: {
          wordCount: 8,
          provider: 'openai',
          analysisTime: 1500
        },
        cacheStatus: 'miss'
      };

      mockAuthService.AuthService.prototype.extractUserFromToken.mockResolvedValue(mockUserData);
      mockAnalysisService.AnalysisService.prototype.validateRequest.mockReturnValue({
        valid: true,
        error: null
      });
      mockAnalysisService.AnalysisService.prototype.analyzeContent.mockResolvedValue(mockAnalysisResult);

      const response = await analysisController.handleAnalysisRequest(mockRequest, mockEnv, 'quick');

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toEqual(mockAnalysisResult);
    });

    it('should handle successful deep analysis', async () => {
      const mockRequest = new Request('https://api.example.com/analyze-deep', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          text: 'This is a test content for deep analysis',
          mode: 'deep'
        })
      });

      const mockUserData = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      };

      const mockAnalysisResult = {
        classification: 'human-written',
        confidenceLevel: 'medium',
        confidenceScore: 0.65,
        keyIndicators: ['natural flow', 'personal anecdotes'],
        reasoning: 'The text shows human-like characteristics',
        metadata: {
          wordCount: 10,
          provider: 'anthropic',
          analysisTime: 3000
        },
        cacheStatus: 'hit'
      };

      mockAuthService.AuthService.prototype.extractUserFromToken.mockResolvedValue(mockUserData);
      mockAnalysisService.AnalysisService.prototype.validateRequest.mockReturnValue({
        valid: true,
        error: null
      });
      mockAnalysisService.AnalysisService.prototype.analyzeContent.mockResolvedValue(mockAnalysisResult);

      const response = await analysisController.handleAnalysisRequest(mockRequest, mockEnv, 'deep');

      expect(response.status).toBe(200);
      const responseBody = await response.json();
      expect(responseBody.success).toBe(true);
      expect(responseBody.data).toEqual(mockAnalysisResult);
    });

    it('should handle authentication failure', async () => {
      const mockRequest = new Request('https://api.example.com/analyze-quick', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer invalid-token'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          text: 'This is a test content for analysis',
          mode: 'quick'
        })
      });

      mockAuthService.AuthService.prototype.extractUserFromToken.mockRejectedValue(
        new Error('Authentication failed: Invalid token')
      );

      const response = await analysisController.handleAnalysisRequest(mockRequest, mockEnv, 'quick');

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Authentication failed');
      expect(responseBody.message).toBe('Authentication failed: Invalid token');
    });

    it('should handle missing authorization header', async () => {
      const mockRequest = new Request('https://api.example.com/analyze-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://example.com',
          text: 'This is a test content for analysis',
          mode: 'quick'
        })
      });

      const response = await analysisController.handleAnalysisRequest(mockRequest, mockEnv, 'quick');

      expect(response.status).toBe(401);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Authorization header is required');
    });

    it('should handle validation failure', async () => {
      const mockRequest = new Request('https://api.example.com/analyze-quick', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          text: '', // Empty text should fail validation
          mode: 'quick'
        })
      });

      const mockUserData = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockAuthService.AuthService.prototype.extractUserFromToken.mockResolvedValue(mockUserData);
      mockAnalysisService.AnalysisService.prototype.validateRequest.mockReturnValue({
        valid: false,
        error: 'Text content is required'
      });

      const response = await analysisController.handleAnalysisRequest(mockRequest, mockEnv, 'quick');

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Validation failed');
      expect(responseBody.message).toBe('Text content is required');
    });

    it('should handle analysis service failure', async () => {
      const mockRequest = new Request('https://api.example.com/analyze-quick', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token'
        },
        body: JSON.stringify({
          url: 'https://example.com',
          text: 'This is a test content for analysis',
          mode: 'quick'
        })
      });

      const mockUserData = {
        userId: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User'
      };

      mockAuthService.AuthService.prototype.extractUserFromToken.mockResolvedValue(mockUserData);
      mockAnalysisService.AnalysisService.prototype.validateRequest.mockReturnValue({
        valid: true,
        error: null
      });
      mockAnalysisService.AnalysisService.prototype.analyzeContent.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      const response = await analysisController.handleAnalysisRequest(mockRequest, mockEnv, 'quick');

      expect(response.status).toBe(429);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Analysis failed');
      expect(responseBody.message).toBe('Rate limit exceeded');
    });

    it('should handle invalid request body', async () => {
      const mockRequest = new Request('https://api.example.com/analyze-quick', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-jwt-token'
        },
        body: 'invalid-json'
      });

      const response = await analysisController.handleAnalysisRequest(mockRequest, mockEnv, 'quick');

      expect(response.status).toBe(400);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Invalid request body');
    });
  });
}); 