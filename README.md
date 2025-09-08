# Emotional AI Chatbot with 3D Avatar

An emotionally intelligent AI companion that interacts through voice, responds empathetically using GPT-4, displays a 3D animated avatar, and detects user emotions via webcam.

## 🎯 Project Overview

This project creates an AI companion that goes beyond text-based chat by providing:

- **Emotional Intelligence**: Detects and responds to user emotions
- **Voice Interaction**: Speech-to-text input and text-to-speech output
- **3D Avatar**: Unity-based animated character with Ready Player Me
- **Memory**: Persistent conversation history and context
- **Real-time Processing**: Live emotion detection and response

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Unity Client  │◄──►│  Python Backend │◄──►│   AI Services   │
│   (3D Avatar)   │    │   (Flask API)   │    │ (OpenAI, etc.)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Voice I/O      │    │  Session Mgmt   │    │  Emotion Det.   │
│  (Whisper/TTS)  │    │  (SQLite/JSON)  │    │  (MediaPipe)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Python 3.11** (via Conda)
- **Unity 2022.3 LTS** or newer
- **OpenAI API Key** (required)
- **ElevenLabs API Key** (optional, for voice synthesis)
- **Webcam and Microphone** (for full functionality)

### 1. Environment Setup

**Option A: Conda-Native Setup (Recommended)**

```bash
# Clone the repository
git clone <your-repo-url>
cd Emot

# Create conda environment from file (handles most dependencies)
conda env create -f environment.yml
conda activate emotional_ai
```

**Option B: Manual Setup**

```bash
# Clone the repository
git clone <your-repo-url>
cd Emot

# Create and activate conda environment
conda create -n emotional_ai python=3.11 -y
conda activate emotional_ai

# Install Python dependencies
cd backend
pip install -r requirements_simple.txt
```

### 2. Configuration

```bash
# Copy environment template
cp .env.template .env

# Edit .env file with your API keys
# At minimum, set your OpenAI API key:
OPENAI_API_KEY=sk-your-actual-openai-key-here
```

### 3. Test Backend

```bash
# Run backend tests
cd backend
python test_backend.py
```

### 4. Start the Server

```bash
# Start the Flask backend
cd backend
conda activate emotional_ai
python main.py
```

The server will start at `http://localhost:5000`

## 📁 Project Structure

```
Emot/
├── backend/                 # Python Flask backend
│   ├── main.py             # Main Flask application
│   ├── llm_handler.py      # GPT-4 integration
│   ├── session_manager.py  # Conversation persistence
│   ├── test_backend.py     # Backend tests
│   └── requirements*.txt   # Python dependencies
├── unity_client/           # Unity 3D avatar application
├── models/                 # Local AI models and weights
├── data/                   # Session data and audio cache
│   ├── sessions/          # Conversation history
│   └── audio_cache/       # Temporary audio files
├── config/                 # Configuration files
│   └── settings.json      # Application settings
├── docs/                   # Documentation
├── tests/                  # Unit and integration tests
├── scripts/               # Utility and setup scripts
├── .env                   # Environment variables (create from template)
├── .env.template          # Environment template
└── .clinerules           # Development guidelines
```

## 🔧 API Endpoints

### Core Endpoints

- `GET /api/v1/health` - Health check
- `POST /api/v1/chat` - Send message, get AI response
- `POST /api/v1/sessions` - Create new conversation session
- `GET /api/v1/sessions/{id}` - Get conversation history

### Request/Response Format

**Chat Request:**

```json
{
    "message": "I'm feeling sad today",
    "session_id": "optional-session-id",
    "emotion": "sad"
}
```

**Chat Response:**

```json
{
    "success": true,
    "data": {
        "message": "I'm here for you. What's making you feel sad?",
        "session_id": "uuid-here",
        "emotion": "empathetic"
    },
    "error": null,
    "timestamp": "2024-01-01T12:00:00Z"
}
```

## 🧪 Testing

### Backend Tests

```bash
cd backend
conda activate emotional_ai
python test_backend.py
```

### Manual API Testing

```bash
# Test health endpoint
curl http://localhost:5100/api/v1/health

# Test chat endpoint
curl -X POST http://localhost:5100/api/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, how are you?"}'
```

## 🎮 Unity Setup (Coming Soon)

The Unity client will provide:

- 3D avatar visualization with Ready Player Me
- Real-time lip-sync and emotion animations
- Voice input/output integration
- Webcam emotion detection display

## 🔊 Voice Features (Coming Soon)

- **Speech-to-Text**: OpenAI Whisper for voice input
- **Text-to-Speech**: ElevenLabs for emotional voice output
- **Real-time Processing**: Voice activity detection
- **Emotion-aware TTS**: Voice tone matches detected emotions

## 👁️ Emotion Detection (Coming Soon)

- **Facial Analysis**: MediaPipe Face Mesh
- **Real-time Processing**: Live webcam emotion detection
- **Emotion Classification**: Happy, sad, angry, surprised, fearful, disgusted, neutral
- **Context Integration**: Emotions influence AI responses

## 🔒 Security & Privacy

- API keys stored in environment variables
- No logging of sensitive user data
- Session cleanup after inactivity
- Secure file permissions for session data
- Optional conversation history encryption

## 🛠️ Development

### Code Standards

- **Python**: PEP 8, type hints, docstrings
- **Unity C#**: Microsoft conventions, XML documentation
- **API**: RESTful design, consistent error handling
- **Git**: Conventional commits, feature branches

### Environment Management

**Adding New Dependencies:**

```bash
# Activate conda environment
conda activate emotional_ai

# Try conda first (preferred)
conda install package_name

# If not available in conda, use pip and update environment.yml
pip install package_name
# Then manually add to environment.yml under pip: section

# Or update entire environment from file
conda env update -f environment.yml

# Run tests before committing
python test_backend.py
```

## 📈 Roadmap

### Phase 1: Core Backend ✅

- [X] Flask API server
- [X] GPT-4 integration with emotional context
- [X] Session management and persistence
- [X] Conda environment setup
- [X] Basic testing framework

### Phase 2: Voice Processing (In Progress)

- [ ] OpenAI Whisper speech-to-text
- [ ] ElevenLabs text-to-speech
- [ ] Voice activity detection
- [ ] Audio streaming endpoints

### Phase 3: Emotion Detection (Planned)

- [ ] MediaPipe facial emotion analysis
- [ ] Real-time webcam processing
- [ ] Emotion classification pipeline
- [ ] Emotion-response mapping

### Phase 4: Unity 3D Avatar (Planned)

- [ ] Unity project setup
- [ ] Ready Player Me integration
- [ ] Avatar animation system
- [ ] Lip-sync and emotion sync
- [ ] Unity-Python API communication

### Phase 5: Integration & Polish (Planned)

- [ ] End-to-end testing
- [ ] Performance optimization
- [ ] Advanced emotion features
- [ ] Deployment configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the coding standards in `.clinerules`
4. Run tests (`python test_backend.py`)
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for GPT-4 and Whisper
- Ready Player Me for 3D avatar technology
- ElevenLabs for voice synthesis
- MediaPipe for emotion detection
- Unity Technologies for 3D rendering

## 📞 Support

For questions, issues, or contributions:

- Create an issue on GitHub
- Check the documentation in `/docs`
- Review the development guidelines in `.clinerules`

---

**Note**: This project is in active development. Some features may be incomplete or subject to change.
