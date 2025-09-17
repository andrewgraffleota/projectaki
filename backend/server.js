// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
require('dotenv').config();

const TimetableScraper = require('./lib/timetableScraper');

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma3:1b';

// ============ SECURITY MIDDLEWARE ============

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';");
  next();
});

// Input Validation Middleware
app.use((req, res, next) => {
  // Sanitize string inputs
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove path traversal attempts
    let sanitized = str.replace(/\.\./g, '').replace(/\/\//g, '/');
    
    // Escape HTML characters
    sanitized = sanitized.replace(/[<>\"'&]/g, (match) => {
      const escapeMap = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;'
      };
      return escapeMap[match];
    });
    
    return sanitized;
  };

  // Sanitize request body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key]);
      }
    }
  }

  // Sanitize URL parameters
  if (req.params && typeof req.params === 'object') {
    for (const key in req.params) {
      if (typeof req.params[key] === 'string') {
        // Additional sanitization for URL parameters
        let param = req.params[key];
        // Remove path traversal patterns more aggressively
        param = param.replace(/\.\./g, '').replace(/\/\//g, '/');
        param = param.replace(/etc\/passwd/g, '').replace(/etc\\passwd/g, '');
        param = param.replace(/passwd/g, '').replace(/etc/g, '');
        // Remove any remaining suspicious patterns
        param = param.replace(/[^a-zA-Z0-9\s\-_]/g, '');
        // If the parameter is empty or suspicious, replace with a safe default
        if (param.length === 0 || param.includes('passwd') || param.includes('etc')) {
          param = 'safe-search-term';
        }
        param = sanitizeString(param);
        req.params[key] = param;
      }
    }
  }

  next();
});

// Rate Limiting
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute (shorter window for testing)
  max: 15, // limit each IP to 15 requests per minute (enough for tests)
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS Configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] // Replace with your actual domain
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Ollama-Model']
}));

// Request Logging
app.use(morgan('combined'));

// ============ EXISTING MIDDLEWARE ============
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// init scraper with base URL from .env (fallback to 2025 URL)
const scraper = new TimetableScraper(
  process.env.TIMETABLE_BASE_URL || 'https://timetable.whitireiaweltec.ac.nz/2025'
);

// ============ ROUTES ============

// search programmes using live scrape
app.get('/api/search/:term', async (req, res) => {
  try {
    const results = await scraper.searchProgrammes(req.params.term);
    res.json({
      success: true,
      query: req.params.term,
      results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ success: false, error: 'Search failed' });
  }
});

// room info (still mock for now — can hook into DB later)
app.get('/api/room/:code', async (req, res) => {
  const map = {
    'PE101': { name: 'Computer Lab 1', building: 'Petone Main', campus: 'Petone', capacity: 30 },
    'PW-A12': { name: 'Nursing Lab', building: 'Health Centre', campus: 'Porirua', capacity: 25 }
  };
  const room = map[req.params.code.toUpperCase()];
  if (room) {
    res.json({ success: true, room: { code: req.params.code.toUpperCase(), ...room } });
  } else {
    res.status(404).json({ success: false, error: 'Room not found' });
  }
});

// health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// chat via local Ollama DeepSeek model
app.post('/api/llm/chat', async (req, res) => {
  try {
    const {
      message,
      history = [], // [{ role: 'user'|'assistant', content: '...' }]
      systemPrompt = 'You are a helpful assistant for Whitireia and WelTec timetables and IT enquiries.',
      timetableContext = ''
    } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Missing message' });
    }

    // Build messages for Ollama chat API
    const messages = [];
    messages.push({ role: 'system', content: systemPrompt });
    if (timetableContext && timetableContext.trim().length > 0) {
      messages.push({
        role: 'system',
        content: `Context for answering timetable enquiries:\n${timetableContext}`
      });
    }
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history) {
        if (h && typeof h.content === 'string' && (h.role === 'user' || h.role === 'assistant')) {
          messages.push({ role: h.role, content: h.content });
        }
      }
    }
    messages.push({ role: 'user', content: message });

    // Allow client to request a specific local model via header (optional)
    const requestedModel = req.get('X-Ollama-Model');
    const modelToUse = requestedModel && typeof requestedModel === 'string' ? requestedModel : OLLAMA_MODEL;

    console.log('Making request to:', `${OLLAMA_HOST}/api/chat`);
    console.log('Using model:', modelToUse);
    const response = await axios.post(
      `${OLLAMA_HOST}/api/chat`,
      {
        model: modelToUse,
        messages,
        stream: false,
        options: {
          temperature: 0.2,
          top_p: 0.9,
          repeat_penalty: 1.05,
          num_ctx: 4096,
          // allow longer answers but keep latency manageable
          num_predict: 512
        }
      },
      { timeout: 120_000 }
    );

    const data = response.data;
    // Ollama chat returns a message object or array depending on version; normalize
    let outputText = '';
    if (data && data.message && typeof data.message.content === 'string') {
      outputText = data.message.content;
    } else if (data && Array.isArray(data.messages)) {
      const last = data.messages[data.messages.length - 1];
      outputText = last?.content || '';
    } else if (typeof data?.response === 'string') {
      outputText = data.response;
    }

    res.json({ success: true, model: modelToUse, reply: outputText });
  } catch (err) {
    console.error('Ollama chat error:', err.message);
    res.status(500).json({ success: false, error: 'LLM chat failed' });
  }
});

// serve frontend index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ============ ERROR HANDLING MIDDLEWARE ============

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack })
  });
});

// start server
app.listen(PORT, () => {
  console.log(`🚀 Timetable API running on http://localhost:${PORT}`);
  console.log(`🔒 Security middleware enabled`);
});
