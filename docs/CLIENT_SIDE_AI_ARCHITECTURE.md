# Client-Side AI Architecture Documentation

## Overview

This document describes the new client-side AI architecture for ScholarSync. The architecture shifts document parsing and AI processing from the backend to the frontend, solving OOM (Out-of-Memory) crashes on Render and improving context extraction from images/charts.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────┐     │
│   │  PDF Service │    │ Groq Service │    │ Rate Limiter │     │
│   │ (pdfjs-dist) │    │ (Direct API) │    │ (Token Bucket)│     │
│   └──────┬───────┘    └──────┬───────┘    └──────┬───────┘     │
│          │                   │                   │              │
│          ▼                   ▼                   ▼              │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              Context Extractor Pipeline                  │   │
│   │  1. Download (via proxy) → 2. Parse → 3. Vision → 4. AI │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │              useClientSideAI Hook                        │   │
│   │  Provides: extractContent(), generate(), chat(), etc.    │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────│
                               │
          Streaming Download   │   Save Results
          (via proxy)          │   (optional)
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express)                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌──────────────────┐    ┌──────────────────┐                   │
│   │ Stream Controller │    │   AI Controller   │                   │
│   │ /api/stream/*     │    │ /api/ai/save-*    │                   │
│   │                   │    │                   │                   │
│   │ • download/:id    │    │ • save-solution   │                   │
│   │ • metadata/:id    │    │ • save-extracted  │                   │
│   │ • check/:id       │    │                   │                   │
│   └────────┬──────────┘    └───────────────────┘                   │
│            │                                                       │
│            ▼                                                       │
│   ┌─────────────────────────────────────────────────────────────┐ │
│   │              Google Drive API (Streaming)                    │ │
│   │              No memory buffering - direct pipe               │ │
│   └─────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

## File Structure

### New Backend Files

```
server/
├── controllers/
│   └── streamController.js     # Streaming proxy for Google Drive files
├── routes/
│   └── streamRoutes.js         # Routes for streaming endpoints
```

### New Frontend Files

```
client/src/
├── services/
│   ├── pdfService.js           # PDF parsing with pdfjs-dist
│   ├── groqService.js          # Direct Groq API calls
│   ├── contextExtractor.js     # Extraction pipeline
│   ├── aiGenerationService.js  # AI content generation
│   ├── rateLimiter.js          # Client-side rate limiting
│   └── index.js                # Exports
├── hooks/
│   └── useClientSideAI.js      # Main hook for client-side AI
├── components/
│   ├── common/
│   │   └── ProcessingStatus.jsx # Progress indicator
│   └── dashboard/
│       └── ApiUsageDashboard.jsx # Usage tracking UI
└── pages/
    └── ClientSideWorkspace.jsx  # Example refactored workspace
```

## Components Documentation

### 1. Backend Streaming Proxy

**File:** `server/controllers/streamController.js`

```javascript
// Stream a file from Google Drive without memory buffering
GET /api/stream/download/:fileId?userId=xxx

// Get file metadata only
GET /api/stream/metadata/:fileId?userId=xxx

// Check if user can access file
GET /api/stream/check/:fileId?userId=xxx
```

**Key Features:**
- Uses `res.pipe()` for zero-copy streaming
- No file buffering in server memory
- Proper error handling for access issues
- Sets correct Content-Type and Content-Disposition headers

### 2. PDF Service

**File:** `client/src/services/pdfService.js`

```javascript
import { fetchFileAsArrayBuffer, extractPdfContent } from './services/pdfService';

// Fetch file from streaming proxy
const arrayBuffer = await fetchFileAsArrayBuffer(fileId, userId, serverUrl, onProgress);

// Extract content with images
const result = await extractPdfContent(arrayBuffer, {
    extractImages: true,
    maxImageWidth: 1024,
    onProgress: ({ stage, current, total }) => console.log(stage, current, total)
});

// Result structure:
// {
//   pages: [{ pageNumber, text, hasImage, image (base64) }],
//   totalPages: number
// }
```

### 3. Groq Service

**File:** `client/src/services/groqService.js`

```javascript
import { chatCompletion, processImageWithVision, getUsageSummary } from './services/groqService';

// Direct API call
const response = await chatCompletion({
    messages: [{ role: 'user', content: 'Hello' }],
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
});

// Vision processing
const analysis = await processImageWithVision(
    base64Image,
    'Extract all text from this document'
);

// Get usage stats
const usage = getUsageSummary();
// { allTime: { totalTokens, cost }, today: {...}, byModel: [...] }
```

### 4. Context Extractor

**File:** `client/src/services/contextExtractor.js`

```javascript
import { extractDocumentContext } from './services/contextExtractor';

const result = await extractDocumentContext({
    fileId: 'google-drive-file-id',
    userId: 'user-id',
    fileName: 'Assignment.pdf',
    serverUrl: 'http://localhost:5000',
    useVision: true,
    onProgress: ({ stage, progress, message }) => {
        console.log(`${stage}: ${progress}% - ${message}`);
    }
});

// Stages: download → parse → vision → stitch → complete
```

### 5. AI Generation Service

**File:** `client/src/services/aiGenerationService.js`

```javascript
import { generateContent, chatWithContent } from './services/aiGenerationService';

// Generate solution/quiz/flashcards
const result = await generateContent({
    content: extractedMarkdown,
    mode: 'quiz', // 'draft' | 'explain' | 'quiz' | 'flashcards'
    quizOptions: { difficulty: 'medium', questionCount: 5 },
    assignmentTitle: 'Physics HW',
    courseName: 'Physics 101'
});

// Chat with content
const answer = await chatWithContent(extractedContent, 'What is photosynthesis?', history);
```

### 6. Rate Limiter

**File:** `client/src/services/rateLimiter.js`

```javascript
import { withRateLimit, subscribeToRateLimiter, checkRateLimit } from './services/rateLimiter';

// Wrap async function with rate limiting
const result = await withRateLimit(
    async () => generateContent(...),
    { isHeavy: true } // Heavy operations are queued, only 1 at a time
);

// Subscribe to state changes (for UI)
const unsubscribe = subscribeToRateLimiter((state) => {
    console.log('Queue:', state.queueLength);
    console.log('On cooldown:', state.isOnCooldown);
});
```

### 7. useClientSideAI Hook

**File:** `client/src/hooks/useClientSideAI.js`

```javascript
const clientAI = useClientSideAI({ userId: user._id });

// Extract document content
await clientAI.extractContent({
    fileId: 'xxx',
    fileName: 'doc.pdf',
    useVision: true
});

// Generate AI content
await clientAI.generate({
    mode: 'explain',
    assignmentTitle: 'Assignment 1',
    courseName: 'Math'
});

// State available:
// clientAI.extractedContent - Extracted content or null
// clientAI.isExtracting - Currently extracting
// clientAI.extractionProgress - { stage, progress, message }
// clientAI.generatedContent - { draft: '...', explain: '...', ... }
// clientAI.isGenerating - Currently generating
// clientAI.rateLimiterState - Rate limiter status
// clientAI.hasApiKey - Whether API key is configured
```

## Migration Guide

### Step 1: Install Dependencies

```bash
cd client
npm install pdfjs-dist
```

### Step 2: Add Stream Routes to Backend

The stream routes are already added. Just ensure `server.js` imports them:

```javascript
import streamRoutes from './routes/streamRoutes.js';
app.use('/api/stream', streamRoutes);
```

### Step 3: Update Workspace Component

Replace backend API calls with client-side processing:

```javascript
// OLD (backend processing)
const res = await api.post('/ai/generate', { assignmentId, mode });

// NEW (client-side processing)
const clientAI = useClientSideAI({ userId });

// First extract content (happens in browser)
await clientAI.extractContent({ fileId, fileName });

// Then generate (direct Groq API call from browser)
await clientAI.generate({ mode: 'explain' });
```

### Step 4: Add Progress UI

Add the `ProcessingStatus` component to show extraction/generation progress:

```jsx
<ProcessingStatus
    isExtracting={clientAI.isExtracting}
    extractionProgress={clientAI.extractionProgress}
    isGenerating={clientAI.isGenerating}
    generatingMode={clientAI.generatingMode}
    rateLimiterState={clientAI.rateLimiterState}
/>
```

### Step 5: Add Usage Dashboard (Optional)

```jsx
import ApiUsageDashboard from './components/dashboard/ApiUsageDashboard';

// Full dashboard
<ApiUsageDashboard />

// Compact (for navbar)
<ApiUsageDashboard compact />
```

## API Key Storage

The user's Groq API key is stored in `localStorage`:

```javascript
// Set key
localStorage.setItem('groq_api_key', 'gsk_xxx...');

// Check if key exists
import { hasApiKey } from './services/groqService';
if (!hasApiKey()) {
    // Prompt user to set API key
}
```

## Rate Limiting Behavior

| Operation Type | Concurrent Limit | Notes |
|----------------|------------------|-------|
| Heavy (generate, extract) | 1 at a time | Queued automatically |
| Light (chat, check) | 30/minute | Window-based limiting |

When rate limited by Groq (429 response), the limiter enters a cooldown period automatically.

## Token Usage Tracking

Usage is tracked automatically and stored in `localStorage`:

```javascript
// Usage data structure
{
    totalInputTokens: 150000,
    totalOutputTokens: 45000,
    totalCost: 0.15,
    models: {
        'llama-3.3-70b-versatile': {
            inputTokens: 100000,
            outputTokens: 30000,
            requests: 50,
            cost: 0.10
        }
    },
    daily: {
        '2024-01-15': { inputTokens: 5000, outputTokens: 2000, cost: 0.005 }
    }
}
```

## Pricing Reference (Groq, as of 2024)

| Model | Input (per 1M) | Output (per 1M) |
|-------|---------------|-----------------|
| llama-3.3-70b-versatile | $0.59 | $0.79 |
| llama-4-scout-17b | $0.11 | $0.34 |
| llama-3.1-8b-instant | $0.05 | $0.08 |

## Error Handling

All services throw descriptive errors that can be caught and displayed:

```javascript
try {
    await clientAI.generate({ mode: 'quiz' });
} catch (error) {
    if (error.message.includes('Rate limit')) {
        // Show rate limit message
    } else if (error.message.includes('API key')) {
        // Prompt for API key
    } else {
        // Generic error
    }
}
```

## Benefits of This Architecture

1. **No Backend OOM** - Files are never loaded into server memory
2. **Better Vision Processing** - Direct access to Groq's vision models
3. **Reduced Latency** - Direct API calls, no backend relay
4. **Transparent Costs** - Users see their exact token usage
5. **Offline Caching** - Extracted content can be reused
6. **Better Error Handling** - More control over retry logic
7. **Scalability** - Backend only handles auth and caching
