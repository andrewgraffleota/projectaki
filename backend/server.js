// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const TimetableScraper = require('./lib/timetableScraper');

const app = express();
const PORT = process.env.PORT || 3001;
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'deepseek-r1:8b';

// middleware
app.use(cors());
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

// start server
app.listen(PORT, () => {
  console.log(`🚀 Timetable API running on http://localhost:${PORT}`);
});
