// Configuration
const API_BASE_URL = 'http://localhost:5100/api/v1';

// Global variables
let currentSessionId = null;
let isConnected = false;

// DOM elements
const chatMessages = document.getElementById('chat-messages');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const charCount = document.getElementById('char-count');
const sessionIdSpan = document.getElementById('session-id');
const connectionStatus = document.getElementById('connection-status');
const loadingOverlay = document.getElementById('loading-overlay');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Initialize the application
async function initializeApp() {
    updateConnectionStatus('connecting', 'Connecting to server...');
    
    try {
        // Check server health
        await checkServerHealth();
        
        // Create or restore session
        await initializeSession();
        
        updateConnectionStatus('connected', 'Connected to server');
        isConnected = true;
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        updateConnectionStatus('error', 'Connection failed');
        showError('Failed to connect to the AI server. Please make sure the backend is running on port 5001.');
    }
}

// Check if the server is healthy
async function checkServerHealth() {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
        throw new Error('Server health check failed');
    }
    return response.json();
}

// Initialize or restore session
async function initializeSession() {
    // Try to restore session from localStorage
    const savedSessionId = localStorage.getItem('emotionalai_session_id');
    
    if (savedSessionId) {
        try {
            // Verify the session still exists
            const response = await fetch(`${API_BASE_URL}/sessions/${savedSessionId}`);
            if (response.ok) {
                currentSessionId = savedSessionId;
                sessionIdSpan.textContent = currentSessionId.substring(0, 8) + '...';
                
                // Load conversation history
                const data = await response.json();
                if (data.success && data.data.history) {
                    loadConversationHistory(data.data.history);
                }
                return;
            }
        } catch (error) {
            console.log('Failed to restore session, creating new one');
        }
    }
    
    // Create new session
    const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (!response.ok) {
        throw new Error('Failed to create session');
    }
    
    const data = await response.json();
    if (data.success) {
        currentSessionId = data.data.session_id;
        sessionIdSpan.textContent = currentSessionId.substring(0, 8) + '...';
        localStorage.setItem('emotionalai_session_id', currentSessionId);
    } else {
        throw new Error('Failed to create session');
    }
}

// Load conversation history
function loadConversationHistory(history) {
    // Clear existing messages except the welcome message
    const welcomeMessage = chatMessages.querySelector('.ai-message');
    chatMessages.innerHTML = '';
    if (welcomeMessage) {
        chatMessages.appendChild(welcomeMessage);
    }
    
    // Add historical messages
    history.forEach(message => {
        if (message.role === 'user') {
            addMessage(message.content, 'user', new Date(message.timestamp));
        } else if (message.role === 'assistant') {
            addMessage(message.content, 'ai', new Date(message.timestamp));
        }
    });
    
    scrollToBottom();
}

// Setup event listeners
function setupEventListeners() {
    // Send button click
    sendButton.addEventListener('click', sendMessage);
    
    // Enter key press
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Character count
    messageInput.addEventListener('input', function() {
        const count = this.value.length;
        charCount.textContent = `${count}/500`;
        
        if (count > 450) {
            charCount.style.color = '#dc3545';
        } else if (count > 400) {
            charCount.style.color = '#ffc107';
        } else {
            charCount.style.color = '#6c757d';
        }
    });
    
}

// Send message to the AI
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !isConnected) return;
    
    const emotion = emotionSelect.value;
    
    // Disable input while processing
    setInputEnabled(false);
    showLoading(true);
    
    // Add user message to chat
    addMessage(message, 'user');
    messageInput.value = '';
    charCount.textContent = '0/500';
    charCount.style.color = '#6c757d';
    
    try {
        // Send message to API
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                session_id: currentSessionId,
                emotion: emotion
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Add AI response to chat
            addMessage(data.data.message, 'ai');
            
            // Update session ID if it changed
            if (data.data.session_id && data.data.session_id !== currentSessionId) {
                currentSessionId = data.data.session_id;
                sessionIdSpan.textContent = currentSessionId.substring(0, 8) + '...';
                localStorage.setItem('emotionalai_session_id', currentSessionId);
            }
        } else {
            throw new Error(data.error?.message || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        addMessage('Sorry, I encountered an error while processing your message. Please try again.', 'ai', null, true);
        showError('Failed to send message: ' + error.message);
    } finally {
        setInputEnabled(true);
        showLoading(false);
        messageInput.focus();
    }
}

// Add message to chat
function addMessage(content, sender, timestamp = null, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    
    if (sender === 'ai') {
        messageContent.innerHTML = `<strong>Emot:</strong> ${content}`;
        if (isError) {
            messageContent.style.color = '#dc3545';
        }
    } else {
        messageContent.innerHTML = `<strong>You:</strong> ${content}`;
    }
    
    const messageTime = document.createElement('div');
    messageTime.className = 'message-time';
    messageTime.textContent = timestamp ? formatTime(timestamp) : formatTime(new Date());
    
    messageDiv.appendChild(messageContent);
    messageDiv.appendChild(messageTime);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Format timestamp
function formatTime(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Scroll to bottom of chat
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Update connection status
function updateConnectionStatus(status, message) {
    const statusDot = connectionStatus.querySelector('.status-dot');
    const statusText = connectionStatus.querySelector('.status-text');
    
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = message;
}

// Enable/disable input
function setInputEnabled(enabled) {
    messageInput.disabled = !enabled;
    sendButton.disabled = !enabled;
    emotionSelect.disabled = !enabled;
}

// Show/hide loading overlay
function showLoading(show) {
    if (show) {
        loadingOverlay.classList.add('show');
    } else {
        loadingOverlay.classList.remove('show');
    }
}

// Show error message
function showError(message) {
    // You could implement a toast notification here
    console.error('Error:', message);
    
    // For now, just update the connection status
    updateConnectionStatus('error', 'Error occurred');
    
    // Reset status after 3 seconds
    setTimeout(() => {
        if (isConnected) {
            updateConnectionStatus('connected', 'Connected to server');
        }
    }, 3000);
}

// Utility function to get emotion emoji
function getEmotionEmoji(emotion) {
    const emojiMap = {
        'neutral': '😐',
        'happy': '😊',
        'sad': '😢',
        'angry': '😠',
        'surprised': '😲',
        'fearful': '😰',
        'disgusted': '🤢'
    };
    return emojiMap[emotion] || '😐';
}

// Handle page visibility change (pause/resume functionality)
document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && !isConnected) {
        // Try to reconnect when page becomes visible
        initializeApp();
    }
});

// Handle window beforeunload (save state)
window.addEventListener('beforeunload', function() {
    // Session ID is already saved in localStorage
    // Could save other state here if needed
});
