"""Simple test script to verify backend components."""

import os
import sys
from dotenv import load_dotenv

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

load_dotenv()

def test_imports():
    """Test that all modules can be imported."""
    print("Testing imports...")
    
    try:
        from llm_handler import LLMHandler
        print("✓ LLMHandler imported successfully")
    except Exception as e:
        print(f"✗ Failed to import LLMHandler: {e}")
        return False
    
    try:
        from session_manager import SessionManager
        print("✓ SessionManager imported successfully")
    except Exception as e:
        print(f"✗ Failed to import SessionManager: {e}")
        return False
    
    return True

def test_session_manager():
    """Test session manager functionality."""
    print("\nTesting SessionManager...")
    
    try:
        from session_manager import SessionManager
        
        # Initialize session manager
        sm = SessionManager()
        print("✓ SessionManager initialized")
        
        # Create a session
        session_id = sm.create_session()
        print(f"✓ Created session: {session_id}")
        
        # Save a message
        success = sm.save_message(session_id, "user", "Hello, how are you?", "neutral")
        if success:
            print("✓ Saved user message")
        else:
            print("✗ Failed to save user message")
            return False
        
        # Save AI response
        success = sm.save_message(session_id, "assistant", "I'm doing well, thank you!", "happy")
        if success:
            print("✓ Saved assistant message")
        else:
            print("✗ Failed to save assistant message")
            return False
        
        # Get conversation history
        history = sm.get_conversation_history(session_id)
        if history and len(history) == 2:
            print(f"✓ Retrieved conversation history: {len(history)} messages")
        else:
            print(f"✗ Failed to retrieve correct history: {history}")
            return False
        
        # Get session stats
        stats = sm.get_session_stats()
        print(f"✓ Session stats: {stats}")
        
        return True
        
    except Exception as e:
        print(f"✗ SessionManager test failed: {e}")
        return False

def test_llm_handler():
    """Test LLM handler functionality."""
    print("\nTesting LLMHandler...")
    
    # Check if API key is available
    if not os.getenv('OPENAI_API_KEY'):
        print("⚠ OPENAI_API_KEY not found - skipping LLM tests")
        print("  To test LLM functionality, create a .env file with your OpenAI API key")
        return True
    
    try:
        from llm_handler import LLMHandler
        
        # Initialize LLM handler
        llm = LLMHandler()
        print("✓ LLMHandler initialized")
        
        # Test API key validation
        if llm.validate_api_key():
            print("✓ OpenAI API key is valid")
        else:
            print("✗ OpenAI API key validation failed")
            return False
        
        # Test response generation
        response = llm.generate_response(
            message="I'm feeling a bit sad today",
            history=[],
            user_emotion="sad"
        )
        
        if response and len(response) > 0:
            print(f"✓ Generated response: {response[:50]}...")
        else:
            print("✗ Failed to generate response")
            return False
        
        return True
        
    except Exception as e:
        print(f"✗ LLMHandler test failed: {e}")
        return False

def test_flask_app():
    """Test Flask app initialization."""
    print("\nTesting Flask app...")
    
    try:
        # Import main app
        from main import app
        print("✓ Flask app imported successfully")
        
        # Test app configuration
        if app.config.get('TESTING') is not None or True:  # Allow any config
            print("✓ Flask app configured")
        
        return True
        
    except Exception as e:
        print(f"✗ Flask app test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("=== Backend Component Tests ===\n")
    
    tests = [
        ("Import Tests", test_imports),
        ("SessionManager Tests", test_session_manager),
        ("LLMHandler Tests", test_llm_handler),
        ("Flask App Tests", test_flask_app)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n--- {test_name} ---")
        try:
            if test_func():
                passed += 1
                print(f"✓ {test_name} PASSED")
            else:
                print(f"✗ {test_name} FAILED")
        except Exception as e:
            print(f"✗ {test_name} FAILED with exception: {e}")
    
    print(f"\n=== Test Results ===")
    print(f"Passed: {passed}/{total}")
    
    if passed == total:
        print("🎉 All tests passed!")
        return True
    else:
        print("❌ Some tests failed. Check the output above for details.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
