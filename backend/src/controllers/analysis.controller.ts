import { AnalysisService } from '../services/analysis.service';
import { AuthMiddleware } from '../middleware/auth.middleware';
import { createErrorResponse } from '../utils/response';
import type { Env, AnalysisRequest, ErrorResponse } from '../types/index';

export class AnalysisController {
  private analysisService: AnalysisService;
  private authMiddleware: AuthMiddleware;

  constructor() {
    this.analysisService = new AnalysisService();
    this.authMiddleware = new AuthMiddleware();
  }

  /**
   * Handle analysis requests with authentication
   */
  async handleAnalysisRequest(request: Request, env: Env, mode: 'quick' | 'deep'): Promise<Response> {
    try {
      // Authenticate the request
      const user = await this.authMiddleware.requireAuth(request, env);
      
      // Parse request body
      const requestData: AnalysisRequest = await request.json();
      
      // Validate request
      const validation = this.analysisService.validateRequest(requestData);
      if (!validation.valid) {
        return createErrorResponse(validation.error || 'Invalid request', 400);
      }

      // Perform analysis
      const analysisResult = await this.analysisService.analyzeContent(requestData, env, user.userId);
      
      return new Response(JSON.stringify(analysisResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      if (error instanceof Error && error.message.includes('Authentication')) {
        return this.authMiddleware.createAuthErrorResponse(error);
      }
      
      console.error('Analysis request error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return createErrorResponse('Analysis failed', 500, errorMessage);
    }
  }
} 