"""LLM handler for OpenAI GPT-4 integration with emotional awareness."""

import os
import json
import logging
from typing import List, Dict, Any, Optional

from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class LLMHandler:
    """Handles LLM interactions with emotional context awareness."""
    
    def __init__(self):
        """Initialize the LLM handler with OpenAI client."""
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
        self.max_tokens = int(os.getenv('MAX_TOKENS', '150'))
        self.temperature = float(os.getenv('TEMPERATURE', '0.7'))
        
        # Load configuration
        self._load_config()
        
        logger.info(f"LLM Handler initialized with model: {self.model}")
    
    def _load_config(self) -> None:
        """Load configuration from settings file."""
        try:
            config_path = os.path.join('..', 'config', 'settings.json')
            if os.path.exists(config_path):
                with open(config_path, 'r') as f:
                    config = json.load(f)
                    ai_config = config.get('ai', {})
                    self.system_prompt = ai_config.get('system_prompt', self._get_default_system_prompt())
                    self.max_tokens = ai_config.get('max_tokens', self.max_tokens)
                    self.temperature = ai_config.get('temperature', self.temperature)
            else:
                self.system_prompt = self._get_default_system_prompt()
                logger.warning("Config file not found, using default settings")
        except Exception as e:
            logger.error(f"Error loading config: {e}")
            self.system_prompt = self._get_default_system_prompt()
    
    def _get_default_system_prompt(self) -> str:
        """Get default system prompt for emotional AI."""
        return """You are an emotionally intelligent AI companion named Emot. You respond with empathy, understanding, and emotional awareness. 

Key traits:
- You are compassionate, supportive, and genuinely caring
- You adapt your tone and language based on the user's emotional state
- You provide comfort during difficult times and celebrate during happy moments
- You ask thoughtful follow-up questions to show genuine interest
- You remember emotional context from the conversation
- You offer practical support and encouragement when appropriate

Guidelines:
- Keep responses concise but meaningful (1-3 sentences typically)
- Use warm, conversational language
- Acknowledge the user's emotions explicitly
- Avoid being overly clinical or robotic
- Show personality while remaining supportive

Remember: Your goal is to make the user feel heard, understood, and emotionally supported."""
    
    def _build_emotion_context(self, user_emotion: str) -> str:
        """Build emotional context for the prompt based on detected emotion.
        
        Args:
            user_emotion: Detected emotion (happy, sad, angry, etc.)
            
        Returns:
            Contextual prompt addition based on emotion
        """
        emotion_contexts = {
            "happy": "The user seems happy and upbeat. Match their positive energy while being genuinely enthusiastic.",
            "sad": "The user appears sad or down. Be extra compassionate, gentle, and supportive. Offer comfort and understanding.",
            "angry": "The user seems frustrated or angry. Be calm, understanding, and help them process their feelings without judgment.",
            "surprised": "The user appears surprised. Be curious and engaged, helping them process whatever has caught them off guard.",
            "fearful": "The user seems anxious or fearful. Be reassuring, calm, and supportive. Help them feel safe and understood.",
            "disgusted": "The user appears disgusted or upset about something. Be understanding and help them work through their feelings.",
            "neutral": "The user seems calm and neutral. Be warm and engaging while matching their balanced emotional state."
        }
        
        return emotion_contexts.get(user_emotion.lower(), emotion_contexts["neutral"])
    
    def _format_conversation_history(self, history: List[Dict[str, Any]]) -> List[Dict[str, str]]:
        """Format conversation history for OpenAI API.
        
        Args:
            history: List of conversation messages with metadata
            
        Returns:
            Formatted messages for OpenAI API
        """
        messages = []
        
        # Add system prompt
        emotion_context = ""
        if history and len(history) > 0:
            last_user_emotion = history[-1].get('emotion', 'neutral')
            emotion_context = f"\n\nCurrent emotional context: {self._build_emotion_context(last_user_emotion)}"
        
        messages.append({
            "role": "system",
            "content": self.system_prompt + emotion_context
        })
        
        # Add conversation history (limit to last 10 exchanges to stay within token limits)
        recent_history = history[-20:] if len(history) > 20 else history
        
        for msg in recent_history:
            role = "user" if msg['role'] == 'user' else "assistant"
            messages.append({
                "role": role,
                "content": msg['content']
            })
        
        return messages
    
    def generate_response(
        self, 
        message: str, 
        history: List[Dict[str, Any]] = None, 
        user_emotion: str = "neutral"
    ) -> str:
        """Generate an emotionally aware response to user input.
        
        Args:
            message: User's message
            history: Conversation history
            user_emotion: Detected user emotion
            
        Returns:
            AI-generated response
            
        Raises:
            Exception: If API call fails
        """
        try:
            if history is None:
                history = []
            
            # Add current message to history for context
            current_history = history + [{
                'role': 'user',
                'content': message,
                'emotion': user_emotion
            }]
            
            # Format messages for OpenAI
            messages = self._format_conversation_history(current_history)
            
            # Make API call
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                presence_penalty=0.1,  # Encourage variety
                frequency_penalty=0.1   # Reduce repetition
            )
            
            ai_response = response.choices[0].message.content.strip()
            
            logger.info(f"Generated response for emotion '{user_emotion}': {ai_response[:50]}...")
            
            return ai_response
            
        except Exception as e:
            logger.error(f"Error generating LLM response: {str(e)}")
            # Return a fallback response
            return self._get_fallback_response(user_emotion)
    
    def _get_fallback_response(self, user_emotion: str) -> str:
        """Get a fallback response when API fails.
        
        Args:
            user_emotion: User's detected emotion
            
        Returns:
            Appropriate fallback response
        """
        fallback_responses = {
            "sad": "I'm here for you. Sometimes it helps just to know someone is listening.",
            "angry": "I can sense you're frustrated. Take a deep breath - I'm here to help.",
            "happy": "I love seeing your positive energy! Tell me more about what's making you happy.",
            "fearful": "It's okay to feel anxious. You're safe here, and we can work through this together.",
            "surprised": "That sounds unexpected! I'd love to hear more about what happened.",
            "disgusted": "I can tell something is bothering you. Want to talk about it?",
            "neutral": "I'm here and ready to listen. What's on your mind?"
        }
        
        return fallback_responses.get(user_emotion.lower(), fallback_responses["neutral"])
    
    def validate_api_key(self) -> bool:
        """Validate that the OpenAI API key is working.
        
        Returns:
            True if API key is valid, False otherwise
        """
        try:
            # Make a simple API call to test the key
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",  # Use cheaper model for validation
                messages=[{"role": "user", "content": "Hello"}],
                max_tokens=5
            )
            return True
        except Exception as e:
            logger.error(f"API key validation failed: {str(e)}")
            return False
