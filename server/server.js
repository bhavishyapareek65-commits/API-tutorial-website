import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Middleware
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// In-memory cache for models and voices
let cachedModels = null;
let modelsCacheTime = 0;
let cachedVoices = null;
let voicesCacheTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Helper to get sanitized API key
function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key || key.trim() === '' || key === 'your_elevenlabs_api_key_here') {
    return null;
  }
  return key.trim();
}

// Mask key for safe display
function maskApiKey(key) {
  if (!key) return null;
  if (key.length <= 8) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

// Common headers for ElevenLabs API requests
function getElevenLabsHeaders(apiKey) {
  return {
    'xi-api-key': apiKey,
    'Accept': 'application/json'
  };
}

// -------------------------------------------------------------
// Route: GET /api/health
// Status & Key configuration indicator
// -------------------------------------------------------------
app.get('/api/health', (req, res) => {
  const apiKey = getApiKey();
  res.json({
    status: 'ok',
    configured: !!apiKey,
    maskedKey: maskApiKey(apiKey),
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// Route: POST /api/settings/key
// Validate and update API key seamlessly
// -------------------------------------------------------------
app.post('/api/settings/key', async (req, res) => {
  const { apiKey } = req.body || {};
  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid API key string.'
    });
  }

  const cleanKey = apiKey.trim();

  // Test the key against ElevenLabs
  try {
    const testResponse = await fetch(`${ELEVENLABS_BASE_URL}/user`, {
      method: 'GET',
      headers: getElevenLabsHeaders(cleanKey)
    });

    if (!testResponse.ok) {
      const errorJson = await testResponse.json().catch(() => ({}));
      return res.status(401).json({
        success: false,
        message: errorJson.detail?.message || 'Invalid ElevenLabs API key. Please check your credentials.'
      });
    }

    const userData = await testResponse.json();
    const subscription = userData.subscription || {};

    // Update in-memory
    process.env.ELEVENLABS_API_KEY = cleanKey;

    // Reset caches to refresh voices & models for this new key
    cachedModels = null;
    cachedVoices = null;

    // Safely update .env file
    try {
      import('fs').then(fs => {
        const envPath = path.join(__dirname, '../.env');
        let content = '';
        if (fs.existsSync(envPath)) {
          content = fs.readFileSync(envPath, 'utf8');
        }
        if (/^ELEVENLABS_API_KEY=.*/m.test(content)) {
          content = content.replace(/^ELEVENLABS_API_KEY=.*/m, `ELEVENLABS_API_KEY=${cleanKey}`);
        } else {
          content += `\nELEVENLABS_API_KEY=${cleanKey}\nPORT=${PORT}\n`;
        }
        fs.writeFileSync(envPath, content, 'utf8');
      });
    } catch (fsErr) {
      console.warn('Could not persist key to .env file:', fsErr.message);
    }

    res.json({
      success: true,
      message: 'API key verified and updated successfully!',
      maskedKey: maskApiKey(cleanKey),
      user: {
        tier: subscription.tier || 'free',
        characterCount: subscription.character_count || 0,
        characterLimit: subscription.character_limit || 10000,
        charactersRemaining: Math.max(0, (subscription.character_limit || 10000) - (subscription.character_count || 0)),
        status: subscription.status || 'active',
        firstName: userData.first_name || ''
      }
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Could not connect to ElevenLabs to verify key: ' + err.message
    });
  }
});

// -------------------------------------------------------------
// Route: GET /api/user
// Retrieve subscription & quota status
// -------------------------------------------------------------
app.get('/api/user', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key not configured',
      message: 'Please set ELEVENLABS_API_KEY in your local .env file.'
    });
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/user`, {
      method: 'GET',
      headers: getElevenLabsHeaders(apiKey)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: 'Failed to fetch user profile',
        message: errorData.detail?.message || errorData.detail || 'ElevenLabs API error',
        status: response.status
      });
    }

    const userData = await response.json();
    const subscription = userData.subscription || {};

    res.json({
      tier: subscription.tier || 'free',
      characterCount: subscription.character_count || 0,
      characterLimit: subscription.character_limit || 10000,
      charactersRemaining: Math.max(0, (subscription.character_limit || 10000) - (subscription.character_count || 0)),
      voiceLimit: subscription.voice_limit || 0,
      status: subscription.status || 'active',
      firstName: userData.first_name || ''
    });
  } catch (err) {
    console.error('Error fetching user info:', err.message);
    res.status(500).json({
      error: 'Network error',
      message: 'Could not connect to ElevenLabs API: ' + err.message
    });
  }
});

// -------------------------------------------------------------
// Route: GET /api/models
// Retrieve supported text-to-speech models from ElevenLabs API
// -------------------------------------------------------------
app.get('/api/models', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key not configured',
      message: 'Please set ELEVENLABS_API_KEY in your local .env file.'
    });
  }

  // Check cache
  const now = Date.now();
  if (cachedModels && (now - modelsCacheTime) < CACHE_TTL_MS) {
    return res.json({ models: cachedModels, cached: true });
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/models`, {
      method: 'GET',
      headers: getElevenLabsHeaders(apiKey)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: 'Failed to fetch models',
        message: errorData.detail?.message || errorData.detail || 'ElevenLabs API returned an error',
        status: response.status
      });
    }

    const rawModels = await response.json();

    // Filter only models that support text-to-speech
    const ttsModels = rawModels
      .filter(m => m.can_do_text_to_speech === true)
      .map(m => ({
        model_id: m.model_id,
        name: m.name,
        description: m.description,
        can_use_style: !!m.can_use_style,
        can_use_speaker_boost: !!m.can_use_speaker_boost,
        serves_pro_voices: !!m.serves_pro_voices,
        languages: (m.languages || []).map(l => ({ language_id: l.language_id, name: l.name })),
        max_characters: m.max_characters_request_free_user || 2500,
        token_cost_factor: m.token_cost_factor || 1
      }));

    cachedModels = ttsModels;
    modelsCacheTime = now;

    res.json({ models: ttsModels, cached: false });
  } catch (err) {
    console.error('Error fetching models:', err.message);
    res.status(500).json({
      error: 'Network error',
      message: 'Failed to fetch models from ElevenLabs: ' + err.message
    });
  }
});

// -------------------------------------------------------------
// Route: GET /api/voices
// Retrieve available voices from ElevenLabs API
// -------------------------------------------------------------
app.get('/api/voices', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key not configured',
      message: 'Please set ELEVENLABS_API_KEY in your local .env file.'
    });
  }

  // Check cache
  const now = Date.now();
  if (cachedVoices && (now - voicesCacheTime) < CACHE_TTL_MS) {
    return res.json({ voices: cachedVoices, cached: true });
  }

  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      method: 'GET',
      headers: getElevenLabsHeaders(apiKey)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json({
        error: 'Failed to fetch voices',
        message: errorData.detail?.message || errorData.detail || 'ElevenLabs API returned an error',
        status: response.status
      });
    }

    const data = await response.json();
    const rawVoices = data.voices || [];

    const formattedVoices = rawVoices.map(v => {
      // Format labels object nicely
      const labels = v.labels || {};
      const accent = labels.accent || labels['accent '] || '';
      const gender = labels.gender || '';
      const age = labels.age || '';
      const descriptive = labels.descriptive || labels['use case'] || '';

      return {
        voice_id: v.voice_id,
        name: v.name,
        category: v.category || 'premade',
        description: v.description || descriptive || '',
        labels: {
          accent,
          gender,
          age,
          descriptive
        },
        preview_url: v.preview_url || null,
        available_for_tiers: v.available_for_tiers || [],
        settings: v.settings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true
        },
        high_quality_base_model_ids: v.high_quality_base_model_ids || []
      };
    });

    cachedVoices = formattedVoices;
    voicesCacheTime = now;

    res.json({ voices: formattedVoices, cached: false });
  } catch (err) {
    console.error('Error fetching voices:', err.message);
    res.status(500).json({
      error: 'Network error',
      message: 'Failed to fetch voices from ElevenLabs: ' + err.message
    });
  }
});

// -------------------------------------------------------------
// Route: POST /api/generate
// Generate text-to-speech audio via official ElevenLabs API
// -------------------------------------------------------------
app.post('/api/generate', async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key not configured',
      message: 'Please set ELEVENLABS_API_KEY in your local .env file.'
    });
  }

  const { text, voice_id, model_id, voice_settings } = req.body || {};

  // Validation
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Text is required and cannot be empty.'
    });
  }

  const trimmedText = text.trim();
  if (trimmedText.length > 5000) {
    return res.status(400).json({
      error: 'Text too long',
      message: `Text length (${trimmedText.length} characters) exceeds the maximum allowed limit of 5,000 characters per request.`
    });
  }

  if (!voice_id || typeof voice_id !== 'string') {
    return res.status(400).json({
      error: 'Invalid voice',
      message: 'A valid Voice ID must be selected.'
    });
  }

  if (!model_id || typeof model_id !== 'string') {
    return res.status(400).json({
      error: 'Invalid model',
      message: 'A valid Model ID must be selected.'
    });
  }

  // Sanitize and validate voice settings
  const payloadSettings = {};
  if (voice_settings && typeof voice_settings === 'object') {
    if (typeof voice_settings.stability === 'number') {
      payloadSettings.stability = Math.max(0.0, Math.min(1.0, voice_settings.stability));
    }
    if (typeof voice_settings.similarity_boost === 'number') {
      payloadSettings.similarity_boost = Math.max(0.0, Math.min(1.0, voice_settings.similarity_boost));
    }
    if (typeof voice_settings.style === 'number') {
      payloadSettings.style = Math.max(0.0, Math.min(1.0, voice_settings.style));
    }
    if (typeof voice_settings.use_speaker_boost === 'boolean') {
      payloadSettings.use_speaker_boost = voice_settings.use_speaker_boost;
    }
    if (typeof voice_settings.speed === 'number') {
      payloadSettings.speed = Math.max(0.7, Math.min(1.2, voice_settings.speed));
    }
  }

  // Construct request payload
  const requestPayload = {
    text: trimmedText,
    model_id: model_id
  };

  if (Object.keys(payloadSettings).length > 0) {
    requestPayload.voice_settings = payloadSettings;
  }

  const endpointUrl = `${ELEVENLABS_BASE_URL}/text-to-speech/${encodeURIComponent(voice_id)}?output_format=mp3_44100_128`;

  // Timeout controller (45s timeout for TTS generation)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const elevenLabsResponse = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg'
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle ElevenLabs API errors
    if (!elevenLabsResponse.ok) {
      let errorMessage = 'Failed to generate audio from ElevenLabs';
      let errorCode = 'generation_failed';

      try {
        const errorJson = await elevenLabsResponse.json();
        const detail = errorJson.detail || {};
        const rawMessage = detail.message || detail.error || (typeof detail === 'string' ? detail : JSON.stringify(detail));
        errorCode = detail.code || detail.type || 'api_error';

        // Provide friendly guidance for common ElevenLabs errors
        if (elevenLabsResponse.status === 402 || errorCode === 'paid_plan_required' || (rawMessage && rawMessage.includes('Free users cannot use library voices'))) {
          errorMessage = 'Free tier voice restriction: This voice requires a paid ElevenLabs plan. Please select one of the premade voices (such as Roger, Sarah, George, River, Callum, or Laura) which work on free tier.';
        } else if (errorCode === 'quota_exceeded' || (rawMessage && rawMessage.includes('quota'))) {
          errorMessage = `${rawMessage} Tip: In your ElevenLabs Dashboard, go to Profile -> API Keys and edit your key to increase or remove the credit limit.`;
        } else if (elevenLabsResponse.status === 401) {
          errorMessage = rawMessage || 'Authentication failed: The configured ElevenLabs API key is invalid or unauthorized. Please verify your API key.';
        } else if (elevenLabsResponse.status === 429) {
          errorMessage = 'Rate limit exceeded: Too many requests sent to ElevenLabs in a short time. Please wait a few seconds and try again.';
        } else if (rawMessage) {
          errorMessage = rawMessage;
        }
      } catch (parseErr) {
        errorMessage = `ElevenLabs returned HTTP ${elevenLabsResponse.status}: ${elevenLabsResponse.statusText}`;
      }

      return res.status(elevenLabsResponse.status).json({
        error: 'ElevenLabs generation error',
        code: errorCode,
        message: errorMessage,
        status: elevenLabsResponse.status
      });
    }

    // Binary audio response
    const audioBuffer = await elevenLabsResponse.arrayBuffer();

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength,
      'Content-Disposition': 'inline; filename="elevenlabs_narration.mp3"',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    return res.send(Buffer.from(audioBuffer));
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout',
        message: 'Speech generation timed out after 45 seconds. Try shorter text or a low-latency model (e.g. Eleven Flash or Turbo).'
      });
    }

    console.error('Generation error:', err.message);
    return res.status(500).json({
      error: 'Server generation error',
      message: 'Failed to communicate with ElevenLabs API: ' + err.message
    });
  }
});

// Fallback route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  ElevenLabs AI Text-to-Speech Studio Server Started  `);
  console.log(`  Local URL: http://localhost:${PORT}                 `);
  console.log(`  API Key:   ${getApiKey() ? 'Configured (' + maskApiKey(getApiKey()) + ')' : 'MISSING'}`);
  console.log(`=======================================================`);
});
