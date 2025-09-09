"""Main Flask application for the Emotional AI Chatbot backend."""

import os
import logging
from datetime import datetime
from typing import Dict, Any, Optional

from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

from llm_handler import LLMHandler
from session_manager import SessionManager
from voice_processor import VoiceProcessor

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize components
llm_handler = LLMHandler()
session_manager = SessionManager()
voice_processor = VoiceProcessor()


def create_response(success: bool, data: Any = None, error: Dict = None) -> Dict:
    """Create standardized API response format.
    
    Args:
        success: Whether the operation was successful
        data: Response data if successful
        error: Error information if failed
        
    Returns:
        Standardized response dictionary
    """
    return {
        "success": success,
        "data": data,
        "error": error,
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }


@app.route('/api/v1/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify(create_response(True, {"status": "healthy"}))


@app.route('/api/v1/chat', methods=['POST'])
def chat():
    """Handle chat messages and return AI responses.
    
    Expected JSON payload:
    {
        "message": "User message text",
        "session_id": "optional_session_id",
        "emotion": "optional_detected_emotion"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'message' not in data:
            return jsonify(create_response(
                False, 
                error={
                    "code": "INVALID_INPUT",
                    "message": "Message is required",
                    "details": "Request must include 'message' field"
                }
            )), 400
        
        message = data['message']
        session_id = data.get('session_id')
        user_emotion = data.get('emotion', 'neutral')
        
        # Get or create session
        if not session_id:
            session_id = session_manager.create_session()
        
        # Get conversation history
        history = session_manager.get_conversation_history(session_id)
        
        # Generate AI response
        ai_response = llm_handler.generate_response(
            message=message,
            history=history,
            user_emotion=user_emotion
        )
        
        # Save conversation
        session_manager.save_message(session_id, "user", message, user_emotion)
        session_manager.save_message(session_id, "assistant", ai_response, "empathetic")
        
        return jsonify(create_response(
            True,
            {
                "message": ai_response,
                "session_id": session_id,
                "emotion": "empathetic"
            }
        ))
        
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}")
        return jsonify(create_response(
            False,
            error={
                "code": "INTERNAL_ERROR",
                "message": "Failed to process chat message",
                "details": str(e)
            }
        )), 500


@app.route('/api/v1/sessions/<session_id>', methods=['GET'])
def get_session(session_id: str):
    """Get conversation history for a session."""
    try:
        history = session_manager.get_conversation_history(session_id)
        
        if history is None:
            return jsonify(create_response(
                False,
                error={
                    "code": "SESSION_NOT_FOUND",
                    "message": "Session not found",
                    "details": f"No session found with ID: {session_id}"
                }
            )), 404
        
        return jsonify(create_response(True, {"history": history}))
        
    except Exception as e:
        logger.error(f"Error getting session {session_id}: {str(e)}")
        return jsonify(create_response(
            False,
            error={
                "code": "INTERNAL_ERROR",
                "message": "Failed to retrieve session",
                "details": str(e)
            }
        )), 500


@app.route('/api/v1/sessions', methods=['POST'])
def create_session():
    """Create a new conversation session."""
    try:
        session_id = session_manager.create_session()
        return jsonify(create_response(True, {"session_id": session_id}))
        
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        return jsonify(create_response(
            False,
            error={
                "code": "INTERNAL_ERROR",
                "message": "Failed to create session",
                "details": str(e)
            }
        )), 500


@app.route('/api/v1/voice/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio to text using Whisper.
    
    Expected form data:
    - audio: Audio file (WAV, MP3, etc.)
    """
    try:
        if 'audio' not in request.files:
            return jsonify(create_response(
                False,
                error={
                    "code": "INVALID_INPUT",
                    "message": "Audio file is required",
                    "details": "Request must include 'audio' file"
                }
            )), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify(create_response(
                False,
                error={
                    "code": "INVALID_INPUT",
                    "message": "No audio file selected",
                    "details": "Audio file cannot be empty"
                }
            )), 400
        
        # Read audio data
        audio_data = audio_file.read()
        
        # Determine audio format from filename
        audio_format = audio_file.filename.split('.')[-1].lower() if '.' in audio_file.filename else 'wav'
        
        # Transcribe audio
        transcribed_text = voice_processor.transcribe_audio(audio_data, audio_format)
        
        if transcribed_text:
            return jsonify(create_response(
                True,
                {
                    "text": transcribed_text,
                    "audio_format": audio_format
                }
            ))
        else:
            return jsonify(create_response(
                False,
                error={
                    "code": "TRANSCRIPTION_FAILED",
                    "message": "Failed to transcribe audio",
                    "details": "Audio could not be processed by Whisper"
                }
            )), 500
            
    except Exception as e:
        logger.error(f"Error in transcribe endpoint: {str(e)}")
        return jsonify(create_response(
            False,
            error={
                "code": "INTERNAL_ERROR",
                "message": "Failed to transcribe audio",
                "details": str(e)
            }
        )), 500


@app.route('/api/v1/voice/synthesize', methods=['POST'])
def synthesize_speech():
    """Synthesize speech from text using ElevenLabs.
    
    Expected JSON payload:
    {
        "text": "Text to convert to speech",
        "emotion": "optional_emotion_context",
        "voice": "optional_voice_name"
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify(create_response(
                False,
                error={
                    "code": "INVALID_INPUT",
                    "message": "Text is required",
                    "details": "Request must include 'text' field"
                }
            )), 400
        
        text = data['text']
        emotion = data.get('emotion', 'neutral')
        voice = data.get('voice')
        
        # Generate speech
        audio_data = voice_processor.synthesize_speech(text, emotion, voice)
        
        if audio_data:
            # Save to cache for serving
            import uuid
            filename = f"tts_{uuid.uuid4().hex[:8]}.mp3"
            cache_path = voice_processor.save_audio_to_cache(audio_data, filename)
            
            return jsonify(create_response(
                True,
                {
                    "audio_url": f"/api/v1/voice/audio/{filename}",
                    "text": text,
                    "emotion": emotion,
                    "voice": voice or voice_processor.elevenlabs_voice
                }
            ))
        else:
            return jsonify(create_response(
                False,
                error={
                    "code": "SYNTHESIS_FAILED",
                    "message": "Failed to synthesize speech",
                    "details": "Text could not be converted to speech"
                }
            )), 500
            
    except Exception as e:
        logger.error(f"Error in synthesize endpoint: {str(e)}")
        return jsonify(create_response(
            False,
            error={
                "code": "INTERNAL_ERROR",
                "message": "Failed to synthesize speech",
                "details": str(e)
            }
        )), 500


@app.route('/api/v1/voice/audio/<filename>', methods=['GET'])
def serve_audio(filename: str):
    """Serve cached audio files."""
    try:
        from flask import send_file
        import os.path
        
        cache_dir = voice_processor.audio_cache_dir
        file_path = cache_dir / filename
        
        if not file_path.exists():
            return jsonify(create_response(
                False,
                error={
                    "code": "FILE_NOT_FOUND",
                    "message": "Audio file not found",
                    "details": f"File {filename} does not exist"
                }
            )), 404
        
        return send_file(
            str(file_path),
            mimetype='audio/mpeg',
            as_attachment=False
        )
        
    except Exception as e:
        logger.error(f"Error serving audio file {filename}: {str(e)}")
        return jsonify(create_response(
            False,
            error={
                "code": "INTERNAL_ERROR",
                "message": "Failed to serve audio file",
                "details": str(e)
            }
        )), 500


@app.route('/api/v1/voice/status', methods=['GET'])
def voice_status():
    """Get voice processing system status."""
    try:
        status = voice_processor.get_status()
        return jsonify(create_response(True, status))
        
    except Exception as e:
        logger.error(f"Error getting voice status: {str(e)}")
        return jsonify(create_response(
            False,
            error={
                "code": "INTERNAL_ERROR",
                "message": "Failed to get voice status",
                "details": str(e)
            }
        )), 500


@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify(create_response(
        False,
        error={
            "code": "NOT_FOUND",
            "message": "Endpoint not found",
            "details": "The requested endpoint does not exist"
        }
    )), 404


@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify(create_response(
        False,
        error={
            "code": "INTERNAL_ERROR",
            "message": "Internal server error",
            "details": "An unexpected error occurred"
        }
    )), 500


if __name__ == '__main__':
    # Validate required environment variables
    required_env_vars = ['OPENAI_API_KEY']
    missing_vars = [var for var in required_env_vars if not os.getenv(var)]
    
    if missing_vars:
        logger.error(f"Missing required environment variables: {missing_vars}")
        logger.error("Please create a .env file with the required API keys")
        exit(1)
    
    # Start the server
    host = os.getenv('FLASK_HOST', 'localhost')
    port = int(os.getenv('FLASK_PORT', 5100))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    
    logger.info(f"Starting Emotional AI Chatbot server on {host}:{port}")
    app.run(host=host, port=port, debug=debug)
