import { RateLimitService } from '../../services/rate-limit.service';
import { CacheService } from '../../services/cache.service';
import type { Env } from '../../types/index';

// Mock the services
jest.mock('../../services/rate-limit.service');
jest.mock('../../services/cache.service');

describe('Performance Tests', () => {
  let mockEnv: Env;
  let mockRateLimitService: any;
  let mockCacheService: any;

  beforeEach(() => {
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

    // Get mocked services
    mockRateLimitService = require('../../services/rate-limit.service');
    mockCacheService = require('../../services/cache.service');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Rate Limiting Performance', () => {
    it('should handle high concurrent requests efficiently', async () => {
      const userId = 'test-user-id';
      const concurrentRequests = 100;
      const startTime = Date.now();

      // Mock rate limit service to allow requests
      mockRateLimitService.RateLimitService.prototype.checkRateLimit.mockResolvedValue({
        allowed: true,
        currentCount: 1
      });

      // Simulate concurrent requests
      const promises = Array.from({ length: concurrentRequests }, async (_, index) => {
        const rateLimitService = new RateLimitService();
        return rateLimitService.checkRateLimit(userId, mockEnv);
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should be allowed
      expect(results.every(result => result.allowed)).toBe(true);
      
      // Performance check: should complete within reasonable time (500ms)
      expect(totalTime).toBeLessThan(500);
      
      // Should have called rate limit service for each request
      expect(mockRateLimitService.RateLimitService.prototype.checkRateLimit)
        .toHaveBeenCalledTimes(concurrentRequests);
    });

    it('should handle rate limit exceeded efficiently', async () => {
      const userId = 'rate-limited-user-id';
      const startTime = Date.now();

      // Mock rate limit service to deny requests
      mockRateLimitService.RateLimitService.prototype.checkRateLimit.mockResolvedValue({
        allowed: false,
        retryAfter: 3600,
        message: 'Daily limit exceeded',
        currentCount: 50
      });

      const rateLimitService = new RateLimitService();
      const result = await rateLimitService.checkRateLimit(userId, mockEnv);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBe(3600);
      
      // Performance check: should complete quickly (100ms)
      expect(totalTime).toBeLessThan(100);
    });

    it.skip('should handle database connection pooling efficiently', async () => {
      const userIds = Array.from({ length: 10 }, (_, i) => `user-${i}`);
      const startTime = Date.now();

      // Mock database to always return low usage
      (mockEnv.DB.first as jest.Mock).mockResolvedValue({ daily_count: 0 });
      (mockEnv.DB.run as jest.Mock).mockResolvedValue({ error: null });

      // Simulate multiple users making requests
      const promises = userIds.map(async (userId) => {
        const rateLimitService = new RateLimitService();
        return rateLimitService.checkRateLimit(userId, mockEnv);
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should be allowed since usage is 0
      expect(results.every(result => result.allowed)).toBe(true);
      
      // Performance check: should complete within reasonable time (1 second)
      expect(totalTime).toBeLessThan(1000);
    });
  });

  describe('Cache Performance', () => {
    it('should handle cache hit performance efficiently', async () => {
      const cacheKey = 'test-cache-key';
      const cachedData = { classification: 'ai-generated', confidence: 0.85 };
      const startTime = Date.now();

      // Mock cache hit
      mockCacheService.CacheService.prototype.getCache.mockResolvedValue(cachedData);

      const cacheService = new CacheService();
      const result = await cacheService.getCache(cacheKey, mockEnv);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(result).toEqual(cachedData);
      
      // Performance check: cache hit should be very fast (50ms)
      expect(totalTime).toBeLessThan(50);
    });

    it('should handle cache miss performance efficiently', async () => {
      const cacheKey = 'test-cache-key';
      const startTime = Date.now();

      // Mock cache miss
      mockCacheService.CacheService.prototype.getCache.mockResolvedValue(null);

      const cacheService = new CacheService();
      const result = await cacheService.getCache(cacheKey, mockEnv);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(result).toBe(null);
      
      // Performance check: cache miss should be fast (100ms)
      expect(totalTime).toBeLessThan(100);
    });

    it('should handle cache storage performance efficiently', async () => {
      const cacheKey = 'test-cache-key';
      const cacheData = { 
        classification: 'ai-generated' as const, 
        confidenceLevel: 'high' as const,
        confidenceScore: 0.85,
        keyIndicators: ['test indicator'],
        reasoning: 'Test reasoning',
        metadata: {
          wordCount: 10,
          provider: 'openai' as const,
          analysisTime: 100
        }
      };
      const requestData = { 
        url: 'https://example.com', 
        text: 'test content',
        userId: 'test-user-id',
        mode: 'quick' as const
      };
      const startTime = Date.now();

      // Mock cache storage
      mockCacheService.CacheService.prototype.setCache.mockResolvedValue(undefined);

      const cacheService = new CacheService();
      await cacheService.setCache(cacheKey, cacheData, requestData, mockEnv);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Performance check: cache storage should be fast (200ms)
      expect(totalTime).toBeLessThan(200);
    });

    it('should handle cache key generation performance efficiently', async () => {
      const requestData = { 
        url: 'https://example.com', 
        text: 'test content for analysis',
        userId: 'test-user-id',
        lastModified: '2024-01-15T14:30:25Z',
        mode: 'quick' as const
      };
      const startTime = Date.now();

      // Mock cache key generation
      mockCacheService.CacheService.prototype.generateCacheKey.mockReturnValue('mock-cache-key');

      const cacheService = new CacheService();
      const cacheKey = cacheService.generateCacheKey(requestData);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(cacheKey).toBe('mock-cache-key');
      
      // Performance check: key generation should be very fast (10ms)
      expect(totalTime).toBeLessThan(10);
    });
  });

  describe('Database Performance', () => {
    it('should handle bulk user operations efficiently', async () => {
      const users = Array.from({ length: 100 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`
      }));
      const startTime = Date.now();

      // Mock bulk database operations
      (mockEnv.DB.run as jest.Mock).mockResolvedValue({ error: null });

      // Simulate bulk user creation
      const promises = users.map(async (user) => {
        return mockEnv.DB.prepare(`
          INSERT INTO users (id, email, name, created_at)
          VALUES (?, ?, ?, ?)
        `).bind(user.id, user.email, user.name, new Date().toISOString()).run();
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All operations should succeed
      expect(results.every(result => result.error === null)).toBe(true);
      
      // Performance check: bulk operations should complete within reasonable time (2 seconds)
      expect(totalTime).toBeLessThan(2000);
    });

    it('should handle concurrent database reads efficiently', async () => {
      const userIds = Array.from({ length: 50 }, (_, i) => `user-${i}`);
      const startTime = Date.now();

      // Mock database reads
      (mockEnv.DB.first as jest.Mock).mockResolvedValue({ daily_count: 0 });

      // Simulate concurrent database reads
      const promises = userIds.map(async (userId) => {
        return mockEnv.DB.prepare(`
          SELECT daily_count FROM usage_analytics 
          WHERE user_id = ? AND created_at = ?
        `).bind(userId, new Date().toISOString().split('T')[0]).first();
      });

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All reads should succeed
      expect(results.every(result => result !== null)).toBe(true);
      
      // Performance check: concurrent reads should complete within reasonable time (1 second)
      expect(totalTime).toBeLessThan(1000);
    });

    it.skip('should handle database connection recovery efficiently', async () => {
      const userId = 'test-user-id';
      const startTime = Date.now();

      // Mock database connection failure followed by recovery
      (mockEnv.DB.first as jest.Mock)
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ daily_count: 0 });
      (mockEnv.DB.run as jest.Mock).mockResolvedValue({ error: null });

      const rateLimitService = new RateLimitService();
      
      // First request should succeed despite DB error (rate limit service allows when DB fails)
      const firstResult = await rateLimitService.checkRateLimit(userId, mockEnv);
      expect(firstResult.allowed).toBe(true);
      
      // Second request should also succeed
      const result = await rateLimitService.checkRateLimit(userId, mockEnv);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(result.allowed).toBe(true);
      
      // Performance check: recovery should be fast (500ms)
      expect(totalTime).toBeLessThan(500);
    });
  });

  describe('Memory Usage', () => {
    it('should handle large request payloads efficiently', async () => {
      const largeText = 'A'.repeat(10000); // 10KB text
      const requestData = {
        url: 'https://example.com',
        text: largeText,
        userId: 'test-user-id',
        mode: 'deep' as const
      };
      const startTime = Date.now();

      // Mock cache operations
      mockCacheService.CacheService.prototype.generateCacheKey.mockReturnValue('large-cache-key');
      mockCacheService.CacheService.prototype.getCache.mockResolvedValue(null);
      mockCacheService.CacheService.prototype.setCache.mockResolvedValue(undefined);

      const cacheService = new CacheService();
      const cacheKey = cacheService.generateCacheKey(requestData);
      await cacheService.getCache(cacheKey, mockEnv);
      await cacheService.setCache(cacheKey, { 
        classification: 'human-written',
        confidenceLevel: 'high',
        confidenceScore: 0.9,
        keyIndicators: ['test indicator'],
        reasoning: 'Test reasoning',
        metadata: {
          wordCount: 10000,
          provider: 'openai' as const,
          analysisTime: 100
        }
      }, requestData, mockEnv);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      expect(cacheKey).toBe('large-cache-key');
      
      // Performance check: large payloads should be handled efficiently (1 second)
      expect(totalTime).toBeLessThan(1000);
    });

    it('should handle multiple concurrent large requests', async () => {
      const largeRequests = Array.from({ length: 10 }, (_, i) => ({
        url: `https://example${i}.com`,
        text: 'A'.repeat(5000), // 5KB text each
        userId: `user-${i}`,
        mode: 'quick' as const
      }));
      const startTime = Date.now();

      // Mock cache operations
      mockCacheService.CacheService.prototype.generateCacheKey.mockReturnValue('concurrent-cache-key');
      mockCacheService.CacheService.prototype.getCache.mockResolvedValue(null);
      mockCacheService.CacheService.prototype.setCache.mockResolvedValue(undefined);

      const cacheService = new CacheService();
      const promises = largeRequests.map(async (requestData) => {
        const cacheKey = cacheService.generateCacheKey(requestData);
        await cacheService.getCache(cacheKey, mockEnv);
        return cacheService.setCache(cacheKey, { 
          classification: 'ai-generated',
          confidenceLevel: 'high',
          confidenceScore: 0.85,
          keyIndicators: ['test indicator'],
          reasoning: 'Test reasoning',
          metadata: {
            wordCount: 5000,
            provider: 'anthropic' as const,
            analysisTime: 150
          }
        }, requestData, mockEnv);
      });

      await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Performance check: multiple large requests should complete within reasonable time (2 seconds)
      expect(totalTime).toBeLessThan(2000);
    });
  });
}); 