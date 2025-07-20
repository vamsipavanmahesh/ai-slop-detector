# AI Slop Detector

A Chrome extension that detects AI-generated content using advanced machine learning analysis. The system consists of a Chrome extension frontend and a Cloudflare Workers backend API.

## System Architecture

```mermaid
graph TB
    %% External Components
    Chrome[Chrome Extension] --> Backend[Cloudflare Workers Backend]
    
    %% AI Providers
    Backend --> OpenAI[OpenAI GPT-4]
    Backend --> Anthropic[Anthropic Claude]
    
    %% Main Components
    subgraph "Chrome Extension"
        Content[Content Extractor]
        UI[User Interface]
        Content --> UI
    end
    
    subgraph "Cloudflare Workers Backend"
        Controllers[Controllers Layer]
        Services[Services Layer]
        Middleware[Middleware Layer]
        
        Controllers --> Services
        Services --> Middleware
    end
    
    subgraph "Services Layer"
        AuthService[Auth Service]
        AnalysisService[Analysis Service]
        CacheService[Cache Service]
        RateLimitService[Rate Limit Service]
        ValidationService[Validation Service]
    end
    
    subgraph "Supabase Database"
        Users[(Users Table)]
        TokenBlacklist[(Token Blacklist)]
        URLCache[(Cache Entries)]
        UsageAnalytics[(Usage Analytics)]
    end
    
    subgraph "External AI Services"
        OpenAI
        Anthropic
    end
    
    %% Data Flow
    Chrome --> Controllers
    Services --> Users
    Services --> TokenBlacklist
    Services --> URLCache
    Services --> UsageAnalytics
    Services --> OpenAI
    Services --> Anthropic
    
    %% Styling
    classDef chrome fill:#4285f4,stroke:#333,stroke-width:2px,color:#fff
    classDef backend fill:#ff6b35,stroke:#333,stroke-width:2px,color:#fff
    classDef database fill:#00d4aa,stroke:#333,stroke-width:2px,color:#fff
    classDef external fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    
    class Chrome,Content,UI chrome
    class Backend,Controllers,Services,Middleware backend
    class Users,TokenBlacklist,URLCache,UsageAnalytics database
    class OpenAI,Anthropic external
```

## Request Flow

```mermaid
sequenceDiagram
    participant CE as Chrome Extension
    participant API as Cloudflare Workers API
    participant Cache as Cache System
    participant DB as Supabase Database
    participant AI as AI Providers
    
    CE->>API: POST /analyze-quick
    Note over CE,API: {url, text, userId, mode, lastModified}
    
    API->>API: Validate Request
    alt Invalid Request
        API-->>CE: 400 Bad Request
    end
    
    API->>API: Check Rate Limit
    alt Rate Limit Exceeded
        API-->>CE: 429 Too Many Requests
    end
    
    API->>API: Generate Cache Key
    Note over API: {urlHash}:{contentHash}:{lastModified}:{mode}
    
    API->>Cache: Check Cache
    Cache->>DB: Query URL Cache Table
    
    alt Cache Hit
        DB-->>Cache: Cached Result
        Cache-->>API: Analysis Result
        API-->>CE: 200 OK (cached)
    else Cache Miss
        API->>AI: Analyze Content
        Note over API,AI: Try OpenAI first, fallback to Anthropic
        
        AI-->>API: Analysis Result
        Note over API: {classification, confidence, indicators, reasoning}
        
        API->>Cache: Store Result
        Cache->>DB: Insert Cache Entry
        
        API-->>CE: 200 OK (fresh)
    end
```

## Cache Strategy

```mermaid
graph LR
    subgraph "Multi-Factor Cache Key"
        URL[URL Hash]
        Content[Content Hash]
        Modified[Last Modified]
        Mode[Analysis Mode]
    end
    
    subgraph "Cache Components"
        URLHash[URL Normalization]
        ContentHash[SHA-256 Hash]
        Timestamp[Timestamp Handling]
        ModeType[Mode Validation]
    end
    
    URL --> URLHash
    Content --> ContentHash
    Modified --> Timestamp
    Mode --> ModeType
    
    URLHash --> Key[Cache Key]
    ContentHash --> Key
    Timestamp --> Key
    ModeType --> Key
    
    Key --> Format["{urlHash}:{contentHash}:{lastModified}:{mode}"]
```

## Rate Limiting

```mermaid
graph TD
    subgraph "Rate Limiting System"
        Request[Incoming Request]
        Check[Check Daily Limit]
        Increment[Increment Counter]
        Allow[Allow Request]
        Block[Block Request]
    end
    
    subgraph "Database"
        Analytics[Usage Analytics Table]
    end
    
    Request --> Check
    Check --> Analytics
    
    Check -->|Under Limit| Increment
    Check -->|Over Limit| Block
    
    Increment --> Analytics
    Increment --> Allow
    
    Block --> Response[429 Response]
    Allow --> Continue[Continue Processing]
```

## Features

### Chrome Extension
- **Content Extraction**: Automatically extracts text content from web pages
- **Real-time Analysis**: Instant AI detection with confidence scores
- **User-friendly Interface**: Clean, intuitive UI with detailed results
- **Privacy-focused**: No content storage, only cryptographic hashes

### Backend API
- **Layered Architecture**: Controllers, Services, and Middleware with clear separation of concerns
- **Authentication**: Google OAuth integration with JWT tokens
- **Multi-Provider AI Analysis**: OpenAI GPT-4 and Anthropic Claude with automatic fallback
- **Intelligent Caching**: Multi-factor cache strategy with content change detection
- **Rate Limiting**: Daily limits (50 analyses/day) with authenticated user tracking
- **Global Edge Network**: Sub-100ms response times worldwide
- **TypeScript**: Full type safety and modern development experience

### Database
- **Users Table**: Stores authenticated user information
- **Token Blacklist**: Tracks invalidated JWT tokens for security
- **Cache Entries**: Stores analysis results with composite unique indexes
- **Usage Analytics**: Tracks daily usage for rate limiting
- **Row Level Security**: Database-level access controls
- **Real-time Capabilities**: Supabase real-time features

## Technology Stack

- **Frontend**: Chrome Extension (JavaScript)
- **Backend**: Cloudflare Workers (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **AI Providers**: OpenAI GPT-4, Anthropic Claude
- **Caching**: Multi-factor cache strategy
- **Rate Limiting**: Daily limits with abuse prevention

## Security & Privacy

- **HTTPS Everywhere**: All communications encrypted
- **No Content Storage**: Only cryptographic hashes stored
- **Authenticated Users**: Google OAuth with secure JWT tokens
- **Environment Variables**: Sensitive configuration isolated
- **Row Level Security**: Database-level access controls

## Performance

- **Global Edge Network**: Sub-100ms response times
- **Intelligent Caching**: 90%+ cache hit rates
- **Fallback Strategy**: Automatic provider switching
- **Optimized Requests**: First 500 words analysis
- **Compression**: Efficient data transfer

## Getting Started

### Prerequisites
- Node.js 18+
- Chrome browser
- Supabase account
- OpenAI API key
- Anthropic API key

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/ai-slop-detector.git
   cd ai-slop-detector
   ```

2. **Backend Setup**:
   ```bash
   cd backend
   npm install
   ```

3. **Configure environment variables**:
   Create a `.dev.vars` file:
   ```env
   SUPABASE_URL=your-supabase-url
   SUPABASE_ANON_KEY=your-supabase-anon-key
   OPENAI_API_KEY=your-openai-api-key
   ANTHROPIC_API_KEY=your-anthropic-api-key
   JWT_SECRET=your-jwt-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   ```

4. **Set up database**:
   Run the SQL scripts in `backend/database/schema.sql`

5. **Deploy backend**:
   ```bash
   npm run deploy
   ```

6. **Chrome Extension Setup**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the extension directory
   - Configure the backend URL in the extension settings

## API Documentation

### POST /analyze-quick

Analyzes content to determine if it's AI-generated or human-written.

**Request Body**:
```json
{
  "url": "https://example.com/article",
  "text": "The first 500 words of content to analyze...",
  "userId": "anonymous-user-id",
  "mode": "quick",
  "lastModified": "2024-01-15T10:30:00Z"
}
```

**Response**:
```json
{
  "classification": "ai-generated",
  "confidenceLevel": "high",
  "confidenceScore": 0.85,
  "keyIndicators": ["repetitive patterns", "formal tone"],
  "reasoning": "The text exhibits characteristics typical of AI-generated content...",
  "metadata": {
    "wordCount": 450,
    "provider": "openai",
    "analysisTime": 1250
  },
  "cacheStatus": "miss"
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with proper TypeScript types
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
