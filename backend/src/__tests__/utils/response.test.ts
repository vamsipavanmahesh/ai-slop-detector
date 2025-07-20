import { createErrorResponse, createSuccessResponse, createCorsResponse } from '../../utils/response';

describe('Response Utils', () => {
  describe('createErrorResponse', () => {
    it('should create error response with message and status', () => {
      const response = createErrorResponse('Bad Request', 400, 'Invalid input');

      expect(response.status).toBe(400);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      return response.json().then(data => {
        expect(data).toEqual({
          error: 'Bad Request',
          message: 'Invalid input'
        });
      });
    });

    it('should create error response without details', () => {
      const response = createErrorResponse('Internal Server Error', 500);

      expect(response.status).toBe(500);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      return response.json().then(data => {
        expect(data).toEqual({
          error: 'Internal Server Error'
        });
      });
    });

    it('should handle different status codes', () => {
      const response = createErrorResponse('Not Found', 404);

      expect(response.status).toBe(404);
    });
  });

  describe('createSuccessResponse', () => {
    it('should create success response with data', () => {
      const testData = { id: 1, name: 'Test' };
      const response = createSuccessResponse(testData, 200);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      return response.json().then(data => {
        expect(data).toEqual(testData);
      });
    });

    it('should create success response with default status', () => {
      const testData = { message: 'Success' };
      const response = createSuccessResponse(testData);

      expect(response.status).toBe(200);
      
      return response.json().then(data => {
        expect(data).toEqual(testData);
      });
    });

    it('should handle different status codes', () => {
      const testData = { created: true };
      const response = createSuccessResponse(testData, 201);

      expect(response.status).toBe(201);
    });

    it('should handle complex data structures', () => {
      const complexData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        metadata: {
          timestamp: '2023-01-01T00:00:00Z',
          version: '1.0.0'
        }
      };

      const response = createSuccessResponse(complexData);

      return response.json().then(data => {
        expect(data).toEqual(complexData);
      });
    });
  });

  describe('createCorsResponse', () => {
    it('should create CORS preflight response', () => {
      const response = createCorsResponse();

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization');
    });

    it('should return null body for CORS response', () => {
      const response = createCorsResponse();

      expect(response.body).toBe(null);
    });

    it('should have correct content type for CORS response', () => {
      const response = createCorsResponse();

      // CORS preflight responses typically don't have a content type
      expect(response.headers.get('Content-Type')).toBe(null);
    });
  });

  describe('Response integration', () => {
    it('should handle error response serialization', () => {
      const response = createErrorResponse('Validation Error', 422, 'Field "email" is required');
      
      return response.json().then(data => {
        expect(typeof data).toBe('object');
        expect(data.error).toBe('Validation Error');
        expect(data.message).toBe('Field "email" is required');
      });
    });

    it('should handle success response serialization', () => {
      const response = createSuccessResponse({ status: 'ok' });
      
      return response.json().then(data => {
        expect(typeof data).toBe('object');
        expect(data.status).toBe('ok');
      });
    });

    it('should handle empty data in success response', () => {
      const response = createSuccessResponse({});
      
      return response.json().then(data => {
        expect(data).toEqual({});
      });
    });
  });
}); 