"""Voice processing module for speech-to-text and text-to-speech functionality."""

import os
import io
import logging
import tempfile
from typing import Optional, Dict, Any
from pathlib import Path

import whisper
from pydub import AudioSegment
from dotenv import load_dotenv

# Try to import ElevenLabs with fallback
try:
    from elevenlabs.client import ElevenLabs
    from elevenlabs import Voice, VoiceSettings
    ELEVENLABS_AVAILABLE = True
except ImportError:
    try:
        from elevenlabs import generate, set_api_key, voices
        ELEVENLABS_AVAILABLE = True
    except ImportError:
        ELEVENLABS_AVAILABLE = False

load_dotenv()

logger = logging.getLogger(__name__)


class VoiceProcessor:
    """Handles voice processing including speech-to-text and text-to-speech."""
    
    def __init__(self):
        """Initialize the voice processor with Whisper and ElevenLabs."""
        self.whisper_model = None
        self.elevenlabs_configured = False
        
        # Load configuration
        self._load_config()
        
        # Initialize Whisper
        self._init_whisper()
        
        # Initialize ElevenLabs
        self._init_elevenlabs()
        
        logger.info("Voice Processor initialized")
    
    def _load_config(self) -> None:
        """Load voice processing configuration."""
        self.whisper_model_name = os.getenv('WHISPER_MODEL', 'base')
        self.elevenlabs_voice = os.getenv('ELEVENLABS_VOICE', 'Bella')
        self.audio_cache_dir = Path("../data/audio_cache")
        self.audio_cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _init_whisper(self) -> None:
        """Initialize OpenAI Whisper for speech-to-text."""
        try:
            logger.info(f"Loading Whisper model: {self.whisper_model_name}")
            self.whisper_model = whisper.load_model(self.whisper_model_name)
            logger.info("Whisper model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load Whisper model: {str(e)}")
            self.whisper_model = None
    
    def _init_elevenlabs(self) -> None:
        """Initialize ElevenLabs for text-to-speech."""
        if not ELEVENLABS_AVAILABLE:
            logger.warning("ElevenLabs package not available - TTS will be disabled")
            self.elevenlabs_configured = False
            return
            
        try:
            api_key = os.getenv('ELEVENLABS_API_KEY')
            if api_key:
                # Try new API first
                try:
                    self.elevenlabs_client = ElevenLabs(api_key=api_key)
                    # Test the API key by getting available voices
                    available_voices = self.elevenlabs_client.voices.get_all()
                    self.elevenlabs_configured = True
                    logger.info(f"ElevenLabs configured with new API ({len(available_voices.voices)} voices)")
                except:
                    # Fallback to old API
                    set_api_key(api_key)
                    available_voices = voices()
                    self.elevenlabs_configured = True
                    self.elevenlabs_client = None
                    logger.info(f"ElevenLabs configured with legacy API ({len(available_voices)} voices)")
            else:
                logger.warning("ElevenLabs API key not found - TTS will be disabled")
                self.elevenlabs_configured = False
        except Exception as e:
            logger.error(f"Failed to configure ElevenLabs: {str(e)}")
            self.elevenlabs_configured = False
    
    def transcribe_audio(self, audio_data: bytes, audio_format: str = "wav") -> Optional[str]:
        """Convert speech to text using Whisper.
        
        Args:
            audio_data: Raw audio data bytes
            audio_format: Audio format (wav, mp3, etc.)
            
        Returns:
            Transcribed text or None if failed
        """
        if not self.whisper_model:
            logger.error("Whisper model not available")
            return None
        
        try:
            # Create temporary file for audio data
            with tempfile.NamedTemporaryFile(suffix=f".{audio_format}", delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name
            
            try:
                # Transcribe audio
                result = self.whisper_model.transcribe(temp_file_path)
                transcribed_text = result["text"].strip()
                
                logger.info(f"Transcribed audio: {transcribed_text[:50]}...")
                return transcribed_text
                
            finally:
                # Clean up temporary file
                os.unlink(temp_file_path)
                
        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            return None
    
    def synthesize_speech(
        self, 
        text: str, 
        emotion: str = "neutral",
        voice: Optional[str] = None
    ) -> Optional[bytes]:
        """Convert text to speech using ElevenLabs.
        
        Args:
            text: Text to convert to speech
            emotion: Emotion context for voice modulation
            voice: Voice name to use (defaults to configured voice)
            
        Returns:
            Audio data as bytes or None if failed
        """
        if not self.elevenlabs_configured:
            logger.warning("ElevenLabs not configured - using fallback TTS")
            return self._fallback_tts(text)
        
        try:
            # Use specified voice or default
            voice_name = voice or self.elevenlabs_voice
            
            # Adjust voice settings based on emotion
            voice_settings = self._get_voice_settings_for_emotion(emotion)
            
            # Generate speech using appropriate API
            if hasattr(self, 'elevenlabs_client') and self.elevenlabs_client:
                # Use new API
                audio = self.elevenlabs_client.generate(
                    text=text,
                    voice=voice_name,
                    model="eleven_monolingual_v1"
                )
            else:
                # Use legacy API
                audio = generate(
                    text=text,
                    voice=voice_name,
                    model="eleven_monolingual_v1",
                    **voice_settings
                )
            
            logger.info(f"Generated speech for text: {text[:50]}... (emotion: {emotion})")
            return audio
            
        except Exception as e:
            logger.error(f"Error generating speech: {str(e)}")
            return self._fallback_tts(text)
    
    def _get_voice_settings_for_emotion(self, emotion: str) -> Dict[str, Any]:
        """Get voice settings based on emotion.
        
        Args:
            emotion: Emotion context
            
        Returns:
            Voice settings dictionary
        """
        emotion_settings = {
            "happy": {
                "stability": 0.7,
                "similarity_boost": 0.8,
                "style": 0.3,
                "use_speaker_boost": True
            },
            "sad": {
                "stability": 0.9,
                "similarity_boost": 0.6,
                "style": 0.1,
                "use_speaker_boost": False
            },
            "angry": {
                "stability": 0.6,
                "similarity_boost": 0.9,
                "style": 0.4,
                "use_speaker_boost": True
            },
            "surprised": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.5,
                "use_speaker_boost": True
            },
            "fearful": {
                "stability": 0.8,
                "similarity_boost": 0.7,
                "style": 0.2,
                "use_speaker_boost": False
            },
            "neutral": {
                "stability": 0.75,
                "similarity_boost": 0.75,
                "style": 0.25,
                "use_speaker_boost": True
            }
        }
        
        return emotion_settings.get(emotion.lower(), emotion_settings["neutral"])
    
    def _fallback_tts(self, text: str) -> Optional[bytes]:
        """Fallback TTS using system capabilities.
        
        Args:
            text: Text to convert to speech
            
        Returns:
            Audio data as bytes or None if failed
        """
        try:
            # This is a placeholder for system TTS
            # In a real implementation, you might use:
            # - macOS: `say` command
            # - Windows: SAPI
            # - Linux: espeak or festival
            
            logger.info(f"Using fallback TTS for: {text[:50]}...")
            
            # For now, return None to indicate TTS is not available
            return None
            
        except Exception as e:
            logger.error(f"Fallback TTS failed: {str(e)}")
            return None
    
    def process_audio_file(self, file_path: str) -> Optional[str]:
        """Process an audio file and return transcribed text.
        
        Args:
            file_path: Path to audio file
            
        Returns:
            Transcribed text or None if failed
        """
        try:
            with open(file_path, 'rb') as f:
                audio_data = f.read()
            
            # Determine format from file extension
            file_extension = Path(file_path).suffix.lower().lstrip('.')
            
            return self.transcribe_audio(audio_data, file_extension)
            
        except Exception as e:
            logger.error(f"Error processing audio file {file_path}: {str(e)}")
            return None
    
    def save_audio_to_cache(self, audio_data: bytes, filename: str) -> str:
        """Save audio data to cache directory.
        
        Args:
            audio_data: Audio data bytes
            filename: Filename for cached audio
            
        Returns:
            Path to cached audio file
        """
        try:
            cache_path = self.audio_cache_dir / filename
            with open(cache_path, 'wb') as f:
                f.write(audio_data)
            
            logger.debug(f"Saved audio to cache: {cache_path}")
            return str(cache_path)
            
        except Exception as e:
            logger.error(f"Error saving audio to cache: {str(e)}")
            return ""
    
    def cleanup_cache(self, max_age_hours: int = 24) -> int:
        """Clean up old cached audio files.
        
        Args:
            max_age_hours: Maximum age of files to keep in hours
            
        Returns:
            Number of files cleaned up
        """
        try:
            import time
            
            current_time = time.time()
            max_age_seconds = max_age_hours * 3600
            cleaned_count = 0
            
            for file_path in self.audio_cache_dir.glob("*"):
                if file_path.is_file():
                    file_age = current_time - file_path.stat().st_mtime
                    if file_age > max_age_seconds:
                        file_path.unlink()
                        cleaned_count += 1
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} old audio cache files")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up audio cache: {str(e)}")
            return 0
    
    def get_status(self) -> Dict[str, Any]:
        """Get voice processor status.
        
        Returns:
            Status dictionary with component availability
        """
        return {
            "whisper_available": self.whisper_model is not None,
            "whisper_model": self.whisper_model_name,
            "elevenlabs_available": self.elevenlabs_configured,
            "elevenlabs_voice": self.elevenlabs_voice,
            "audio_cache_dir": str(self.audio_cache_dir),
            "cache_files_count": len(list(self.audio_cache_dir.glob("*")))
        }
