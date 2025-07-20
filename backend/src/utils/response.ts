import type { ErrorResponse } from '../types/index';

/**
 * Create a standardized error response
 */
export function createErrorResponse(message: string, status: number, details?: string): Response {
  const errorResponse: ErrorResponse = {
    error: message,
    ...(details && { message: details })
  };

  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Create a successful JSON response
 */
export function createSuccessResponse(data: any, status: number = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Create a CORS preflight response
 */
export function createCorsResponse(): Response {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 