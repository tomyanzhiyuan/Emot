# Emotional AI Companion with 3D Avatar & Voice Cloning

An immersive AI companion that provides emotional support through realistic 3D avatar conversations, voice interaction, and the ability to clone voices of loved ones for meaningful connections across distances.

## 🎯 Project Vision

This project creates a revolutionary AI companion experience that transforms digital interaction by providing:

- **3D Avatar Call Interface**: FaceTime-style conversations with a realistic 3D avatar
- **Voice Cloning Technology**: Clone voices of loved ones to overcome distance and time barriers
- **Emotional Intelligence**: AI that understands and responds to your emotional state
- **Real-time Conversation**: Natural voice interaction with lip-synced avatar responses
- **Immersive Presence**: Feel like you're talking to a real person, not a chatbot

## 🌟 Core User Experience

### **Call-Based Interaction Flow:**
1. **Landing**: 3D avatar visible with idle animations, chat disabled
2. **AI Greeting**: "Hello! I'm your emotional AI companion..."
3. **Call Invitation**: "Click to Enter Call" button appears
4. **Call Mode**: Full-screen avatar, real-time voice conversation
5. **Natural Dialogue**: Speak or type → Avatar responds with voice + lip-sync

### **Voice Cloning for Loved Ones:**
- **Emotional Connection**: Talk to family/friends in their own voice
- **Long-Distance Support**: Bridge time zones and physical separation
- **Comfort & Healing**: Familiar voices during difficult times
- **Accessibility**: For those who've lost their voice or loved ones

## 🏗️ Technical Architecture

### **Call Interface System:**
```
┌─────────────────────────────────────────┐
│  🤖 3D Avatar (Main Focus)              │
│  - Stylized-realistic VRM 1.0           │
│  - Real-time lip-sync                   │
│  - Emotion-responsive expressions       │
│  - Natural idle animations              │
└─────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  📞 Call Controls (Bottom Overlay)      │
│  [🎤 Mute] [🔊 Volume] [📞 End Call]    │
└─────────────────────────────────────────┘
```

### **Streaming Audio Pipeline:**
```
User Input → LLM Response → Streaming TTS → Avatar Lip-Sync
     ↑                                              ↓
Voice Cloning ←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←←
```

### **Performance Targets:**
- **LLM First Token**: <800ms
- **TTS First Audio**: <300ms after receiving text
- **Avatar Lip-Sync**: Frame-accurate within ±60ms
- **GPU Usage**: <30% on typical laptop, 60fps

## 🚀 Quick Start

### Prerequisites
- **Python 3.11** (via Conda)
- **OpenAI API Key** (required)
- **Modern Browser** (Chrome, Firefox, Safari)
- **Microphone** (for voice interaction)

### 1. Environment Setup
```bash
# Clone the repository
git clone <your-repo-url>
cd Emot

# Create and activate conda environment
conda create -n emotional_ai python=3.11 -y
conda activate emotional_ai

# Install dependencies
cd backend
pip install -r requirements_simple.txt
```

### 2. Configuration
```bash
# Copy environment template
cp .env.template .env

# Edit .env file with your API keys
OPENAI_API_KEY=sk-your-actual-openai-key-here
FLASK_PORT=5100
```

### 3. Start the Experience
```bash
# Start the backend server
cd backend
conda activate emotional_ai
python main.py

# Open the web interface
open ../web_interface/index.html
```

### 4. Enter Call Mode
1. Wait for AI greeting message
2. Click **"Click to Enter Call"** button
3. Grant microphone permission when prompted
4. Start your conversation with the 3D avatar!

## 📁 Project Structure

```
Emot/
├── backend/                 # Python Flask backend
│   ├── main.py             # Main Flask application
│   ├── llm_handler.py      # GPT-4 integration
│   ├── session_manager.py  # Conversation persistence
│   ├── voice_processor.py  # Whisper + TTS integration
│   └── requirements*.txt   # Python dependencies
├── web_interface/          # 3D Avatar call interface
│   ├── index.html          # Main call interface
│   ├── style.css           # Call interface styling
│   ├── script.js           # Avatar + voice functionality
│   └── avatar/             # 3D avatar assets
├── models/                 # Voice cloning models
├── data/                   # Session data and audio cache
├── config/                 # Configuration files
└── .clinerules            # Development guidelines
```

## 🔧 API Endpoints

### Core Conversation
- `GET /api/v1/health` - Health check
- `POST /api/v1/chat` - Send message, get AI response
- `POST /api/v1/sessions` - Create conversation session

### Voice Processing
- `POST /api/v1/voice/transcribe` - Speech-to-text (Whisper)
- `POST /api/v1/voice/synthesize` - Text-to-speech with emotion
- `GET /api/v1/voice/audio/{filename}` - Serve audio files
- `GET /api/v1/voice/status` - Voice system status

### Future: Voice Cloning
- `POST /api/v1/voice/clone/upload` - Upload voice samples
- `POST /api/v1/voice/clone/train` - Train voice model
- `GET /api/v1/voice/clone/status` - Training status

## 🎭 3D Avatar System

### **Avatar Specifications:**
- **Style**: Stylized-realistic (not cartoon, not uncanny valley)
- **Format**: VRM 1.0 with humanoid rig and blendshapes
- **Materials**: PBR (physically-based) skin, hair, eyes
- **Customization**: Face, skin tone, hair (neutral default)
- **Clothing**: Casual, neutral outfit with studio lighting

### **Animation Features:**
- **Lip-Sync**: Phoneme-to-viseme mapping from TTS
- **Expressions**: Emotion-responsive facial expressions
- **Idle Behavior**: Natural breathing, blinking, micro-movements
- **Gaze**: Eye contact and natural looking patterns

### **Technical Stack:**
- **Renderer**: Three.js WebGL
- **Avatar Format**: VRM 1.0 (Ready Player Me compatible)
- **Animations**: Mixamo + custom blendshapes
- **Lip-Sync**: ARKit visemes (12-22 mouth shapes)

## 🔊 Voice Technology

### **Text-to-Speech:**
- **Primary**: Coqui TTS (self-hosted, cost-effective)
- **Fallback**: Azure/Edge TTS (reliability backup)
- **Quality**: Single premium voice (Jofish or equivalent)
- **Streaming**: Chunked audio output for low latency

### **Voice Cloning:**
- **Sample Requirements**: 5-10 minutes of clean speech
- **Quality Tiers**: 
  - Demo: 30-60 seconds (basic quality)
  - Good: 5-10 minutes (stable prosody)
  - Premium: 30-60 minutes (high fidelity)
- **Privacy**: Local-first, encrypted storage, consent required

## 🎮 Call Interface Features

### **Call States:**
- **IDLE**: Avatar visible, chat disabled
- **GREETING**: AI introduces itself
- **CTA_VISIBLE**: "Click to Enter Call" button shown
- **CALL_ACTIVE**: Full conversation mode
- **SPEAKING**: Avatar talking with lip-sync
- **LISTENING**: Avatar waiting for user input

### **Call Controls:**
- **Mute/Unmute**: Toggle microphone
- **Volume**: Adjust avatar voice
- **End Call**: Return to idle state
- **Transcript**: Toggle conversation text (default off)

### **Audio Features:**
- **WebAudio Context**: Unlocked by "Click to Enter Call"
- **Streaming Playback**: Low-latency audio chunks
- **Voice Activity**: Automatic speech detection
- **Echo Cancellation**: Clean audio processing

## 🧪 Testing & Performance

### **Call Experience Testing:**
```bash
# Test voice processing
curl -X POST http://localhost:5100/api/v1/voice/status

# Test TTS synthesis
curl -X POST http://localhost:5100/api/v1/voice/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, this is a test of the voice system"}'
```

### **Performance Benchmarks:**
- **Audio Latency**: <1.2s end-to-end response time
- **Lip-Sync Accuracy**: ±60ms frame accuracy
- **GPU Usage**: <30% on typical laptop
- **Frame Rate**: Stable 60fps avatar rendering

## 📈 Development Roadmap

### Phase 1: Core Backend ✅ COMPLETED
- [x] Flask API server with emotional intelligence
- [x] GPT-4 integration with conversation memory
- [x] Session management and persistence
- [x] Conda environment with voice processing

### Phase 2: Voice Processing ✅ COMPLETED
- [x] OpenAI Whisper speech-to-text integration
- [x] Voice processing API endpoints
- [x] Audio streaming and caching system
- [x] Emotion-aware voice modulation

### Phase 2.5: Call Interface & 3D Avatar 🚧 CURRENT
- [ ] Transform chat interface to call interface
- [ ] Add "Click to Enter Call" button and WebAudio unlock
- [ ] Implement Three.js 3D avatar rendering
- [ ] Integrate VRM 1.0 avatar with Ready Player Me
- [ ] Add streaming TTS with real-time lip-sync
- [ ] Implement call state machine and controls

### Phase 3: Advanced Avatar Features 📋 PLANNED
- [ ] Emotion-responsive facial expressions
- [ ] Natural idle animations and micro-movements
- [ ] Gaze tracking and eye contact simulation
- [ ] Performance optimization for mobile devices

### Phase 4: Voice Cloning System 📋 PLANNED
- [ ] Voice sample collection interface
- [ ] Coqui TTS voice cloning integration
- [ ] Consent and privacy management system
- [ ] Voice model training and storage
- [ ] Multi-voice selection and management

### Phase 5: Production & Polish 📋 FUTURE
- [ ] Mobile optimization and responsive design
- [ ] Advanced emotion detection integration
- [ ] Multi-language support
- [ ] Cloud deployment and scaling
- [ ] Analytics and usage insights

## 🔐 Privacy & Voice Cloning Ethics

### **Data Protection:**
- **Local-First**: Voice models stored locally when possible
- **Encryption**: All voice data encrypted at rest
- **Consent Ledger**: Explicit permission tracking per voice
- **Easy Deletion**: One-click removal of voice models and data

### **Ethical Guidelines:**
- **Explicit Consent**: Voice owner must provide clear permission
- **Scoped Usage**: Cloned voices only for intended emotional support
- **No Impersonation**: Clear disclosure when using cloned voices
- **Respect Boundaries**: Honor requests to remove or limit voice usage

## 🛠️ Development Guidelines

### **Call Interface Standards:**
- **Responsive Design**: 16:9 desktop, 4:3 mobile with letterboxing
- **Audio Quality**: 16kHz minimum, Opus streaming preferred
- **State Management**: Clear separation of IDLE/GREETING/CALL states
- **Error Handling**: Graceful fallbacks for audio/avatar failures

### **3D Avatar Requirements:**
- **Format**: VRM 1.0 with ARKit blendshapes
- **Performance**: 60fps target, dynamic LOD for optimization
- **Animations**: Smooth transitions between idle/speaking/listening
- **Accessibility**: Caption support and audio-only fallback

### **Voice Cloning Standards:**
- **Sample Quality**: WAV, mono, 16-48kHz, 24-bit, quiet environment
- **Training Data**: Phonetically diverse content for better quality
- **Model Storage**: Encrypted, versioned, with metadata
- **Usage Tracking**: Log usage for consent compliance

## 🌟 Future Vision

This project aims to revolutionize emotional AI interaction by:

1. **Bridging Physical Distance**: Connect with loved ones through their cloned voices
2. **Emotional Healing**: Provide comfort through familiar voices and presence
3. **Natural Interaction**: Make AI feel like talking to a real person
4. **Accessible Support**: 24/7 emotional companion in familiar voices
5. **Ethical AI**: Responsible voice cloning with proper consent and privacy

---

**Ready to experience the future of emotional AI companionship!** 🤖💙
