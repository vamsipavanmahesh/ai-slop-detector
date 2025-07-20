-- AI Slop Detector Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- URL Cache Table
-- Stores analysis results with sophisticated multi-factor caching
CREATE TABLE IF NOT EXISTS url_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url_hash VARCHAR(64) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    last_modified VARCHAR(50) NOT NULL,
    full_url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    mode VARCHAR(10) NOT NULL CHECK (mode IN ('quick', 'deep')),
    result JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Composite unique index for cache key
    UNIQUE(url_hash, content_hash, last_modified, mode)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_url_cache_lookup 
ON url_cache(url_hash, content_hash, last_modified, mode);

-- Index for domain-based queries
CREATE INDEX IF NOT EXISTS idx_url_cache_domain 
ON url_cache(domain);

-- Index for cleanup operations
CREATE INDEX IF NOT EXISTS idx_url_cache_created_at 
ON url_cache(created_at);

-- Usage Analytics Table
-- Tracks daily usage per user for rate limiting
CREATE TABLE IF NOT EXISTS usage_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(255) NOT NULL,
    daily_count INTEGER NOT NULL DEFAULT 1,
    created_at DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Unique constraint for daily tracking
    UNIQUE(user_id, created_at)
);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_usage_analytics_user_date 
ON usage_analytics(user_id, created_at);

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE url_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_analytics ENABLE ROW LEVEL SECURITY;

-- URL Cache RLS Policies
-- Allow read access for all authenticated requests
CREATE POLICY "Allow read access to url_cache" ON url_cache
    FOR SELECT USING (true);

-- Allow insert access for all authenticated requests
CREATE POLICY "Allow insert access to url_cache" ON url_cache
    FOR INSERT WITH CHECK (true);

-- Allow update access for all authenticated requests
CREATE POLICY "Allow update access to url_cache" ON url_cache
    FOR UPDATE USING (true);

-- Allow delete access for all authenticated requests
CREATE POLICY "Allow delete access to url_cache" ON url_cache
    FOR DELETE USING (true);

-- Usage Analytics RLS Policies
-- Allow read access for all authenticated requests
CREATE POLICY "Allow read access to usage_analytics" ON usage_analytics
    FOR SELECT USING (true);

-- Allow insert access for all authenticated requests
CREATE POLICY "Allow insert access to usage_analytics" ON usage_analytics
    FOR INSERT WITH CHECK (true);

-- Allow update access for all authenticated requests
CREATE POLICY "Allow update access to usage_analytics" ON usage_analytics
    FOR UPDATE USING (true);

-- Allow delete access for all authenticated requests
CREATE POLICY "Allow delete access to usage_analytics" ON usage_analytics
    FOR DELETE USING (true);

-- Functions for cache management

-- Function to get cache statistics
CREATE OR REPLACE FUNCTION get_cache_stats()
RETURNS TABLE(
    total_entries BIGINT,
    domain_stats JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_entries,
        COALESCE(
            json_agg(
                json_build_object(
                    'domain', domain,
                    'count', domain_count
                )
            ),
            '[]'::json
        ) as domain_stats
    FROM (
        SELECT 
            domain,
            COUNT(*) as domain_count
        FROM url_cache
        GROUP BY domain
    ) domain_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean old cache entries
CREATE OR REPLACE FUNCTION clean_old_cache_entries(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM url_cache 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get domain cache statistics
CREATE OR REPLACE FUNCTION get_domain_cache_stats(target_domain VARCHAR)
RETURNS TABLE(
    total_entries BIGINT,
    quick_mode_count BIGINT,
    deep_mode_count BIGINT,
    oldest_entry TIMESTAMP WITH TIME ZONE,
    newest_entry TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_entries,
        COUNT(*) FILTER (WHERE mode = 'quick')::BIGINT as quick_mode_count,
        COUNT(*) FILTER (WHERE mode = 'deep')::BIGINT as deep_mode_count,
        MIN(created_at) as oldest_entry,
        MAX(created_at) as newest_entry
    FROM url_cache
    WHERE domain = target_domain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments for documentation
COMMENT ON TABLE url_cache IS 'Stores AI content analysis results with multi-factor caching strategy';
COMMENT ON TABLE usage_analytics IS 'Tracks daily usage per user for rate limiting and abuse prevention';
COMMENT ON INDEX idx_url_cache_lookup IS 'Composite index for efficient cache key lookups';
COMMENT ON INDEX idx_url_cache_domain IS 'Index for domain-based queries and cleanup operations';
COMMENT ON INDEX idx_url_cache_created_at IS 'Index for cleanup operations based on creation time'; 