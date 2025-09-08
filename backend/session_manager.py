"""Session manager for handling conversation persistence and memory."""

import os
import json
import uuid
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pathlib import Path

from sqlalchemy import create_engine, Column, String, DateTime, Text, Integer
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

Base = declarative_base()


class ConversationMessage(Base):
    """Database model for conversation messages."""
    
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(36), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    emotion = Column(String(20), nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class SessionManager:
    """Manages conversation sessions and message persistence."""
    
    def __init__(self):
        """Initialize the session manager with database connection."""
        self.sessions_dir = Path("../data/sessions")
        self.sessions_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self._init_database()
        
        # Configuration
        self.max_history = 50  # Maximum messages to keep in memory
        self.session_timeout = 3600  # 1 hour in seconds
        self.cleanup_interval = 300  # 5 minutes
        
        logger.info("Session Manager initialized")
    
    def _init_database(self) -> None:
        """Initialize SQLite database for session storage."""
        try:
            # Use SQLite database in data directory
            db_path = self.sessions_dir / "conversations.db"
            database_url = f"sqlite:///{db_path}"
            
            self.engine = create_engine(
                database_url,
                echo=False,  # Set to True for SQL debugging
                pool_pre_ping=True
            )
            
            # Create tables
            Base.metadata.create_all(self.engine)
            
            # Create session factory
            self.SessionLocal = sessionmaker(
                autocommit=False,
                autoflush=False,
                bind=self.engine
            )
            
            logger.info(f"Database initialized at {db_path}")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {str(e)}")
            # Fallback to file-based storage
            self._use_file_storage = True
    
    def create_session(self) -> str:
        """Create a new conversation session.
        
        Returns:
            New session ID
        """
        session_id = str(uuid.uuid4())
        
        # Create session metadata file
        session_metadata = {
            "session_id": session_id,
            "created_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
            "message_count": 0
        }
        
        try:
            metadata_file = self.sessions_dir / f"{session_id}_metadata.json"
            with open(metadata_file, 'w') as f:
                json.dump(session_metadata, f, indent=2)
            
            logger.info(f"Created new session: {session_id}")
            return session_id
            
        except Exception as e:
            logger.error(f"Error creating session {session_id}: {str(e)}")
            return session_id  # Return ID even if metadata save fails
    
    def save_message(
        self, 
        session_id: str, 
        role: str, 
        content: str, 
        emotion: str = None
    ) -> bool:
        """Save a message to the conversation history.
        
        Args:
            session_id: Session identifier
            role: Message role ('user' or 'assistant')
            content: Message content
            emotion: Detected emotion (optional)
            
        Returns:
            True if saved successfully, False otherwise
        """
        try:
            # Save to database
            db_session = self.SessionLocal()
            
            message = ConversationMessage(
                session_id=session_id,
                role=role,
                content=content,
                emotion=emotion,
                timestamp=datetime.utcnow()
            )
            
            db_session.add(message)
            db_session.commit()
            db_session.close()
            
            # Update session metadata
            self._update_session_metadata(session_id)
            
            logger.debug(f"Saved message for session {session_id}: {role}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving message for session {session_id}: {str(e)}")
            # Fallback to file storage
            return self._save_message_to_file(session_id, role, content, emotion)
    
    def _save_message_to_file(
        self, 
        session_id: str, 
        role: str, 
        content: str, 
        emotion: str = None
    ) -> bool:
        """Fallback method to save message to file.
        
        Args:
            session_id: Session identifier
            role: Message role
            content: Message content
            emotion: Detected emotion
            
        Returns:
            True if saved successfully
        """
        try:
            messages_file = self.sessions_dir / f"{session_id}_messages.json"
            
            # Load existing messages
            messages = []
            if messages_file.exists():
                with open(messages_file, 'r') as f:
                    messages = json.load(f)
            
            # Add new message
            message = {
                "role": role,
                "content": content,
                "emotion": emotion,
                "timestamp": datetime.utcnow().isoformat()
            }
            messages.append(message)
            
            # Keep only recent messages
            if len(messages) > self.max_history:
                messages = messages[-self.max_history:]
            
            # Save back to file
            with open(messages_file, 'w') as f:
                json.dump(messages, f, indent=2)
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving message to file: {str(e)}")
            return False
    
    def get_conversation_history(self, session_id: str) -> Optional[List[Dict[str, Any]]]:
        """Get conversation history for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of conversation messages or None if session not found
        """
        try:
            # Try database first
            db_session = self.SessionLocal()
            
            messages = db_session.query(ConversationMessage)\
                .filter(ConversationMessage.session_id == session_id)\
                .order_by(ConversationMessage.timestamp)\
                .limit(self.max_history)\
                .all()
            
            db_session.close()
            
            if messages:
                history = []
                for msg in messages:
                    history.append({
                        "role": msg.role,
                        "content": msg.content,
                        "emotion": msg.emotion,
                        "timestamp": msg.timestamp.isoformat()
                    })
                
                logger.debug(f"Retrieved {len(history)} messages for session {session_id}")
                return history
            
            # Fallback to file storage
            return self._get_history_from_file(session_id)
            
        except Exception as e:
            logger.error(f"Error retrieving history for session {session_id}: {str(e)}")
            return self._get_history_from_file(session_id)
    
    def _get_history_from_file(self, session_id: str) -> Optional[List[Dict[str, Any]]]:
        """Fallback method to get history from file.
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of messages or None if not found
        """
        try:
            messages_file = self.sessions_dir / f"{session_id}_messages.json"
            
            if not messages_file.exists():
                return []
            
            with open(messages_file, 'r') as f:
                messages = json.load(f)
            
            return messages
            
        except Exception as e:
            logger.error(f"Error reading messages from file: {str(e)}")
            return None
    
    def _update_session_metadata(self, session_id: str) -> None:
        """Update session metadata with last activity.
        
        Args:
            session_id: Session identifier
        """
        try:
            metadata_file = self.sessions_dir / f"{session_id}_metadata.json"
            
            if metadata_file.exists():
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
                
                metadata["last_activity"] = datetime.utcnow().isoformat()
                metadata["message_count"] = metadata.get("message_count", 0) + 1
                
                with open(metadata_file, 'w') as f:
                    json.dump(metadata, f, indent=2)
            
        except Exception as e:
            logger.error(f"Error updating session metadata: {str(e)}")
    
    def cleanup_old_sessions(self) -> int:
        """Clean up old inactive sessions.
        
        Returns:
            Number of sessions cleaned up
        """
        cleaned_count = 0
        cutoff_time = datetime.utcnow() - timedelta(seconds=self.session_timeout)
        
        try:
            # Clean up database entries
            db_session = self.SessionLocal()
            
            old_messages = db_session.query(ConversationMessage)\
                .filter(ConversationMessage.timestamp < cutoff_time)\
                .all()
            
            for message in old_messages:
                db_session.delete(message)
            
            db_session.commit()
            db_session.close()
            
            # Clean up files
            for metadata_file in self.sessions_dir.glob("*_metadata.json"):
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    last_activity = datetime.fromisoformat(metadata["last_activity"])
                    
                    if last_activity < cutoff_time:
                        session_id = metadata["session_id"]
                        
                        # Remove metadata file
                        metadata_file.unlink()
                        
                        # Remove messages file
                        messages_file = self.sessions_dir / f"{session_id}_messages.json"
                        if messages_file.exists():
                            messages_file.unlink()
                        
                        cleaned_count += 1
                        logger.info(f"Cleaned up old session: {session_id}")
                
                except Exception as e:
                    logger.error(f"Error cleaning up session file {metadata_file}: {str(e)}")
            
            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} old sessions")
            
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error during session cleanup: {str(e)}")
            return 0
    
    def get_session_stats(self) -> Dict[str, Any]:
        """Get statistics about active sessions.
        
        Returns:
            Dictionary with session statistics
        """
        try:
            stats = {
                "total_sessions": 0,
                "active_sessions": 0,
                "total_messages": 0,
                "oldest_session": None,
                "newest_session": None
            }
            
            # Count database messages
            db_session = self.SessionLocal()
            
            total_messages = db_session.query(ConversationMessage).count()
            unique_sessions = db_session.query(ConversationMessage.session_id).distinct().count()
            
            db_session.close()
            
            stats["total_messages"] = total_messages
            stats["total_sessions"] = unique_sessions
            
            # Count file-based sessions
            metadata_files = list(self.sessions_dir.glob("*_metadata.json"))
            cutoff_time = datetime.utcnow() - timedelta(seconds=self.session_timeout)
            
            active_count = 0
            oldest_time = None
            newest_time = None
            
            for metadata_file in metadata_files:
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                    
                    created_at = datetime.fromisoformat(metadata["created_at"])
                    last_activity = datetime.fromisoformat(metadata["last_activity"])
                    
                    # Count active sessions
                    if last_activity > cutoff_time:
                        active_count += 1
                    
                    # Track oldest and newest
                    if oldest_time is None or created_at < oldest_time:
                        oldest_time = created_at
                    
                    if newest_time is None or created_at > newest_time:
                        newest_time = created_at
                
                except Exception as e:
                    logger.error(f"Error reading metadata file {metadata_file}: {str(e)}")
            
            stats["active_sessions"] = active_count
            stats["total_sessions"] = max(stats["total_sessions"], len(metadata_files))
            
            if oldest_time:
                stats["oldest_session"] = oldest_time.isoformat()
            if newest_time:
                stats["newest_session"] = newest_time.isoformat()
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting session stats: {str(e)}")
            return {
                "total_sessions": 0,
                "active_sessions": 0,
                "total_messages": 0,
                "error": str(e)
            }
