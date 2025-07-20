# AI Slop Detector Backend - Deployment Guide

This document provides a comprehensive guide for deploying the AI Slop Detector Backend to production using Cloudflare Workers and Supabase.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [API Keys and Credentials](#api-keys-and-credentials)
5. [Local Development Setup](#local-development-setup)
6. [Production Deployment](#production-deployment)
7. [Staging Deployment](#staging-deployment)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)
9. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts and Services

1. **Cloudflare Account**
   - Sign up at [cloudflare.com](https://cloudflare.com)
   - Enable Cloudflare Workers (free tier available)

2. **Supabase Account**
   - Sign up at [supabase.com](https://supabase.com)
   - Create a new project

3. **OpenAI Account**
   - Sign up at [openai.com](https://openai.com)
   - Generate API key for GPT-4 access

4. **Anthropic Account**
   - Sign up at [anthropic.com](https://anthropic.com)
   - Generate API key for Claude access

5. **Google Cloud Console**
   - Create project at [console.cloud.google.com](https://console.cloud.google.com)
   - Set up OAuth 2.0 credentials

### Required Software

1. **Node.js 18+**
   ```bash
   # Check version
   node --version
   npm --version
   ```

2. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

3. **Git**
   ```bash
   # Check if installed
   git --version
   ```

## Environment Setup

### 1. Clone and Setup Repository

```bash
# Clone the repository
git clone <repository-url>
cd ai-slop-detector/backend

# Install dependencies
npm install

# Verify setup
npm run type-check
```

### 2. Configure Wrangler

Login to Cloudflare:
```bash
wrangler login
```

Verify your account:
```bash
wrangler whoami
```

## Database Setup

### 1. Supabase Project Configuration

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Click "New Project"
   - Choose organization and region
   - Set project name: `ai-slop-detector`
   - Set database password (save securely)

2. **Get Connection Details**
   - Go to Settings → API
   - Copy the following:
     - Project URL
     - Anon/Public Key
     - Service Role Key (for admin operations)

### 2. Database Schema Setup

1. **Access SQL Editor**
   - In Supabase dashboard, go to SQL Editor

2. **Run Schema Script**
   - Copy the contents of `database/schema.sql`
   - Paste into SQL Editor
   - Click "Run" to execute

3. **Verify Tables Created**
   - Go to Table Editor
   - Verify these tables exist:
     - `url_cache`
     - `usage_analytics`

### 3. Row Level Security (RLS)

The schema automatically enables RLS with appropriate policies. Verify:

```sql
-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('url_cache', 'usage_analytics');
```

## API Keys and Credentials

### 1. OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to API Keys
3. Create new secret key
4. Copy the key (starts with `sk-`)

### 2. Anthropic API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Navigate to API Keys
3. Create new API key
4. Copy the key (starts with `sk-ant-`)

### 3. Google OAuth Setup

1. **Create OAuth 2.0 Credentials**
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Select your project
   - Go to APIs & Services → Credentials
   - Click "Create Credentials" → "OAuth 2.0 Client IDs"

2. **Configure OAuth Consent Screen**
   - Application type: External
   - App name: AI Slop Detector
   - User support email: your-email@domain.com
   - Developer contact: your-email@domain.com

3. **Create OAuth Client ID**
   - Application type: Web application
   - Name: AI Slop Detector Backend
   - Authorized redirect URIs:
     - `https://your-worker-domain.workers.dev/auth/callback`
     - `http://localhost:8787/auth/callback` (for development)

4. **Copy Client ID**
   - Copy the generated Client ID (ends with `.apps.googleusercontent.com`)

### 4. JWT Secret Generation

Generate a secure JWT secret:

```bash
# Generate 32-byte random string
openssl rand -base64 32
```

Save this secret securely - it's used to sign JWT tokens.

## Local Development Setup

### 1. Environment Variables

Create `.dev.vars` file in the backend directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key

# AI Provider API Keys
OPENAI_API_KEY=sk-your-openai-api-key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Authentication
JWT_SECRET=your-generated-jwt-secret
GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

### 2. Test Local Development

```bash
# Start development server
npm run dev

# Test endpoints
curl -X POST http://localhost:8787/analyze-quick \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","text":"Test content","mode":"quick"}'
```

### 3. Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Production Deployment

### 1. Update Production Environment Variables

Edit `wrangler.toml` and replace placeholder values:

```toml
[[env.production.vars]]
SUPABASE_URL = "https://your-production-project.supabase.co"
SUPABASE_ANON_KEY = "your-production-supabase-anon-key"
OPENAI_API_KEY = "sk-your-production-openai-key"
ANTHROPIC_API_KEY = "sk-ant-your-production-anthropic-key"
JWT_SECRET = "your-production-jwt-secret"
GOOGLE_CLIENT_ID = "your-production-google-client-id.apps.googleusercontent.com"
```

### 2. Deploy to Production

```bash
# Build the project
npm run build

# Deploy to production
npm run deploy

# Or deploy directly with wrangler
wrangler deploy --env production
```

### 3. Verify Deployment

1. **Check Worker Status**
   ```bash
   wrangler tail --env production
   ```

2. **Test Production Endpoints**
   ```bash
   # Test health endpoint
   curl https://ai-slop-detector-backend.your-subdomain.workers.dev/health
   
   # Test analysis endpoint (requires auth)
   curl -X POST https://ai-slop-detector-backend.your-subdomain.workers.dev/analyze-quick \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer your-jwt-token" \
     -d '{"url":"https://example.com","text":"Test content","mode":"quick"}'
   ```

### 4. Update Google OAuth Redirect URIs

After deployment, update your Google OAuth client:

1. Go to Google Cloud Console
2. Navigate to APIs & Services → Credentials
3. Edit your OAuth 2.0 Client ID
4. Add production redirect URI:
   `https://ai-slop-detector-backend.your-subdomain.workers.dev/auth/callback`

## Staging Deployment

### 1. Create Staging Environment

The `wrangler.toml` already includes staging configuration. Update the staging variables:

```toml
[[env.staging.vars]]
SUPABASE_URL = "https://your-staging-project.supabase.co"
SUPABASE_ANON_KEY = "your-staging-supabase-anon-key"
OPENAI_API_KEY = "sk-your-staging-openai-key"
ANTHROPIC_API_KEY = "sk-ant-your-staging-anthropic-key"
JWT_SECRET = "your-staging-jwt-secret"
GOOGLE_CLIENT_ID = "your-staging-google-client-id.apps.googleusercontent.com"
```

### 2. Deploy to Staging

```bash
# Deploy to staging
wrangler deploy --env staging
```

### 3. Test Staging Environment

```bash
# Test staging endpoints
curl https://ai-slop-detector-backend-staging.your-subdomain.workers.dev/health
```

## Monitoring and Maintenance

### 1. Cloudflare Workers Monitoring

1. **Access Logs**
   ```bash
   # View real-time logs
   wrangler tail --env production
   ```

2. **Analytics Dashboard**
   - Go to Cloudflare Dashboard
   - Navigate to Workers & Pages
   - Select your worker
   - View analytics and metrics

### 2. Supabase Monitoring

1. **Database Monitoring**
   - Go to Supabase Dashboard
   - Navigate to Database → Logs
   - Monitor query performance

2. **API Usage**
   - Go to Settings → API
   - Monitor API usage and limits

### 3. Cache Management

Monitor and manage cache entries:

```sql
-- Check cache statistics
SELECT * FROM get_cache_stats();

-- Clean old cache entries (older than 30 days)
SELECT clean_old_cache_entries(30);

-- Check domain-specific stats
SELECT * FROM get_domain_cache_stats('example.com');
```

### 4. Rate Limiting Monitoring

Monitor usage analytics:

```sql
-- Check daily usage
SELECT user_id, daily_count, created_at 
FROM usage_analytics 
WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;
```

## Troubleshooting

### Common Issues

#### 1. CORS Errors

If you encounter CORS errors, ensure your worker handles CORS properly:

```typescript
// Add CORS headers to responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
```

#### 2. Database Connection Issues

1. **Check Supabase URL and Key**
   - Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` in environment variables
   - Ensure the project is active in Supabase dashboard

2. **Test Database Connection**
   ```bash
   # Test with curl
   curl -X POST https://your-project.supabase.co/rest/v1/url_cache \
     -H "apikey: your-anon-key" \
     -H "Authorization: Bearer your-anon-key"
   ```

#### 3. Authentication Issues

1. **JWT Token Problems**
   - Verify `JWT_SECRET` is set correctly
   - Check token expiration times
   - Ensure Google OAuth client ID is correct

2. **Google OAuth Issues**
   - Verify redirect URIs are correct
   - Check OAuth consent screen configuration
   - Ensure client ID matches environment variable

#### 4. API Rate Limiting

1. **OpenAI Rate Limits**
   - Monitor OpenAI API usage
   - Implement exponential backoff for retries
   - Consider upgrading API plan if needed

2. **Anthropic Rate Limits**
   - Monitor Anthropic API usage
   - Implement proper error handling for rate limits

#### 5. Worker Deployment Issues

1. **Build Errors**
   ```bash
   # Check TypeScript errors
   npm run type-check
   
   # Clean and rebuild
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Environment Variable Issues**
   ```bash
   # Verify environment variables
   wrangler secret list --env production
   ```

### Debug Commands

```bash
# View worker logs
wrangler tail --env production

# Check worker status
wrangler whoami

# List secrets
wrangler secret list --env production

# Test local development
npm run dev

# Run tests
npm test
```

### Performance Optimization

1. **Cache Optimization**
   - Monitor cache hit rates
   - Adjust cache TTL based on usage patterns
   - Implement cache warming strategies

2. **Database Optimization**
   - Monitor query performance
   - Add appropriate indexes
   - Optimize frequently used queries

3. **Worker Optimization**
   - Monitor CPU and memory usage
   - Optimize bundle size
   - Implement efficient error handling

## Security Considerations

### 1. Environment Variables

- Never commit secrets to version control
- Use different secrets for staging and production
- Rotate secrets regularly
- Use strong, randomly generated secrets

### 2. API Security

- Implement proper rate limiting
- Validate all input data
- Use HTTPS for all communications
- Implement proper error handling without exposing sensitive information

### 3. Database Security

- Enable Row Level Security (RLS)
- Use least privilege principle
- Monitor database access logs
- Regularly backup data

### 4. Authentication Security

- Use secure JWT secrets
- Implement proper token expiration
- Validate Google OAuth tokens
- Implement token blacklisting for logout

## Backup and Recovery

### 1. Database Backup

1. **Supabase Backups**
   - Supabase provides automatic daily backups
   - Manual backups available in dashboard
   - Export data using SQL queries

2. **Environment Variables Backup**
   - Store environment variables securely
   - Use password managers for secrets
   - Document all configuration values

### 2. Recovery Procedures

1. **Worker Recovery**
   ```bash
   # Redeploy worker
   wrangler deploy --env production
   ```

2. **Database Recovery**
   - Restore from Supabase backups
   - Re-run schema migrations if needed

3. **Environment Recovery**
   - Restore environment variables
   - Verify all API keys are working
   - Test all endpoints

## Conclusion

This deployment guide covers all aspects of deploying the AI Slop Detector Backend to production. Follow these steps carefully to ensure a successful deployment and maintain a robust, scalable application.

For additional support:
- Check Cloudflare Workers documentation
- Review Supabase documentation
- Monitor application logs and metrics
- Test thoroughly in staging before production deployment 