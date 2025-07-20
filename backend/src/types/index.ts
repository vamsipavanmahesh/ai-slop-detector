// Environment variables interface
export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  OPENAI_API_KEY: string;
  ANTHROPIC_API_KEY: string;
  JWT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  DB: any; // Cloudflare D1 database
}

// Request data interface
export interface AnalysisRequest {
  url: string;
  text: string;
  userId: string;
  mode: 'quick' | 'deep';
  lastModified?: string;
}

// Analysis result interface
export interface AnalysisResult {
  classification: 'ai-generated' | 'human-written';
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceScore: number;
  keyIndicators: string[];
  reasoning: string;
  metadata: {
    wordCount: number;
    provider: 'openai' | 'anthropic';
    analysisTime: number;
    cacheCreatedAt?: string;
  };
}

// Cache entry interface
export interface CacheEntry {
  url_hash: string;
  content_hash: string;
  last_modified: string;
  full_url: string;
  domain: string;
  mode: 'quick' | 'deep';
  result: {
    classification: 'ai-generated' | 'human-written';
    confidence_level: 'high' | 'medium' | 'low';
    confidence_score: number;
    key_indicators: string[];
    reasoning: string;
    metadata: {
      word_count: number;
      provider: 'openai' | 'anthropic';
      analysis_time: number;
    };
  };
  created_at: string;
}

// Usage analytics interface
export interface UsageAnalytics {
  user_id: string;
  daily_count: number;
  created_at: string;
}

// Rate limit result interface
export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  message?: string;
  currentCount?: number;
}

// Validation result interface
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Cache statistics interface
export interface CacheStats {
  totalEntries: number;
  domainStats: Array<{
    domain: string;
    count: number;
  }>;
}

// API response interface
export interface ApiResponse {
  classification: 'ai-generated' | 'human-written';
  confidenceLevel: 'high' | 'medium' | 'low';
  confidenceScore: number;
  keyIndicators: string[];
  reasoning: string;
  metadata: {
    wordCount: number;
    provider: 'openai' | 'anthropic';
    analysisTime: number;
    cacheCreatedAt?: string;
  };
  cacheStatus: 'hit' | 'miss';
}

// Error response interface
export interface ErrorResponse {
  error: string;
  message?: string;
  retryAfter?: number;
}

// Authentication types
export interface GoogleUser {
  sub: string; // Google ID
  email: string;
  name: string;
  picture?: string;
  email_verified: boolean;
}

export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture_url?: string;
  created_at: string;
  last_login_at: string;
}

// Safe user response for frontend (camelCase)
export interface SafeUserResponse {
  id: string;
  email: string;
  name: string;
  pictureUrl?: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
  iat: number;
  exp: number;
}

export interface AuthRequest {
  idToken: string;
}

export interface AuthResponse {
  token: string;
  user: User;
  isNewUser: boolean;
}

// Safe auth response for frontend
export interface SafeAuthResponse {
  token: string;
  user: SafeUserResponse;
  isNewUser: boolean;
}

export interface TokenBlacklistEntry {
  id: string;
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

// Database types
export interface DatabaseUser {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture_url?: string;
  created_at: string;
  last_login_at: string;
}

export interface DatabaseTokenBlacklist {
  id: string;
  token_hash: string;
  user_id: string;
  expires_at: string;
  created_at: string;
} 