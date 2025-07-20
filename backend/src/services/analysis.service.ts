import { CacheService } from './cache.service';
import { RateLimitService } from './rate-limit.service';
import { ValidationService } from './validation.service';
import type { Env, AnalysisRequest, AnalysisResult, ApiResponse, ValidationResult } from '../types/index';

export class AnalysisService {
  private cacheService: CacheService;
  private rateLimitService: RateLimitService;
  private validationService: ValidationService;

  constructor() {
    this.cacheService = new CacheService();
    this.rateLimitService = new RateLimitService();
    this.validationService = new ValidationService();
  }

  /**
   * Main analysis method that orchestrates the entire analysis process
   */
  async analyzeContent(requestData: AnalysisRequest, env: Env, userId: string): Promise<ApiResponse> {
    const startTime = Date.now();
    
    // Check rate limits
    const rateLimitResult = await this.rateLimitService.checkRateLimit(userId, env);
    if (!rateLimitResult.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimitResult.retryAfter} seconds`);
    }

    // Check cache first
    const cacheKey = this.cacheService.generateCacheKey(requestData);
    const cachedResult = await this.cacheService.getCache(cacheKey, env);
    if (cachedResult) {
      return {
        ...cachedResult,
        cacheStatus: 'hit'
      };
    }

    // Perform analysis
    const analysisResult = await this.performAnalysis(requestData, env);
    
    // Cache the result
    await this.cacheService.setCache(cacheKey, analysisResult, requestData, env);
    
    return {
      ...analysisResult,
      cacheStatus: 'miss'
    };
  }

  /**
   * Validate analysis request
   */
  validateRequest(requestData: AnalysisRequest): ValidationResult {
    return this.validationService.validateAnalysisRequest(requestData);
  }

  /**
   * Perform the actual content analysis using AI providers
   */
  private async performAnalysis(requestData: AnalysisRequest, env: Env): Promise<AnalysisResult> {
    const startTime = Date.now();
    
    try {
      // Try OpenAI first, fallback to Anthropic if OpenAI fails
      let result: AnalysisResult;
      
      try {
        result = await this.analyzeWithOpenAI(requestData, env);
      } catch (openAIError) {
        console.warn('OpenAI analysis failed, trying Anthropic:', openAIError);
        result = await this.analyzeWithAnthropic(requestData, env);
      }
      
      const analysisTime = Date.now() - startTime;
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          analysisTime
        }
      };
      
    } catch (error) {
      console.error('All AI providers failed:', error);
      throw new Error('Content analysis failed. Please try again later.');
    }
  }

  /**
   * Analyzes content using OpenAI API
   */
  private async analyzeWithOpenAI(requestData: AnalysisRequest, env: Env): Promise<AnalysisResult> {
    const { text, mode } = requestData;
    const wordCount = text.trim().split(/\s+/).length;
    
    const prompt = mode === 'quick' 
      ? this.generateQuickPrompt(text)
      : this.generateDeepPrompt(text);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at detecting AI-generated content. Analyze the provided text and determine if it was written by AI or a human.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        max_tokens: 500
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    const analysis = data.choices[0]?.message?.content;
    
    if (!analysis) {
      throw new Error('Invalid response from OpenAI');
    }
    
    return this.parseAnalysisResult(analysis, 'openai', wordCount);
  }

  /**
   * Analyzes content using Anthropic Claude API
   */
  private async analyzeWithAnthropic(requestData: AnalysisRequest, env: Env): Promise<AnalysisResult> {
    const { text, mode } = requestData;
    const wordCount = text.trim().split(/\s+/).length;
    
    const prompt = mode === 'quick' 
      ? this.generateQuickPrompt(text)
      : this.generateDeepPrompt(text);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.ANTHROPIC_API_KEY}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 500,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }
    
    const data = await response.json();
    const analysis = data.content[0]?.text;
    
    if (!analysis) {
      throw new Error('Invalid response from Anthropic');
    }
    
    return this.parseAnalysisResult(analysis, 'anthropic', wordCount);
  }

  /**
   * Generates prompt for quick analysis mode
   */
  private generateQuickPrompt(text: string): string {
    return `Analyze the following text and determine if it was written by AI or a human. Provide your response in this exact JSON format:

{
  "classification": "ai-generated" or "human-written",
  "confidenceLevel": "high", "medium", or "low",
  "confidenceScore": 0.0 to 1.0,
  "keyIndicators": ["indicator1", "indicator2"],
  "reasoning": "Brief explanation of your decision"
}

Text to analyze:
${text}`;
  }

  /**
   * Generates prompt for deep analysis mode
   */
  private generateDeepPrompt(text: string): string {
    return `Perform a comprehensive analysis of the following text to determine if it was written by AI or a human. Consider multiple factors including writing style, complexity, consistency, and common AI patterns. Provide your response in this exact JSON format:

{
  "classification": "ai-generated" or "human-written",
  "confidenceLevel": "high", "medium", or "low",
  "confidenceScore": 0.0 to 1.0,
  "keyIndicators": ["detailed indicator 1", "detailed indicator 2", "detailed indicator 3"],
  "reasoning": "Detailed explanation of your analysis including specific patterns, writing characteristics, and evidence that led to your conclusion"
}

Text to analyze:
${text}`;
  }

  /**
   * Parses the AI response into a structured result
   */
  private parseAnalysisResult(analysis: string, provider: 'openai' | 'anthropic', wordCount: number): AnalysisResult {
    try {
      // Extract JSON from the response
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        classification: parsed.classification,
        confidenceLevel: parsed.confidenceLevel,
        confidenceScore: parsed.confidenceScore,
        keyIndicators: parsed.keyIndicators || [],
        reasoning: parsed.reasoning,
        metadata: {
          wordCount,
          provider,
          analysisTime: 0 // Will be set by the calling function
        }
      };
      
    } catch (error) {
      console.error('Error parsing AI response:', error);
      throw new Error('Failed to parse AI analysis result');
    }
  }
} 