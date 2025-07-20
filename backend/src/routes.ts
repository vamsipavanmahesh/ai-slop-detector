import { AuthController } from './controllers/auth.controller';
import { AnalysisController } from './controllers/analysis.controller';
import { createCorsResponse, createErrorResponse } from './utils/response';
import type { Env, ErrorResponse } from './types/index';

export async function handleRoutes(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return createCorsResponse();
  }

  // Initialize controllers
  const authController = new AuthController();
  const analysisController = new AnalysisController();

  try {
    // Authentication routes
    if (path === '/google/sign_in' && request.method === 'POST') {
      return await authController.handleGoogleSignIn(request, env);
    }
    
    if (path === '/auth/logout' && request.method === 'POST') {
      return await authController.handleLogout(request, env);
    }
    
    if (path === '/auth/verify' && request.method === 'POST') {
      return await authController.handleVerifyToken(request, env);
    }
    
    // Analysis routes
    if (path === '/analyze-quick' && request.method === 'POST') {
      return await analysisController.handleAnalysisRequest(request, env, 'quick');
    }
    
    if (path === '/analyze-deep' && request.method === 'POST') {
      return await analysisController.handleAnalysisRequest(request, env, 'deep');
    }

    // Default route - legacy support
    if (path === '/' && request.method === 'POST') {
      return await analysisController.handleAnalysisRequest(request, env, 'quick');
    }

    return new Response('Not found', { status: 404 });

  } catch (error) {
    console.error('Route handling error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse('Internal server error', 500, errorMessage);
  }
} 