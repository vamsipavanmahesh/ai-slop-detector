import { handleRoutes } from './routes';
import type { Env, ErrorResponse } from './types/index';

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    try {
      return await handleRoutes(request, env);
    } catch (error) {
      console.error('API Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: errorMessage 
      } as ErrorResponse), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
}; 