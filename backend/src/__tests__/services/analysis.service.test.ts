import { AnalysisService } from '../../services/analysis.service';
import type { Env, AnalysisRequest, AnalysisResult, ApiResponse } from '../../types/index';

// Mock fetch
global.fetch = jest.fn();

// Mock the dependent services
jest.mock('../../services/cache.service');
jest.mock('../../services/rate-limit.service');
jest.mock('../../services/validation.service');

describe('AnalysisService', () => {
  let analysisService: AnalysisService;
  let mockEnv: Env;
  let mockCacheService: any;
  let mockRateLimitService: any;
  let mockValidationService: any;

  beforeEach(() => {
    analysisService = new AnalysisService();
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
        run: jest.fn(),
        all: jest.fn()
      }
    };

    // Get mocked instances
    mockCacheService = require('../../services/cache.service');
    mockRateLimitService = require('../../services/rate-limit.service');
    mockValidationService = require('../../services/validation.service');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should validate valid request', () => {
      const validRequest: AnalysisRequest = {
        url: 'https://example.com',
        text: 'This is a valid text with enough content to pass validation.',
        userId: 'test-user-id',
        mode: 'quick'
      };

      mockValidationService.ValidationService.prototype.validateAnalysisRequest.mockReturnValue({
        valid: true,
        error: null
      });

      const result = analysisService.validateRequest(validRequest);

      expect(result.valid).toBe(true);
      expect(mockValidationService.ValidationService.prototype.validateAnalysisRequest).toHaveBeenCalledWith(validRequest);
    });

    it('should reject request with missing text', () => {
      const invalidRequest: AnalysisRequest = {
        url: 'https://example.com',
        text: '',
        userId: 'test-user-id',
        mode: 'quick'
      };

      mockValidationService.ValidationService.prototype.validateAnalysisRequest.mockReturnValue({
        valid: false,
        error: 'Text content is required'
      });

      const result = analysisService.validateRequest(invalidRequest);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Text content is required');
    });
  });

  describe('analyzeContent', () => {
    it('should return cached result when available', async () => {
      const requestData: AnalysisRequest = {
        url: 'https://example.com',
        text: 'Test content for analysis',
        userId: 'test-user-id',
        mode: 'quick'
      };

      const cachedResult: AnalysisResult = {
        classification: 'ai-generated',
        confidenceLevel: 'high',
        confidenceScore: 0.85,
        keyIndicators: ['repetitive patterns', 'unnatural flow'],
        reasoning: 'The text shows clear signs of AI generation',
        metadata: {
          wordCount: 5,
          provider: 'openai',
          analysisTime: 1000
        }
      };

      // Mock rate limit check
      mockRateLimitService.RateLimitService.prototype.checkRateLimit.mockResolvedValue({
        allowed: true,
        retryAfter: 0
      });

      // Mock cache hit
      mockCacheService.CacheService.prototype.generateCacheKey.mockReturnValue('test-cache-key');
      mockCacheService.CacheService.prototype.getCache.mockResolvedValue(cachedResult);

      const result = await analysisService.analyzeContent(requestData, mockEnv, 'test-user-id');

      expect(result).toEqual({
        ...cachedResult,
        cacheStatus: 'hit'
      });
      expect(mockCacheService.CacheService.prototype.getCache).toHaveBeenCalledWith('test-cache-key', mockEnv);
    });

    it('should perform analysis when cache miss occurs', async () => {
      const requestData: AnalysisRequest = {
        url: 'https://example.com',
        text: 'Test content for analysis',
        userId: 'test-user-id',
        mode: 'quick'
      };

      const analysisResult: AnalysisResult = {
        classification: 'human-written',
        confidenceLevel: 'medium',
        confidenceScore: 0.65,
        keyIndicators: ['natural flow', 'personal anecdotes'],
        reasoning: 'The text shows human-like characteristics',
        metadata: {
          wordCount: 5,
          provider: 'openai',
          analysisTime: 1500
        }
      };

      // Mock rate limit check
      mockRateLimitService.RateLimitService.prototype.checkRateLimit.mockResolvedValue({
        allowed: true,
        retryAfter: 0
      });

      // Mock cache miss
      mockCacheService.CacheService.prototype.generateCacheKey.mockReturnValue('test-cache-key');
      mockCacheService.CacheService.prototype.getCache.mockResolvedValue(null);
      mockCacheService.CacheService.prototype.setCache.mockResolvedValue(undefined);

      // Mock OpenAI API response
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                classification: 'human-written',
                confidenceLevel: 'medium',
                confidenceScore: 0.65,
                keyIndicators: ['natural flow', 'personal anecdotes'],
                reasoning: 'The text shows human-like characteristics'
              })
            }
          }]
        })
      });

      const result = await analysisService.analyzeContent(requestData, mockEnv, 'test-user-id');

      expect(result).toEqual({
        ...analysisResult,
        cacheStatus: 'miss'
      });
      expect(mockCacheService.CacheService.prototype.setCache).toHaveBeenCalledWith(
        'test-cache-key',
        analysisResult,
        requestData,
        mockEnv
      );
    });

    it('should throw error when rate limit exceeded', async () => {
      const requestData: AnalysisRequest = {
        url: 'https://example.com',
        text: 'Test content for analysis',
        userId: 'test-user-id',
        mode: 'quick'
      };

      // Mock rate limit exceeded
      mockRateLimitService.RateLimitService.prototype.checkRateLimit.mockResolvedValue({
        allowed: false,
        retryAfter: 60
      });

      await expect(analysisService.analyzeContent(requestData, mockEnv, 'test-user-id'))
        .rejects.toThrow('Rate limit exceeded. Retry after 60 seconds');
    });

    it('should fallback to Anthropic when OpenAI fails', async () => {
      const requestData: AnalysisRequest = {
        url: 'https://example.com',
        text: 'Test content for analysis',
        userId: 'test-user-id',
        mode: 'quick'
      };

      const analysisResult: AnalysisResult = {
        classification: 'ai-generated',
        confidenceLevel: 'high',
        confidenceScore: 0.9,
        keyIndicators: ['repetitive patterns'],
        reasoning: 'The text shows clear AI patterns',
        metadata: {
          wordCount: 5,
          provider: 'anthropic',
          analysisTime: 2000
        }
      };

      // Mock rate limit check
      mockRateLimitService.RateLimitService.prototype.checkRateLimit.mockResolvedValue({
        allowed: true,
        retryAfter: 0
      });

      // Mock cache miss
      mockCacheService.CacheService.prototype.generateCacheKey.mockReturnValue('test-cache-key');
      mockCacheService.CacheService.prototype.getCache.mockResolvedValue(null);
      mockCacheService.CacheService.prototype.setCache.mockResolvedValue(undefined);

      // Mock OpenAI failure
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('OpenAI API error'));

      // Mock Anthropic success
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          content: [{
            text: JSON.stringify({
              classification: 'ai-generated',
              confidenceLevel: 'high',
              confidenceScore: 0.9,
              keyIndicators: ['repetitive patterns'],
              reasoning: 'The text shows clear AI patterns'
            })
          }]
        })
      });

      const result = await analysisService.analyzeContent(requestData, mockEnv, 'test-user-id');

      expect(result).toEqual({
        ...analysisResult,
        cacheStatus: 'miss'
      });
      expect(result.metadata.provider).toBe('anthropic');
    });

    it('should throw error when all AI providers fail', async () => {
      const requestData: AnalysisRequest = {
        url: 'https://example.com',
        text: 'Test content for analysis',
        userId: 'test-user-id',
        mode: 'quick'
      };

      // Mock rate limit check
      mockRateLimitService.RateLimitService.prototype.checkRateLimit.mockResolvedValue({
        allowed: true,
        retryAfter: 0
      });

      // Mock cache miss
      mockCacheService.CacheService.prototype.generateCacheKey.mockReturnValue('test-cache-key');
      mockCacheService.CacheService.prototype.getCache.mockResolvedValue(null);

      // Mock both OpenAI and Anthropic failures
      (fetch as jest.Mock).mockRejectedValue(new Error('API error'));

      await expect(analysisService.analyzeContent(requestData, mockEnv, 'test-user-id'))
        .rejects.toThrow('Content analysis failed. Please try again later.');
    });
  });
}); 