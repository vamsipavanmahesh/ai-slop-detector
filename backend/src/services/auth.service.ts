import { createHash } from 'crypto';
import type { Env, AuthRequest, AuthResponse, User, JWTPayload, TokenBlacklistEntry } from '../types/index';

export class AuthService {
  /**
   * Authenticate user with Google OAuth
   */
  async authenticateWithGoogle(requestData: AuthRequest, env: Env): Promise<AuthResponse> {
    try {
      // Verify Google ID token
      const googleUser = await this.verifyGoogleToken(requestData.idToken, env.GOOGLE_CLIENT_ID);
      
      // Find or create user in database
      const user = await this.findOrCreateUser(googleUser, env);
      
      // Generate JWT token
      const token = await this.generateJWT(user, env.JWT_SECRET);
      
      return {
        token,
        user,
        isNewUser: user.created_at === user.last_login_at
      };
      
    } catch (error) {
      console.error('Google authentication error:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  /**
   * Extract and verify user from JWT token
   */
  async extractUserFromToken(authorization: string, env: Env): Promise<JWTPayload> {
    try {
      const token = authorization.replace('Bearer ', '');
      
      // Verify JWT token
      const payload = this.verifyJWT(token, env.JWT_SECRET);
      
      // Check if token is blacklisted
      await this.checkTokenBlacklist(token, env);
      
      return payload;
      
    } catch (error) {
      throw new Error('Authentication failed: Invalid token');
    }
  }

  /**
   * Add token to blacklist
   */
  async addTokenToBlacklist(token: string, userId: string, env: Env): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const { data, error } = await env.DB.prepare(`
      INSERT INTO token_blacklist (token_hash, user_id, expires_at)
      VALUES (?, ?, ?)
    `).bind(tokenHash, userId, expiresAt.toISOString()).run();
    
    if (error) {
      console.error('Error adding token to blacklist:', error);
      throw new Error('Failed to blacklist token');
    }
  }

  /**
   * Clean up expired tokens from blacklist
   */
  async cleanupExpiredTokens(env: Env): Promise<void> {
    try {
      const { error } = await env.DB.prepare(`
        DELETE FROM token_blacklist 
        WHERE expires_at < ?
      `).bind(new Date().toISOString()).run();
      
      if (error) {
        console.error('Error cleaning up expired tokens:', error);
      }
    } catch (error) {
      console.error('Error in cleanupExpiredTokens:', error);
    }
  }

  /**
   * Verify Google ID token
   */
  private async verifyGoogleToken(idToken: string, clientId: string): Promise<any> {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
    
    if (!response.ok) {
      throw new Error('Invalid Google ID token');
    }
    
    const data = await response.json();
    
    if (data.aud !== clientId) {
      throw new Error('Invalid client ID');
    }
    
    return data;
  }

  /**
   * Find or create user in database
   */
  private async findOrCreateUser(googleUser: any, env: Env): Promise<User> {
    const { data: existingUser, error: findError } = await env.DB.prepare(`
      SELECT * FROM users WHERE google_id = ?
    `).bind(googleUser.sub || '').first();
    
    if (findError) {
      console.error('Error finding user:', findError);
      throw new Error('Database error');
    }
    
    if (existingUser) {
      // Update last login
      const { error: updateError } = await env.DB.prepare(`
        UPDATE users SET last_login_at = ? WHERE id = ?
      `).bind(new Date().toISOString(), existingUser.id).run();
      
      if (updateError) {
        console.error('Error updating user login time:', updateError);
      }
      
      return existingUser as User;
    }
    
    // Create new user
    const newUser = {
      id: crypto.randomUUID(),
      google_id: googleUser.sub || '',
      email: googleUser.email || '',
      name: googleUser.name || '',
      picture_url: googleUser.picture || '',
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString()
    };
    
    const { error: insertError } = await env.DB.prepare(`
      INSERT INTO users (id, google_id, email, name, picture_url, created_at, last_login_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      newUser.id,
      newUser.google_id,
      newUser.email,
      newUser.name,
      newUser.picture_url,
      newUser.created_at,
      newUser.last_login_at
    ).run();
    
    if (insertError) {
      console.error('Error creating user:', insertError);
      throw new Error('Failed to create user');
    }
    
    return newUser as User;
  }

  /**
   * Generate JWT token
   */
  private async generateJWT(user: User, secret: string): Promise<string> {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
    };
    
    const encodedHeader = this.base64Encode(JSON.stringify(header));
    const encodedPayload = this.base64Encode(JSON.stringify(payload));
    const signature = await this.createHMAC(`${encodedHeader}.${encodedPayload}`, secret);
    
    return `${encodedHeader}.${encodedPayload}.${signature}`;
  }

  /**
   * Verify JWT token
   */
  private async verifyJWT(token: string, secret: string): Promise<JWTPayload> {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const expectedSignature = await this.createHMAC(`${encodedHeader}.${encodedPayload}`, secret);
    if (signature !== expectedSignature) {
      throw new Error('Invalid token signature');
    }
    
    // Decode payload
    const payload = JSON.parse(this.base64Decode(encodedPayload || ''));
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      throw new Error('Token expired');
    }
    
    return payload as JWTPayload;
  }

  /**
   * Check if token is blacklisted
   */
  private async checkTokenBlacklist(token: string, env: Env): Promise<void> {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    
    const { data, error } = await env.DB.prepare(`
      SELECT * FROM token_blacklist 
      WHERE token_hash = ? AND expires_at > ?
    `).bind(tokenHash, new Date().toISOString()).first();
    
    if (error) {
      console.error('Error checking token blacklist:', error);
      throw new Error('Database error');
    }
    
    if (data) {
      throw new Error('Token is blacklisted');
    }
  }

  /**
   * Create HMAC signature
   */
  private async createHMAC(data: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const messageData = encoder.encode(data);
    
    // Simple HMAC implementation for Cloudflare Workers
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return this.base64Encode(String.fromCharCode(...new Uint8Array(signature)));
  }

  /**
   * Base64 encode a string
   */
  private base64Encode(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
  }

  /**
   * Base64 decode a string
   */
  private base64Decode(str: string): string {
    return decodeURIComponent(escape(atob(str)));
  }
} 