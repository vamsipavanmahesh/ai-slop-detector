import type { AnalysisRequest, ValidationResult } from '../types/index';

export class ValidationService {
  private readonly MAX_TEXT_LENGTH = 10000; // 10k characters
  private readonly MIN_TEXT_LENGTH = 10; // 10 characters
  private readonly MAX_URL_LENGTH = 2048; // 2k characters

  /**
   * Validate analysis request
   */
  validateAnalysisRequest(requestData: AnalysisRequest): ValidationResult {
    // Check if all required fields are present
    if (!requestData.text) {
      return { valid: false, error: 'Text content is required' };
    }

    if (!requestData.url) {
      return { valid: false, error: 'URL is required' };
    }

    if (!requestData.mode) {
      return { valid: false, error: 'Analysis mode is required' };
    }

    // Validate text content
    const textValidation = this.validateText(requestData.text);
    if (!textValidation.valid) {
      return textValidation;
    }

    // Validate URL
    const urlValidation = this.validateUrl(requestData.url);
    if (!urlValidation.valid) {
      return urlValidation;
    }

    // Validate mode
    const modeValidation = this.validateMode(requestData.mode);
    if (!modeValidation.valid) {
      return modeValidation;
    }

    return { valid: true };
  }

  /**
   * Validate text content
   */
  private validateText(text: string): ValidationResult {
    if (typeof text !== 'string') {
      return { valid: false, error: 'Text must be a string' };
    }

    const trimmedText = text.trim();
    
    if (trimmedText.length === 0) {
      return { valid: false, error: 'Text cannot be empty' };
    }

    if (trimmedText.length < this.MIN_TEXT_LENGTH) {
      return { 
        valid: false, 
        error: `Text must be at least ${this.MIN_TEXT_LENGTH} characters long` 
      };
    }

    if (trimmedText.length > this.MAX_TEXT_LENGTH) {
      return { 
        valid: false, 
        error: `Text cannot exceed ${this.MAX_TEXT_LENGTH} characters` 
      };
    }

    // Check for excessive whitespace
    if (trimmedText.split(/\s+/).length < 3) {
      return { valid: false, error: 'Text must contain at least 3 words' };
    }

    return { valid: true };
  }

  /**
   * Validate URL
   */
  private validateUrl(url: string): ValidationResult {
    if (typeof url !== 'string') {
      return { valid: false, error: 'URL must be a string' };
    }

    if (url.length === 0) {
      return { valid: false, error: 'URL cannot be empty' };
    }

    if (url.length > this.MAX_URL_LENGTH) {
      return { 
        valid: false, 
        error: `URL cannot exceed ${this.MAX_URL_LENGTH} characters` 
      };
    }

    try {
      const urlObj = new URL(url);
      
      // Check for valid protocol
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { valid: false, error: 'URL must use HTTP or HTTPS protocol' };
      }

      // Check for valid hostname
      if (!urlObj.hostname || urlObj.hostname.length === 0) {
        return { valid: false, error: 'URL must have a valid hostname' };
      }

      // Check for localhost or private IP addresses
      if (this.isPrivateOrLocalhost(urlObj.hostname)) {
        return { valid: false, error: 'URL cannot be localhost or private IP address' };
      }

    } catch (error) {
      return { valid: false, error: 'Invalid URL format' };
    }

    return { valid: true };
  }

  /**
   * Validate analysis mode
   */
  private validateMode(mode: string): ValidationResult {
    if (typeof mode !== 'string') {
      return { valid: false, error: 'Mode must be a string' };
    }

    if (!['quick', 'deep'].includes(mode)) {
      return { valid: false, error: 'Mode must be either "quick" or "deep"' };
    }

    return { valid: true };
  }

  /**
   * Check if hostname is localhost or private IP
   */
  private isPrivateOrLocalhost(hostname: string): boolean {
    const lowerHostname = hostname.toLowerCase();
    
    // Check for localhost
    if (lowerHostname === 'localhost' || lowerHostname.startsWith('localhost.')) {
      return true;
    }

    // Check for private IP ranges
    const privateRanges = [
      /^10\./,                    // 10.0.0.0/8
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
      /^192\.168\./,              // 192.168.0.0/16
      /^127\./,                   // 127.0.0.0/8 (localhost)
      /^169\.254\./,              // 169.254.0.0/16 (link-local)
      /^::1$/,                    // IPv6 localhost
      /^fe80:/,                   // IPv6 link-local
      /^fc00:/,                   // IPv6 unique local
      /^fd00:/                    // IPv6 unique local
    ];

    return privateRanges.some(range => range.test(hostname));
  }

  /**
   * Sanitize text content
   */
  sanitizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, ''); // Remove control characters
  }

  /**
   * Sanitize URL
   */
  sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.toString();
    } catch {
      return url;
    }
  }
} 