import type { Env } from '../types/index';

// Mock the modules
jest.mock('../routes', () => ({
  handleRoutes: jest.fn()
}));

const { handleRoutes } = require('../routes');

describe('Main Application', () => {
  let mockEnv: Env;
  let mockRequest: Request;
  let mockCtx: any;

  beforeEach(() => {
    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      JWT_SECRET: 'test-jwt-secret',
      OPENAI_API_KEY: 'test-openai-key',
      ANTHROPIC_API_KEY: 'test-anthropic-key',
      GOOGLE_CLIENT_ID: 'test-google-client-id',
      DB: {
        prepare: jest.fn().mockReturnThis(),
        bind: jest.fn().mockReturnThis(),
        first: jest.fn(),
        run: jest.fn()
      }
    };

    mockCtx = {};
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('CORS Handling', () => {
    test('should handle OPTIONS request with CORS headers', async () => {
      const app = require('../index').default;
      
      // Mock the CORS response from routes
      const mockCorsResponse = new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
      
      handleRoutes.mockResolvedValue(mockCorsResponse);

      mockRequest = new Request('https://api.example.com/test', {
        method: 'OPTIONS'
      });

      const response = await app.fetch(mockRequest, mockEnv, mockCtx);
      
      expect(handleRoutes).toHaveBeenCalledWith(mockRequest, mockEnv);
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });
  });

  describe('Request Routing', () => {
    test('should route requests to handleRoutes', async () => {
      const app = require('../index').default;
      
      const mockResponse = new Response('{"test": "data"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
      handleRoutes.mockResolvedValue(mockResponse);

      mockRequest = new Request('https://api.example.com/analyze-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com', content: 'test content' })
      });

      const response = await app.fetch(mockRequest, mockEnv, mockCtx);
      
      expect(handleRoutes).toHaveBeenCalledWith(mockRequest, mockEnv);
      expect(response).toBe(mockResponse);
    });

    test('should handle errors from handleRoutes', async () => {
      const app = require('../index').default;
      
      const testError = new Error('Test error');
      handleRoutes.mockRejectedValue(testError);

      mockRequest = new Request('https://api.example.com/analyze-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com', content: 'test content' })
      });

      const response = await app.fetch(mockRequest, mockEnv, mockCtx);
      
      expect(response.status).toBe(500);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Internal server error');
      expect(responseBody.message).toBe('Test error');
    });

    test('should handle non-Error exceptions', async () => {
      const app = require('../index').default;
      
      handleRoutes.mockRejectedValue('String error');

      mockRequest = new Request('https://api.example.com/analyze-quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com', content: 'test content' })
      });

      const response = await app.fetch(mockRequest, mockEnv, mockCtx);
      
      expect(response.status).toBe(500);
      const responseBody = await response.json();
      expect(responseBody.error).toBe('Internal server error');
      expect(responseBody.message).toBe('Unknown error');
    });
  });
}); 