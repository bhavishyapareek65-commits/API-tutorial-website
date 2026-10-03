# ElevenLabs AI Text-to-Speech Studio

A modern, full-stack AI Voice Studio web application powered by the official **ElevenLabs API**. Convert any text script into lifelike, emotive narration directly in your browser with real-time audio playback, interactive soundwave visualizer, voice preview, customizable voice dynamics, session history, and one-click MP3 download.

Built with **HTML5**, **Vanilla CSS3**, **Vanilla JavaScript**, and a secure **Node.js + Express** proxy backend.

---

## 🌟 Key Features

1. **Official ElevenLabs API Integration**:
   - **TTS Models**: Fetches active text-to-speech models from `/v1/models` (e.g., Eleven Multilingual v2, Eleven Turbo v2.5, Eleven Flash v2.5, Eleven v3).
   - **Voices Catalog**: Dynamically loads real voice profiles from `/v1/voices` with metadata (accent, age, gender, category).
   - **Audio Generation**: Converts text into natural MP3 narration using `/v1/text-to-speech/{voice_id}`.
   - **Voice Previews**: Listen to official voice samples before generating narration.

2. **Studio Text Editor**:
   - Spacious, comfortable typography for long-form scripts, stories, and dialogues.
   - Live character counter, word counter, and estimated speech duration.
   - Visual progress bar with limit warnings (up to 5,000 characters per request).
   - One-click sample prompt selector (Narrative Story, Tech Explainer, Ad Commercial, Motivational, Podcast).
   - Quick action buttons: **Paste**, **Copy**, and **Clear**.
   - Keyboard shortcut: <kbd>Ctrl</kbd> + <kbd>Enter</kbd> (or <kbd>Cmd</kbd> + <kbd>Enter</kbd>) to instantly generate narration.

3. **Advanced Voice Tuning (Optional)**:
   - **Stability Slider** (0% - 100%): Adjust between highly variable/emotive and steady/monotonic delivery.
   - **Clarity & Similarity Boost** (0% - 100%): Control voice likeness and presence.
   - **Style Exaggeration** (0% - 100%): Amplify expressive style on supported models.
   - **Speaker Boost Toggle**: Enhance speaker resemblance and acoustic clarity.
   - **Speaking Speed Slider** (0.70x - 1.20x): Fine-tune narration tempo.

4. **Studio Audio Deck**:
   - Dedicated player with Play, Pause, Resume, Stop, and Replay controls.
   - Real-time **Canvas Waveform Visualizer** driven by the Web Audio API.
   - Interactive seek/scrub timeline with millisecond precision and `mm:ss` timestamp display.
   - Multi-speed playback selector (`0.8x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`).
   - Smooth volume slider with one-click Mute/Unmute.
   - One-click `.mp3` download with descriptive filenames.

5. **Session Generation History**:
   - Retains generated narrations during your active browser session.
   - Replay or download any previously synthesized speech without re-consuming ElevenLabs character credits.
   - Load previously generated text back into the editor with one click.

6. **Security & API Protection**:
   - Server-side environment variable `ELEVENLABS_API_KEY` loaded via `dotenv`.
   - Never exposes API keys, authentication headers, or sensitive secrets to frontend client code.
   - `.env` excluded from version control in `.gitignore`.
   - Built-in API status indicator with masked key preview (`sk_...xxxx`) and remaining character quota tracker.

---

## 📁 Project Structure

```
elevenlabs-ai-studio/
├── .env.example            # Environment configuration template
├── .env                    # Local environment variables (DO NOT COMMIT)
├── .gitignore              # Ignores .env, node_modules, and logs
├── package.json            # Project dependencies and run scripts
├── README.md               # Documentation and setup instructions
├── server/
│   └── server.js           # Express API proxy and ElevenLabs integration
└── public/
    ├── index.html          # Semantic HTML5 Studio layout
    ├── css/
    │   └── style.css       # Studio design system, responsive styles & animations
    └── js/
        └── app.js          # Client-side state, AudioContext player, & API handling
```

---

## 🚀 Prerequisites

Ensure you have **Node.js** installed on your machine:
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later

To check your versions, run:
```bash
node -v
npm -v
```

---

## 🛠️ Installation & Setup

### 1. Clone or Open the Project
Open a terminal in the project directory:
```bash
cd "Website For api"
```

### 2. Install Dependencies
Install the required packages (`express`, `dotenv`, `cors`):
```bash
npm install
```

### 3. Configure Your ElevenLabs API Key

1. If you don't already have an API key, sign up at [ElevenLabs](https://elevenlabs.io/).
2. Navigate to your **Profile** → **API Keys** and copy your secret key (starts with `sk_...`).
3. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
4. Open `.env` and set your key:
   ```env
   ELEVENLABS_API_KEY=sk_your_actual_key_here
   PORT=3000
   ```

> ⚠️ **Security Notice**: Never commit `.env` to Git. The `.gitignore` file is pre-configured to ensure `.env` remains local to your computer.

---

## ▶️ Starting the Application

Start the local server:
```bash
npm start
```

Or run in auto-reload development mode:
```bash
npm run dev
```

Once started, open your browser and navigate to:
```
http://localhost:3000
```

> **Note**: Do not open `index.html` directly via `file://`. The application requires the Node.js backend proxy to securely communicate with the ElevenLabs API.

---

## 🎯 How to Use the Studio

1. **Check Connection**: Notice the green status badge in the header: **API Connected** along with your available quota balance.
2. **Enter Script**: Type or paste your script into the large editor, or click **Insert Sample Text...** to load a pre-written prompt.
3. **Select Model**: Choose from the ElevenLabs TTS models (e.g., *Eleven Turbo v2.5* or *Eleven Multilingual v2*).
4. **Choose Voice**: Select an AI voice from the dropdown. Click the **Sample** button to audition the voice before generating.
5. **Tune Dynamics (Optional)**: Click **Voice Tuning & Dynamics** to adjust stability, similarity, style, speed, and speaker boost.
6. **Generate Narration**: Click the glowing **Generate Narration** button (or press <kbd>Ctrl</kbd> + <kbd>Enter</kbd>).
7. **Playback & Download**: The generated speech automatically loads into the audio deck and begins playback with an animated soundwave. Click the **Download** button to save the MP3.
8. **Session History**: Access your past generations in the right-hand history deck to replay or download them at any time.

---

## ⚙️ Backend API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Returns server health and masked API key status |
| `GET` | `/api/user` | Returns user subscription tier and character quota |
| `GET` | `/api/models` | Returns filtered text-to-speech models from ElevenLabs |
| `GET` | `/api/voices` | Returns voice profiles with metadata and sample previews |
| `POST` | `/api/generate` | Accepts text and voice settings; returns binary MP3 audio |
| `POST` | `/api/settings/key` | Validates and updates the server API key dynamically |

---

## 🔍 Troubleshooting Guide

### 1. "API Key Missing"
- Ensure `.env` exists in the project root and defines `ELEVENLABS_API_KEY`.
- Restart the server with `npm start` after editing `.env`, or use the **Settings** modal in the studio UI to enter your key.

### 2. "This request exceeds your API key quota"
- ElevenLabs allows users to set individual credit quotas on specific API keys.
- Log in to your [ElevenLabs Dashboard](https://elevenlabs.io/), go to **Profile** → **API Keys**, select your key, and set the quota to **No limit** (or increase its credit allowance).

### 3. "Free users cannot use library voices"
- Free tier accounts can use any of the **Premade Voices** (e.g., *Roger*, *Sarah*, *George*, *River*, *Callum*, *Laura*, *Alice*, *Charlie*).
- Community Library voices require a paid ElevenLabs subscription. The studio automatically labels premade voices in the dropdown.

### 4. "Text too long"
- Requests are validated up to 5,000 characters per call. Split longer scripts into smaller segments for optimal synthesis.

---

## 🛡️ License & Credits

- Developed for the **ElevenLabs AI Text-to-Speech Studio** project.
- Powered by the official [ElevenLabs API](https://elevenlabs.io/docs/api-reference).
- MIT License.
