import { createHash } from 'crypto';
import type { Env, AnalysisRequest, AnalysisResult, CacheEntry } from '../types/index';

export class CacheService {
  /**
   * Generate cache key from request data
   */
  generateCacheKey(requestData: AnalysisRequest): string {
    const { url, text, mode } = requestData;
    
    // Create content hash
    const contentHash = createHash('sha256')
      .update(text.trim().toLowerCase())
      .digest('hex')
      .substring(0, 16);
    
    // Create URL hash
    const urlHash = createHash('sha256')
      .update(url.toLowerCase())
      .digest('hex')
      .substring(0, 16);
    
    return `${urlHash}_${contentHash}_${mode}`;
  }

  /**
   * Get cached result
   */
  async getCache(cacheKey: string, env: Env): Promise<AnalysisResult | null> {
    try {
      const { data, error } = await env.DB.prepare(`
        SELECT * FROM cache_entries 
        WHERE url_hash = ? AND content_hash = ? AND mode = ?
      `).bind(
        cacheKey.split('_')[0],
        cacheKey.split('_')[1],
        cacheKey.split('_')[2]
      ).first();
      
      if (error) {
        console.error('Error getting cache:', error);
        return null;
      }
      
      if (!data) {
        return null;
      }
      
      // Check if cache is still valid (within 24 hours)
      const cacheAge = Date.now() - new Date(data.created_at).getTime();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (cacheAge > maxAge) {
        // Cache expired, delete it
        await this.deleteCache(cacheKey, env);
        return null;
      }
      
      return this.convertCacheEntryToResult(data as CacheEntry);
      
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set cache entry
   */
  async setCache(cacheKey: string, result: AnalysisResult, requestData: AnalysisRequest, env: Env): Promise<void> {
    try {
      const [urlHash, contentHash, mode] = cacheKey.split('_');
      const domain = new URL(requestData.url).hostname;
      
      const cacheEntry = {
        url_hash: urlHash,
        content_hash: contentHash,
        last_modified: requestData.lastModified || new Date().toISOString(),
        full_url: requestData.url,
        domain,
        mode,
        result: {
          classification: result.classification,
          confidence_level: result.confidenceLevel,
          confidence_score: result.confidenceScore,
          key_indicators: result.keyIndicators,
          reasoning: result.reasoning,
          metadata: {
            word_count: result.metadata.wordCount,
            provider: result.metadata.provider,
            analysis_time: result.metadata.analysisTime
          }
        },
        created_at: new Date().toISOString()
      };
      
      const { error } = await env.DB.prepare(`
        INSERT INTO cache_entries (
          url_hash, content_hash, last_modified, full_url, domain, mode, 
          result, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        cacheEntry.url_hash,
        cacheEntry.content_hash,
        cacheEntry.last_modified,
        cacheEntry.full_url,
        cacheEntry.domain,
        cacheEntry.mode,
        JSON.stringify(cacheEntry.result),
        cacheEntry.created_at
      ).run();
      
      if (error) {
        console.error('Error setting cache:', error);
      }
      
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cache entry
   */
  async deleteCache(cacheKey: string, env: Env): Promise<void> {
    try {
      const [urlHash, contentHash, mode] = cacheKey.split('_');
      
      const { error } = await env.DB.prepare(`
        DELETE FROM cache_entries 
        WHERE url_hash = ? AND content_hash = ? AND mode = ?
      `).bind(urlHash, contentHash, mode).run();
      
      if (error) {
        console.error('Error deleting cache:', error);
      }
      
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(env: Env): Promise<{ totalEntries: number; domainStats: Array<{ domain: string; count: number }> }> {
    try {
      // Get total entries
      const { data: totalData, error: totalError } = await env.DB.prepare(`
        SELECT COUNT(*) as total FROM cache_entries
      `).first();
      
      if (totalError) {
        console.error('Error getting total cache entries:', totalError);
        return { totalEntries: 0, domainStats: [] };
      }
      
      // Get domain statistics
      const { data: domainData, error: domainError } = await env.DB.prepare(`
        SELECT domain, COUNT(*) as count 
        FROM cache_entries 
        GROUP BY domain 
        ORDER BY count DESC 
        LIMIT 10
      `).all();
      
      if (domainError) {
        console.error('Error getting domain stats:', domainError);
        return { totalEntries: totalData?.total || 0, domainStats: [] };
      }
      
      return {
        totalEntries: totalData?.total || 0,
        domainStats: domainData?.results || []
      };
      
    } catch (error) {
      console.error('Cache stats error:', error);
      return { totalEntries: 0, domainStats: [] };
    }
  }

  /**
   * Convert cache entry to analysis result
   */
  private convertCacheEntryToResult(cacheEntry: CacheEntry): AnalysisResult {
    return {
      classification: cacheEntry.result.classification,
      confidenceLevel: cacheEntry.result.confidence_level,
      confidenceScore: cacheEntry.result.confidence_score,
      keyIndicators: cacheEntry.result.key_indicators,
      reasoning: cacheEntry.result.reasoning,
      metadata: {
        wordCount: cacheEntry.result.metadata.word_count,
        provider: cacheEntry.result.metadata.provider,
        analysisTime: cacheEntry.result.metadata.analysis_time,
        cacheCreatedAt: cacheEntry.created_at
      }
    };
  }
} 