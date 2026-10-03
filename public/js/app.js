/**
 * ElevenLabs AI Text-to-Speech Studio — Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  // -------------------------------------------------------------
  // Application State
  // -------------------------------------------------------------
  const state = {
    apiKeyConfigured: false,
    userProfile: null,
    models: [],
    voices: [],
    selectedModel: null,
    selectedVoice: null,
    isGenerating: false,
    isPlaying: false,
    currentAudioBlob: null,
    currentAudioUrl: null,
    generationStartTime: null,
    timerInterval: null,
    playbackSpeed: 1.0,
    speedOptions: [1.0, 1.25, 1.5, 2.0, 0.8],
    history: [], // [{ id, text, voiceName, modelId, blob, url, timestamp, duration }]
    audioContext: null,
    audioSource: null,
    analyser: null,
    visualizerAnimationId: null
  };

  // Sample prompt texts
  const samplePrompts = {
    story: `The ancient library was buried beneath the mountain of echoes, untouched for three hundred years. When Lyra turned the brass key, the iron doors groaned open, revealing towering shelves carved from black obsidian, each book bound in silver foil that shimmered under the torchlight.`,
    tech: `Neural speech synthesis represents a profound shift in human-computer interaction. By modeling the acoustic characteristics of human vocal cords, artificial intelligence can now produce nuanced intonation, breath cadence, and emotional resonance virtually indistinguishable from organic speech.`,
    commercial: `Introducing Aura: the intelligent audio workspace crafted for creators who demand perfection. With studio-grade clarity, real-time voice modeling, and effortless cloud integration, your stories don't just speak—they captivate. Experience the future of sound today.`,
    motivational: `Every great achievement was once considered impossible by those who feared the unknown. Do not wait for the conditions to be perfect; step boldly into the uncertainty, cultivate resilience in the face of doubt, and let your purpose command your actions.`,
    podcast: `Welcome back to Future Waves, your weekly destination for breakthroughs in synthetic intelligence and digital art. In today's episode, we sit down with leading researchers exploring how expressive speech transforms storytelling in interactive worlds.`
  };

  // -------------------------------------------------------------
  // DOM Elements
  // -------------------------------------------------------------
  // Header & Status
  const apiStatusPill = document.getElementById('apiStatusPill');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const quotaText = document.getElementById('quotaText');
  const globalAlert = document.getElementById('globalAlert');
  const alertIcon = document.getElementById('alertIcon');
  const alertMessage = document.getElementById('alertMessage');
  const alertCloseBtn = document.getElementById('alertCloseBtn');

  // Text Editor
  const textInput = document.getElementById('textInput');
  const samplePromptSelect = document.getElementById('samplePromptSelect');
  const pasteBtn = document.getElementById('pasteBtn');
  const copyBtn = document.getElementById('copyBtn');
  const clearBtn = document.getElementById('clearBtn');
  const charCount = document.getElementById('charCount');
  const charLimit = document.getElementById('charLimit');
  const wordCount = document.getElementById('wordCount');
  const readingTime = document.getElementById('readingTime');
  const charProgress = document.getElementById('charProgress');

  // Model & Voice Selectors
  const modelSelect = document.getElementById('modelSelect');
  const modelDesc = document.getElementById('modelDesc');
  const modelTags = document.getElementById('modelTags');
  const voiceSelect = document.getElementById('voiceSelect');
  const voiceDesc = document.getElementById('voiceDesc');
  const voiceTags = document.getElementById('voiceTags');
  const voicePreviewBtn = document.getElementById('voicePreviewBtn');

  // Advanced Voice Settings
  const accordionToggleBtn = document.getElementById('accordionToggleBtn');
  const voiceSettingsPanel = document.getElementById('voiceSettingsPanel');
  const stabilitySlider = document.getElementById('stabilitySlider');
  const stabilityValue = document.getElementById('stabilityValue');
  const similaritySlider = document.getElementById('similaritySlider');
  const similarityValue = document.getElementById('similarityValue');
  const styleSlider = document.getElementById('styleSlider');
  const styleValue = document.getElementById('styleValue');
  const styleControl = document.getElementById('styleControl');
  const speedSlider = document.getElementById('speedSlider');
  const speedValue = document.getElementById('speedValue');
  const speakerBoostToggle = document.getElementById('speakerBoostToggle');
  const resetSettingsBtn = document.getElementById('resetSettingsBtn');

  // Generate Action
  const generateBtn = document.getElementById('generateBtn');
  const generateBtnText = document.getElementById('generateBtnText');
  const generateLoadingState = document.getElementById('generateLoadingState');
  const elapsedTimer = document.getElementById('elapsedTimer');

  // Audio Deck Player
  const mainAudioElement = document.getElementById('mainAudioElement');
  const previewAudioElement = document.getElementById('previewAudioElement');
  const playerDeck = document.getElementById('playerDeck');
  const deckStatusBadge = document.getElementById('deckStatusBadge');
  const trackTitle = document.getElementById('trackTitle');
  const trackSubtitle = document.getElementById('trackSubtitle');
  const downloadBtn = document.getElementById('downloadBtn');
  const waveformCanvas = document.getElementById('waveformCanvas');
  const waveformPlaceholder = document.getElementById('waveformPlaceholder');
  const seekSlider = document.getElementById('seekSlider');
  const seekProgressFill = document.getElementById('seekProgressFill');
  const currentTime = document.getElementById('currentTime');
  const totalDuration = document.getElementById('totalDuration');
  const playPauseBtn = document.getElementById('playPauseBtn');
  const playIcon = document.getElementById('playIcon');
  const pauseIcon = document.getElementById('pauseIcon');
  const stopBtn = document.getElementById('stopBtn');
  const replayBtn = document.getElementById('replayBtn');
  const speedPillBtn = document.getElementById('speedPillBtn');
  const muteBtn = document.getElementById('muteBtn');
  const volumeHighIcon = document.getElementById('volumeHighIcon');
  const volumeMutedIcon = document.getElementById('volumeMutedIcon');
  const volumeSlider = document.getElementById('volumeSlider');

  // History Card
  const historyList = document.getElementById('historyList');
  const historyEmpty = document.getElementById('historyEmpty');
  const historyCountBadge = document.getElementById('historyCountBadge');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

  // Modals & Dialogs
  const settingsBtn = document.getElementById('settingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
  const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
  const saveKeyBtn = document.getElementById('saveKeyBtn');
  const modalKeyVal = document.getElementById('modalKeyVal');
  const modalTierVal = document.getElementById('modalTierVal');
  const modalQuotaVal = document.getElementById('modalQuotaVal');
  const newApiKeyInput = document.getElementById('newApiKeyInput');

  const shortcutsBtn = document.getElementById('shortcutsBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeShortcutsModalBtn = document.getElementById('closeShortcutsModalBtn');

  const toastContainer = document.getElementById('toastContainer');

  // -------------------------------------------------------------
  // Notification & Alert Helpers
  // -------------------------------------------------------------
  function showToast(message, type = 'info', durationMs = 4000) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }

  function showAlert(message, type = 'warning') {
    globalAlert.className = `alert-banner ${type}`;
    alertMessage.textContent = message;
    globalAlert.style.display = 'flex';
  }

  function hideAlert() {
    globalAlert.style.display = 'none';
  }

  alertCloseBtn.addEventListener('click', hideAlert);

  // -------------------------------------------------------------
  // Format Time (seconds -> mm:ss)
  // -------------------------------------------------------------
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // -------------------------------------------------------------
  // Text Analysis & Metrics Update
  // -------------------------------------------------------------
  function updateTextStats() {
    const text = textInput.value;
    const len = text.length;
    const max = 5000;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    // Average speech rate is approximately 140 words per minute (~2.3 words/sec)
    const estimatedSeconds = Math.round(words / 2.3);

    charCount.textContent = len.toLocaleString();
    wordCount.textContent = `${words} ${words === 1 ? 'word' : 'words'}`;
    readingTime.textContent = `~${estimatedSeconds}s speech`;

    const percentage = Math.min(100, (len / max) * 100);
    charProgress.style.width = `${percentage}%`;

    charProgress.classList.remove('warn', 'danger');
    if (percentage >= 95) {
      charProgress.classList.add('danger');
    } else if (percentage >= 80) {
      charProgress.classList.add('warn');
    }

    if (len > max) {
      showAlert(`Your text exceeds the maximum limit of ${max.toLocaleString()} characters.`, 'error');
    }
  }

  textInput.addEventListener('input', updateTextStats);

  // Sample prompt selection
  samplePromptSelect.addEventListener('change', (e) => {
    const key = e.target.value;
    if (samplePrompts[key]) {
      textInput.value = samplePrompts[key];
      updateTextStats();
      textInput.focus();
      showToast('Sample text inserted', 'info', 2000);
    }
    samplePromptSelect.value = '';
  });

  // Paste from clipboard
  pasteBtn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text) {
          textInput.value = (textInput.value ? textInput.value + '\n\n' : '') + text;
          updateTextStats();
          showToast('Text pasted from clipboard', 'success', 2000);
        } else {
          showToast('Clipboard is empty', 'info', 2000);
        }
      } else {
        textInput.focus();
        showToast('Please use Ctrl+V to paste', 'info', 2500);
      }
    } catch (err) {
      textInput.focus();
      showToast('Clipboard access was blocked. Use Ctrl+V instead.', 'info', 2500);
    }
  });

  // Copy to clipboard
  copyBtn.addEventListener('click', async () => {
    if (!textInput.value.trim()) {
      showToast('No text to copy', 'info', 2000);
      return;
    }
    try {
      await navigator.clipboard.writeText(textInput.value);
      showToast('Text copied to clipboard', 'success', 2000);
    } catch (err) {
      showToast('Failed to copy text', 'error', 2000);
    }
  });

  // Clear text
  clearBtn.addEventListener('click', () => {
    if (textInput.value.trim() && textInput.value.length > 50) {
      if (!confirm('Are you sure you want to clear your text?')) return;
    }
    textInput.value = '';
    updateTextStats();
    hideAlert();
    textInput.focus();
  });

  // -------------------------------------------------------------
  // Advanced Voice Settings Controls & Accordion
  // -------------------------------------------------------------
  accordionToggleBtn.addEventListener('click', () => {
    const isExpanded = accordionToggleBtn.getAttribute('aria-expanded') === 'true';
    accordionToggleBtn.setAttribute('aria-expanded', !isExpanded);
    voiceSettingsPanel.hidden = isExpanded;
  });

  // Slider change listeners
  stabilitySlider.addEventListener('input', () => {
    stabilityValue.textContent = `${stabilitySlider.value}%`;
  });

  similaritySlider.addEventListener('input', () => {
    similarityValue.textContent = `${similaritySlider.value}%`;
  });

  styleSlider.addEventListener('input', () => {
    styleValue.textContent = `${styleSlider.value}%`;
  });

  speedSlider.addEventListener('input', () => {
    const val = (speedSlider.value / 100).toFixed(2);
    speedValue.textContent = `${val}x`;
  });

  resetSettingsBtn.addEventListener('click', () => {
    stabilitySlider.value = 50;
    stabilityValue.textContent = '50%';
    similaritySlider.value = 75;
    similarityValue.textContent = '75%';
    styleSlider.value = 0;
    styleValue.textContent = '0%';
    speedSlider.value = 100;
    speedValue.textContent = '1.00x';
    speakerBoostToggle.checked = true;
    showToast('Voice settings reset to defaults', 'info', 2000);
  });

  // -------------------------------------------------------------
  // Fetch Initial Data: Health, User, Models, Voices
  // -------------------------------------------------------------
  async function checkHealthAndUser() {
    try {
      const healthRes = await fetch('/api/health');
      const healthData = await healthRes.json();

      state.apiKeyConfigured = healthData.configured;

      if (healthData.configured) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = `API Connected (${healthData.maskedKey})`;
        modalKeyVal.textContent = healthData.maskedKey;

        // Fetch User / Quota info
        fetchUserData();
      } else {
        statusDot.className = 'status-dot error';
        statusText.textContent = 'API Key Missing';
        modalKeyVal.textContent = 'Not configured';
        showAlert('ElevenLabs API key is not configured in .env. Click Settings to set up your key.', 'warning');
      }
    } catch (err) {
      statusDot.className = 'status-dot error';
      statusText.textContent = 'Server Offline';
      showAlert('Could not connect to the backend server. Make sure "npm start" is running.', 'error');
    }
  }

  async function fetchUserData() {
    try {
      const res = await fetch('/api/user');
      if (!res.ok) return;

      const user = await res.json();
      state.userProfile = user;

      // Update Quota display
      const remaining = user.charactersRemaining || 0;
      const limit = user.characterLimit || 10000;
      quotaText.textContent = `${remaining.toLocaleString()} / ${limit.toLocaleString()} chars`;
      quotaText.style.display = 'inline-block';

      modalTierVal.textContent = user.tier.toUpperCase();
      modalQuotaVal.textContent = `${remaining.toLocaleString()} / ${limit.toLocaleString()} chars`;
    } catch (err) {
      console.warn('Could not fetch user quota:', err.message);
    }
  }

  // Fetch Models
  async function loadModels() {
    try {
      const res = await fetch('/api/models');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load models');
      }

      const data = await res.json();
      state.models = data.models || [];

      renderModelDropdown();
    } catch (err) {
      modelSelect.innerHTML = `<option disabled selected>Error loading models</option>`;
      modelDesc.textContent = `Could not retrieve models: ${err.message}`;
      showAlert(`ElevenLabs Models error: ${err.message}`, 'error');
    }
  }

  function renderModelDropdown() {
    if (!state.models.length) {
      modelSelect.innerHTML = `<option disabled selected>No models available</option>`;
      return;
    }

    modelSelect.innerHTML = '';
    state.models.forEach((model) => {
      const opt = document.createElement('option');
      opt.value = model.model_id;
      // Prettify name
      opt.textContent = `${model.name} (${model.model_id})`;
      modelSelect.appendChild(opt);
    });

    // Default selection preference: eleven_turbo_v2_5 or eleven_multilingual_v2 or first
    const preferredId = state.models.find(m => m.model_id === 'eleven_turbo_v2_5')
      ? 'eleven_turbo_v2_5'
      : (state.models.find(m => m.model_id === 'eleven_multilingual_v2') ? 'eleven_multilingual_v2' : state.models[0].model_id);

    modelSelect.value = preferredId;
    onModelChange(preferredId);
  }

  function onModelChange(modelId) {
    const model = state.models.find(m => m.model_id === modelId);
    state.selectedModel = model;
    if (!model) return;

    modelDesc.textContent = model.description || 'ElevenLabs text-to-speech model.';
    
    // Model tags
    modelTags.innerHTML = '';
    const langCount = model.languages ? model.languages.length : 0;
    if (langCount > 0) {
      const tag = document.createElement('span');
      tag.className = 'meta-tag';
      tag.textContent = `${langCount} Languages`;
      modelTags.appendChild(tag);
    }

    if (model.can_use_style) {
      const tag = document.createElement('span');
      tag.className = 'meta-tag';
      tag.textContent = 'Style Tuning';
      modelTags.appendChild(tag);
      styleControl.style.opacity = '1';
      styleSlider.disabled = false;
    } else {
      styleControl.style.opacity = '0.5';
      styleSlider.disabled = true;
    }

    if (model.token_cost_factor) {
      const tag = document.createElement('span');
      tag.className = 'meta-tag';
      tag.textContent = `Cost Factor: ${model.token_cost_factor}x`;
      modelTags.appendChild(tag);
    }
  }

  modelSelect.addEventListener('change', (e) => {
    onModelChange(e.target.value);
  });

  // Fetch Voices
  async function loadVoices() {
    try {
      const res = await fetch('/api/voices');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to load voices');
      }

      const data = await res.json();
      state.voices = data.voices || [];

      renderVoiceDropdown();
    } catch (err) {
      voiceSelect.innerHTML = `<option disabled selected>Error loading voices</option>`;
      voiceDesc.textContent = `Could not retrieve voices: ${err.message}`;
      showAlert(`ElevenLabs Voices error: ${err.message}`, 'error');
    }
  }

  function renderVoiceDropdown() {
    if (!state.voices.length) {
      voiceSelect.innerHTML = `<option disabled selected>No voices available</option>`;
      return;
    }

    voiceSelect.innerHTML = '';

    // Group premade and custom voices
    const premadeGroup = document.createElement('optgroup');
    premadeGroup.label = 'Premade Voices (Free Tier Supported)';

    const otherGroup = document.createElement('optgroup');
    otherGroup.label = 'Library & Cloned Voices';

    state.voices.forEach(voice => {
      const opt = document.createElement('option');
      opt.value = voice.voice_id;

      const labels = [];
      if (voice.labels.gender) labels.push(voice.labels.gender);
      if (voice.labels.accent) labels.push(voice.labels.accent);
      if (voice.labels.descriptive) labels.push(voice.labels.descriptive);

      const labelStr = labels.length ? ` [${labels.join(', ')}]` : '';
      opt.textContent = `${voice.name}${labelStr}`;

      if (voice.category === 'premade') {
        premadeGroup.appendChild(opt);
      } else {
        otherGroup.appendChild(opt);
      }
    });

    if (premadeGroup.children.length) voiceSelect.appendChild(premadeGroup);
    if (otherGroup.children.length) voiceSelect.appendChild(otherGroup);

    // Prefer a well-known premade voice by default (e.g. Roger or George or Sarah)
    const preferredVoice = state.voices.find(v => v.name.toLowerCase().includes('roger')) ||
                           state.voices.find(v => v.name.toLowerCase().includes('george')) ||
                           state.voices.find(v => v.name.toLowerCase().includes('sarah')) ||
                           state.voices[0];

    voiceSelect.value = preferredVoice.voice_id;
    onVoiceChange(preferredVoice.voice_id);
  }

  function onVoiceChange(voiceId) {
    const voice = state.voices.find(v => v.voice_id === voiceId);
    state.selectedVoice = voice;
    if (!voice) return;

    voiceDesc.textContent = voice.description || 'Expressive ElevenLabs voice profile.';

    // Tags
    voiceTags.innerHTML = '';
    const addTag = (text) => {
      if (!text) return;
      const t = document.createElement('span');
      t.className = 'meta-tag';
      t.textContent = text;
      voiceTags.appendChild(t);
    };

    addTag(voice.category.toUpperCase());
    if (voice.labels.gender) addTag(voice.labels.gender);
    if (voice.labels.accent) addTag(voice.labels.accent);
    if (voice.labels.age) addTag(voice.labels.age);
    if (voice.labels.descriptive) addTag(voice.labels.descriptive);

    // Preview button visibility
    if (voice.preview_url) {
      voicePreviewBtn.style.display = 'inline-flex';
      voicePreviewBtn.classList.remove('playing');
      voicePreviewBtn.querySelector('span').textContent = 'Sample';
    } else {
      voicePreviewBtn.style.display = 'none';
    }

    // Stop preview if another voice preview was playing
    if (!previewAudioElement.paused) {
      previewAudioElement.pause();
    }
  }

  voiceSelect.addEventListener('change', (e) => {
    onVoiceChange(e.target.value);
  });

  // Voice Preview Button Click
  voicePreviewBtn.addEventListener('click', () => {
    if (!state.selectedVoice || !state.selectedVoice.preview_url) return;

    if (!previewAudioElement.paused && previewAudioElement.src === state.selectedVoice.preview_url) {
      previewAudioElement.pause();
      voicePreviewBtn.classList.remove('playing');
      voicePreviewBtn.querySelector('span').textContent = 'Sample';
      return;
    }

    previewAudioElement.src = state.selectedVoice.preview_url;
    previewAudioElement.play()
      .then(() => {
        voicePreviewBtn.classList.add('playing');
        voicePreviewBtn.querySelector('span').textContent = 'Playing...';
      })
      .catch(err => {
        showToast('Could not play voice preview: ' + err.message, 'error', 3000);
      });
  });

  previewAudioElement.addEventListener('ended', () => {
    voicePreviewBtn.classList.remove('playing');
    voicePreviewBtn.querySelector('span').textContent = 'Sample';
  });

  previewAudioElement.addEventListener('pause', () => {
    voicePreviewBtn.classList.remove('playing');
    voicePreviewBtn.querySelector('span').textContent = 'Sample';
  });

  // -------------------------------------------------------------
  // Speech Generation Execution
  // -------------------------------------------------------------
  async function generateSpeech() {
    if (state.isGenerating) return;

    hideAlert();
    const text = textInput.value.trim();

    // Validations
    if (!text) {
      showAlert('Please enter or paste some text before clicking Generate.', 'warning');
      textInput.focus();
      return;
    }

    if (text.length > 5000) {
      showAlert('Text exceeds 5,000 characters limit. Please shorten your script.', 'error');
      return;
    }

    if (!state.selectedModel) {
      showAlert('Please select an ElevenLabs narration model.', 'warning');
      return;
    }

    if (!state.selectedVoice) {
      showAlert('Please select an ElevenLabs voice.', 'warning');
      return;
    }

    // Prepare Payload
    const voiceSettings = {
      stability: parseFloat(stabilitySlider.value) / 100,
      similarity_boost: parseFloat(similaritySlider.value) / 100,
      style: parseFloat(styleSlider.value) / 100,
      use_speaker_boost: speakerBoostToggle.checked,
      speed: parseFloat(speedSlider.value) / 100
    };

    const payload = {
      text: text,
      voice_id: state.selectedVoice.voice_id,
      model_id: state.selectedModel.model_id,
      voice_settings: voiceSettings
    };

    // UI State: Generating
    state.isGenerating = true;
    generateBtn.disabled = true;
    generateBtnText.style.display = 'none';
    generateLoadingState.style.display = 'flex';
    deckStatusBadge.textContent = 'Synthesizing...';
    deckStatusBadge.className = 'deck-indicator playing';

    // Start elapsed timer
    state.generationStartTime = Date.now();
    elapsedTimer.textContent = '0.0s';
    state.timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - state.generationStartTime) / 1000).toFixed(1);
      elapsedTimer.textContent = `${elapsed}s`;
    }, 100);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Handle Errors
      if (!response.ok) {
        let errJson = {};
        try {
          errJson = await response.json();
        } catch (_) {}

        const msg = errJson.message || `ElevenLabs returned HTTP ${response.status}`;
        throw new Error(msg);
      }

      // Success: Read Binary Audio Stream as Blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Clean up previous blob URL if needed
      state.currentAudioBlob = audioBlob;
      state.currentAudioUrl = audioUrl;

      // Update Player Deck UI
      const elapsedTotal = ((Date.now() - state.generationStartTime) / 1000).toFixed(1);
      trackTitle.textContent = `${state.selectedVoice.name}`;
      trackSubtitle.textContent = `Model: ${state.selectedModel.name} • ${text.length} chars • generated in ${elapsedTotal}s`;
      deckStatusBadge.textContent = 'Audio Ready';
      deckStatusBadge.className = 'deck-indicator playing';

      // Load into audio element
      mainAudioElement.src = audioUrl;
      mainAudioElement.playbackRate = state.playbackSpeed;

      // Enable Player Controls
      playPauseBtn.disabled = false;
      stopBtn.disabled = false;
      replayBtn.disabled = false;
      seekSlider.disabled = false;
      downloadBtn.disabled = false;

      // Setup Web Audio Analyser if not already initialized
      setupAudioVisualizer();

      // Automatically play the generated audio!
      mainAudioElement.play()
        .then(() => {
          setPlayingState(true);
        })
        .catch(playErr => {
          console.warn('Auto-play was blocked by browser policy:', playErr.message);
          setPlayingState(false);
          showToast('Speech generated! Click Play to listen.', 'success', 3000);
        });

      // Add to Session History
      addToHistory({
        id: Date.now().toString(),
        text: text,
        voiceName: state.selectedVoice.name,
        modelName: state.selectedModel.name,
        blob: audioBlob,
        url: audioUrl,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        charCount: text.length
      });

      showToast('Narration successfully generated!', 'success', 3000);

      // Refresh remaining quota
      fetchUserData();

    } catch (err) {
      console.error('Generation failure:', err.message);
      showAlert(err.message, 'error');
      showToast('Generation failed: ' + err.message, 'error', 5000);
      deckStatusBadge.textContent = 'Generation Failed';
      deckStatusBadge.className = 'deck-indicator';
    } finally {
      // Teardown Generating State
      clearInterval(state.timerInterval);
      state.isGenerating = false;
      generateBtn.disabled = false;
      generateBtnText.style.display = 'inline';
      generateLoadingState.style.display = 'none';
    }
  }

  generateBtn.addEventListener('click', generateSpeech);

  // -------------------------------------------------------------
  // Audio Player Deck Controls & Events
  // -------------------------------------------------------------
  function setPlayingState(isPlaying) {
    state.isPlaying = isPlaying;
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'inline';
      deckStatusBadge.textContent = 'Playing';
      deckStatusBadge.className = 'deck-indicator playing';
      waveformPlaceholder.style.display = 'none';
      waveformCanvas.style.display = 'block';
    } else {
      playIcon.style.display = 'inline';
      pauseIcon.style.display = 'none';
      deckStatusBadge.textContent = 'Paused';
      deckStatusBadge.className = 'deck-indicator';
    }
  }

  // Play / Pause Toggle
  playPauseBtn.addEventListener('click', () => {
    if (!mainAudioElement.src) return;

    if (mainAudioElement.paused) {
      // Resume audio context if suspended
      if (state.audioContext && state.audioContext.state === 'suspended') {
        state.audioContext.resume();
      }
      mainAudioElement.play().then(() => setPlayingState(true));
    } else {
      mainAudioElement.pause();
      setPlayingState(false);
    }
  });

  // Stop Playback
  stopBtn.addEventListener('click', () => {
    if (!mainAudioElement.src) return;
    mainAudioElement.pause();
    mainAudioElement.currentTime = 0;
    setPlayingState(false);
    deckStatusBadge.textContent = 'Stopped';
    seekSlider.value = 0;
    seekProgressFill.style.width = '0%';
    currentTime.textContent = '00:00';
  });

  // Replay from start
  replayBtn.addEventListener('click', () => {
    if (!mainAudioElement.src) return;
    mainAudioElement.currentTime = 0;
    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }
    mainAudioElement.play().then(() => setPlayingState(true));
  });

  // Track Time & Duration Updates
  mainAudioElement.addEventListener('loadedmetadata', () => {
    totalDuration.textContent = formatTime(mainAudioElement.duration);
    seekSlider.max = mainAudioElement.duration || 100;
  });

  mainAudioElement.addEventListener('timeupdate', () => {
    if (!mainAudioElement.duration) return;
    currentTime.textContent = formatTime(mainAudioElement.currentTime);
    const progress = (mainAudioElement.currentTime / mainAudioElement.duration) * 100;
    seekSlider.value = mainAudioElement.currentTime;
    seekProgressFill.style.width = `${progress}%`;
  });

  mainAudioElement.addEventListener('ended', () => {
    setPlayingState(false);
    deckStatusBadge.textContent = 'Completed';
    deckStatusBadge.className = 'deck-indicator';
  });

  // Interactive Seek
  seekSlider.addEventListener('input', () => {
    if (!mainAudioElement.duration) return;
    mainAudioElement.currentTime = parseFloat(seekSlider.value);
    const progress = (mainAudioElement.currentTime / mainAudioElement.duration) * 100;
    seekProgressFill.style.width = `${progress}%`;
    currentTime.textContent = formatTime(mainAudioElement.currentTime);
  });

  // Cycle Playback Speed
  speedPillBtn.addEventListener('click', () => {
    const currentIndex = state.speedOptions.indexOf(state.playbackSpeed);
    const nextIndex = (currentIndex + 1) % state.speedOptions.length;
    state.playbackSpeed = state.speedOptions[nextIndex];
    mainAudioElement.playbackRate = state.playbackSpeed;
    speedPillBtn.textContent = `${state.playbackSpeed.toFixed(1)}x`;
    showToast(`Speed set to ${state.playbackSpeed}x`, 'info', 1500);
  });

  // Volume & Mute Controls
  volumeSlider.addEventListener('input', () => {
    const vol = volumeSlider.value / 100;
    mainAudioElement.volume = vol;
    if (vol === 0) {
      mainAudioElement.muted = true;
      volumeHighIcon.style.display = 'none';
      volumeMutedIcon.style.display = 'inline';
    } else {
      mainAudioElement.muted = false;
      volumeHighIcon.style.display = 'inline';
      volumeMutedIcon.style.display = 'none';
    }
  });

  muteBtn.addEventListener('click', () => {
    mainAudioElement.muted = !mainAudioElement.muted;
    if (mainAudioElement.muted) {
      volumeHighIcon.style.display = 'none';
      volumeMutedIcon.style.display = 'inline';
    } else {
      volumeHighIcon.style.display = 'inline';
      volumeMutedIcon.style.display = 'none';
    }
  });

  // Download Audio File
  downloadBtn.addEventListener('click', () => {
    if (!state.currentAudioBlob) return;

    const safeVoice = (state.selectedVoice ? state.selectedVoice.name : 'voice')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    const filename = `elevenlabs_${safeVoice}_${Date.now()}.mp3`;

    const a = document.createElement('a');
    a.href = state.currentAudioUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast(`Downloaded ${filename}`, 'success', 2500);
  });

  // -------------------------------------------------------------
  // Canvas Soundwave Audio Visualizer
  // -------------------------------------------------------------
  function setupAudioVisualizer() {
    if (state.audioContext) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;

      state.audioContext = new AudioContext();
      state.analyser = state.audioContext.createAnalyser();
      state.analyser.fftSize = 64;

      // Note: createMediaElementSource requires CORS compliance for remote URLs,
      // but blob URLs (created locally via URL.createObjectURL) work natively!
      state.audioSource = state.audioContext.createMediaElementSource(mainAudioElement);
      state.audioSource.connect(state.analyser);
      state.analyser.connect(state.audioContext.destination);

      drawWaveform();
    } catch (err) {
      console.warn('Audio visualizer setup skipped:', err.message);
    }
  }

  function drawWaveform() {
    if (!waveformCanvas) return;
    const ctx = waveformCanvas.getContext('2d');
    const width = waveformCanvas.width;
    const height = waveformCanvas.height;

    const bufferLength = state.analyser ? state.analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    function renderFrame() {
      state.visualizerAnimationId = requestAnimationFrame(renderFrame);

      if (state.analyser && state.isPlaying) {
        state.analyser.getByteFrequencyData(dataArray);
      } else {
        // Fallback gentle decay when paused
        for (let i = 0; i < bufferLength; i++) {
          dataArray[i] = Math.max(0, dataArray[i] - 4);
        }
      }

      ctx.clearRect(0, 0, width, height);

      const barWidth = (width / bufferLength) * 1.8;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height * 0.9 + 4;

        // Gradient for frequency bars
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(0.5, '#8b5cf6');
        gradient.addColorStop(1, '#06b6d4');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, height - barHeight, barWidth - 3, barHeight, [3, 3, 0, 0]);
        ctx.fill();

        x += barWidth;
      }
    }

    renderFrame();
  }

  // -------------------------------------------------------------
  // Session History Management
  // -------------------------------------------------------------
  function addToHistory(item) {
    state.history.unshift(item);
    renderHistory();
  }

  function renderHistory() {
    historyCountBadge.textContent = state.history.length;

    if (state.history.length === 0) {
      historyEmpty.style.display = 'flex';
      clearHistoryBtn.style.display = 'none';
      // Remove any item nodes
      const items = historyList.querySelectorAll('.history-item');
      items.forEach(el => el.remove());
      return;
    }

    historyEmpty.style.display = 'none';
    clearHistoryBtn.style.display = 'inline-block';

    // Clear old items and rebuild
    const oldItems = historyList.querySelectorAll('.history-item');
    oldItems.forEach(el => el.remove());

    state.history.forEach((entry, idx) => {
      const card = document.createElement('div');
      card.className = 'history-item';
      if (entry.url === state.currentAudioUrl) {
        card.classList.add('active');
      }

      card.innerHTML = `
        <div class="history-item-top">
          <span class="history-voice-name">${escapeHtml(entry.voiceName)}</span>
          <span class="history-meta-pill">${escapeHtml(entry.modelName)} • ${entry.charCount} chars</span>
        </div>
        <p class="history-text-preview">${escapeHtml(entry.text)}</p>
        <div class="history-actions">
          <span class="history-time">${entry.timestamp}</span>
          <div class="history-btns">
            <button type="button" class="btn-history-play" data-index="${idx}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              <span>Play</span>
            </button>
            <button type="button" class="btn-history-subtle" data-action="download" data-index="${idx}" title="Download MP3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
            <button type="button" class="btn-history-subtle" data-action="load-text" data-index="${idx}" title="Load Text in Editor">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
            </button>
          </div>
        </div>
      `;

      historyList.appendChild(card);
    });

    // Attach click listeners to history cards
    historyList.querySelectorAll('.btn-history-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'));
        loadHistoryItem(idx);
      });
    });

    historyList.querySelectorAll('[data-action="download"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'));
        const item = state.history[idx];
        if (!item) return;

        const a = document.createElement('a');
        a.href = item.url;
        a.download = `elevenlabs_${item.voiceName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      });
    });

    historyList.querySelectorAll('[data-action="load-text"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'));
        const item = state.history[idx];
        if (!item) return;
        textInput.value = item.text;
        updateTextStats();
        textInput.focus();
        showToast('Text loaded into editor', 'info', 2000);
      });
    });
  }

  function loadHistoryItem(index) {
    const item = state.history[index];
    if (!item) return;

    state.currentAudioBlob = item.blob;
    state.currentAudioUrl = item.url;

    trackTitle.textContent = item.voiceName;
    trackSubtitle.textContent = `Model: ${item.modelName} • From Session History`;
    deckStatusBadge.textContent = 'Audio Ready';
    deckStatusBadge.className = 'deck-indicator playing';

    mainAudioElement.src = item.url;
    mainAudioElement.playbackRate = state.playbackSpeed;

    playPauseBtn.disabled = false;
    stopBtn.disabled = false;
    replayBtn.disabled = false;
    seekSlider.disabled = false;
    downloadBtn.disabled = false;

    setupAudioVisualizer();

    if (state.audioContext && state.audioContext.state === 'suspended') {
      state.audioContext.resume();
    }

    mainAudioElement.play().then(() => setPlayingState(true));
    renderHistory();
    showToast(`Loaded ${item.voiceName} narration`, 'info', 2000);
  }

  clearHistoryBtn.addEventListener('click', () => {
    if (!confirm('Clear all generations from this session?')) return;
    state.history.forEach(item => {
      if (item.url !== state.currentAudioUrl) {
        URL.revokeObjectURL(item.url);
      }
    });
    state.history = [];
    renderHistory();
    showToast('Session history cleared', 'info', 2000);
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[m]));
  }

  // -------------------------------------------------------------
  // Modals & Settings Management
  // -------------------------------------------------------------
  function openModal(modal) {
    modal.hidden = false;
  }

  function closeModal(modal) {
    modal.hidden = true;
  }

  settingsBtn.addEventListener('click', () => {
    checkHealthAndUser();
    openModal(settingsModal);
  });

  closeSettingsModalBtn.addEventListener('click', () => closeModal(settingsModal));
  cancelSettingsBtn.addEventListener('click', () => closeModal(settingsModal));

  shortcutsBtn.addEventListener('click', () => openModal(shortcutsModal));
  closeShortcutsModalBtn.addEventListener('click', () => closeModal(shortcutsModal));

  // Close modals on backdrop click
  [settingsModal, shortcutsModal].forEach(m => {
    m.addEventListener('click', (e) => {
      if (e.target === m) closeModal(m);
    });
  });

  // Verify & Update API Key from Modal
  saveKeyBtn.addEventListener('click', async () => {
    const key = newApiKeyInput.value.trim();
    if (!key) {
      showToast('Please enter an ElevenLabs API key.', 'error', 3000);
      return;
    }

    saveKeyBtn.disabled = true;
    saveKeyBtn.textContent = 'Verifying with ElevenLabs...';

    try {
      const res = await fetch('/api/settings/key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Key validation failed');
      }

      showToast('API key successfully updated and saved!', 'success', 3000);
      newApiKeyInput.value = '';
      closeModal(settingsModal);

      // Refresh state
      checkHealthAndUser();
      loadModels();
      loadVoices();
    } catch (err) {
      showToast('Error: ' + err.message, 'error', 4000);
    } finally {
      saveKeyBtn.disabled = false;
      saveKeyBtn.textContent = 'Verify & Update Key';
    }
  });

  // -------------------------------------------------------------
  // Global Keyboard Shortcuts
  // -------------------------------------------------------------
  document.addEventListener('keydown', (e) => {
    // Escape closes modals
    if (e.key === 'Escape') {
      closeModal(settingsModal);
      closeModal(shortcutsModal);
      return;
    }

    // Ctrl + Enter (or Cmd + Enter) generates speech
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      generateSpeech();
      return;
    }

    // When focus is inside input or textarea, don't trigger playback shortcuts
    const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (activeTag === 'textarea' || activeTag === 'input' || activeTag === 'select') {
      return;
    }

    // Space: Play / Pause
    if (e.code === 'Space') {
      e.preventDefault();
      if (!playPauseBtn.disabled) playPauseBtn.click();
    }

    // R: Replay
    if (e.key === 'r' || e.key === 'R') {
      if (!replayBtn.disabled) replayBtn.click();
    }

    // S: Stop
    if (e.key === 's' || e.key === 'S') {
      if (!stopBtn.disabled) stopBtn.click();
    }
  });

  // -------------------------------------------------------------
  // Initialize Application
  // -------------------------------------------------------------
  updateTextStats();
  checkHealthAndUser();
  loadModels();
  loadVoices();
});
