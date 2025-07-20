import type { Env, RateLimitResult } from '../types/index';

export class RateLimitService {
  private readonly DAILY_LIMIT = 50; // requests per day
  private readonly WINDOW_SIZE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Check if user has exceeded rate limits
   */
  async checkRateLimit(userId: string, env: Env): Promise<RateLimitResult> {
    try {
      if (!userId) {
        return { allowed: false, message: 'User ID is required' };
      }
      
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Get current usage for today
      const { data: usage, error: usageError } = await env.DB.prepare(`
        SELECT daily_count FROM usage_analytics 
        WHERE user_id = ? AND created_at = ?
      `).bind(userId, today).first();
      
      if (usageError) {
        console.error('Error checking rate limit:', usageError);
        return { allowed: true }; // Allow if database error
      }
      
      const currentCount = usage?.daily_count || 0;
      
      if (currentCount >= this.DAILY_LIMIT) {
        // Calculate retry time (next day)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const retryAfter = Math.ceil((tomorrow.getTime() - Date.now()) / 1000);
        
        return {
          allowed: false,
          retryAfter,
          message: 'Daily limit exceeded',
          currentCount
        };
      }
      
      // Increment usage count - use a separate method call to avoid TypeScript issues
      await this.incrementUsageForUser(userId, today, env);
      
      return {
        allowed: true,
        currentCount: currentCount + 1
      };
      
    } catch (error) {
      console.error('Rate limit check error:', error);
      return { allowed: true }; // Allow if error
    }
  }

  /**
   * Increment usage count for user - separate method to avoid TypeScript issues
   */
  private async incrementUsageForUser(userId: string, date: string, env: Env): Promise<void> {
    return this.incrementUsage(userId, date, env);
  }

  /**
   * Increment usage count for user
   */
  private async incrementUsage(userId: string, date: string, env: Env): Promise<void> {
    try {
      // Try to update existing record
      const { error: updateError } = await env.DB.prepare(`
        UPDATE usage_analytics 
        SET daily_count = daily_count + 1 
        WHERE user_id = ? AND created_at = ?
      `).bind(userId, date).run();
      
      if (updateError) {
        console.error('Error updating usage:', updateError);
        
        // If update failed, try to insert new record
        const { error: insertError } = await env.DB.prepare(`
          INSERT INTO usage_analytics (user_id, daily_count, created_at)
          VALUES (?, 1, ?)
        `).bind(userId, date).run();
        
        if (insertError) {
          console.error('Error inserting usage:', insertError);
        }
      }
      
    } catch (error) {
      console.error('Error incrementing usage:', error);
    }
  }

  /**
   * Get user's current usage statistics
   */
  async getUserUsage(userId: string, env: Env): Promise<{ currentCount: number; limit: number; resetTime: string }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: usage, error } = await env.DB.prepare(`
        SELECT daily_count FROM usage_analytics 
        WHERE user_id = ? AND created_at = ?
      `).bind(userId, today).first();
      
      if (error) {
        console.error('Error getting user usage:', error);
        return { currentCount: 0, limit: this.DAILY_LIMIT, resetTime: this.getResetTime() };
      }
      
      const currentCount = usage?.daily_count || 0;
      
      return {
        currentCount,
        limit: this.DAILY_LIMIT,
        resetTime: this.getResetTime()
      };
      
    } catch (error) {
      console.error('Error getting user usage:', error);
      return { currentCount: 0, limit: this.DAILY_LIMIT, resetTime: this.getResetTime() };
    }
  }

  /**
   * Reset usage for a user (admin function)
   */
  async resetUserUsage(userId: string, env: Env): Promise<void> {
    try {
      const { error } = await env.DB.prepare(`
        DELETE FROM usage_analytics WHERE user_id = ?
      `).bind(userId).run();
      
      if (error) {
        console.error('Error resetting user usage:', error);
      }
      
    } catch (error) {
      console.error('Error resetting user usage:', error);
    }
  }

  /**
   * Get reset time (next day at midnight)
   */
  private getResetTime(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString();
  }
} 