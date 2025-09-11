// Configuration
const API_BASE_URL = 'http://localhost:5100/api/v1';

// Call States
const CALL_STATES = {
    IDLE: 'idle',
    GREETING: 'greeting',
    CTA_VISIBLE: 'cta_visible',
    CALL_STARTING: 'call_starting',
    CALL_ACTIVE: 'call_active',
    SPEAKING: 'speaking',
    LISTENING: 'listening'
};

// Global variables
let currentSessionId = null;
let isConnected = false;
let currentCallState = CALL_STATES.IDLE;
let audioContext = null;
let isRecording = false;
let isMuted = false;
let mediaRecorder = null;
let audioChunks = [];
let currentVolume = 0.8;

// Three.js variables for 3D avatar
let scene, camera, renderer, avatar;
let animationId = null;

// DOM elements
const avatarContainer = document.getElementById('avatar-container');
const avatarCanvas = document.getElementById('avatar-canvas');
const callStateOverlay = document.getElementById('call-state-overlay');
const aiGreeting = document.getElementById('ai-greeting');
const greetingStatus = document.getElementById('greeting-status');
const callInvitation = document.getElementById('call-invitation');
const enterCallBtn = document.getElementById('enter-call-btn');
const callStatus = document.getElementById('call-status');
const statusText = document.getElementById('status-text');
const callControls = document.getElementById('call-controls');
const transcriptContainer = document.getElementById('transcript-container');
const transcriptMessages = document.getElementById('transcript-messages');
const showTranscriptBtn = document.getElementById('show-transcript-btn');
const transcriptToggle = document.getElementById('transcript-toggle');
const muteBtn = document.getElementById('mute-btn');
const volumeBtn = document.getElementById('volume-btn');
const endCallBtn = document.getElementById('end-call-btn');
const connectionStatus = document.getElementById('connection-status');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const volumeModal = document.getElementById('volume-modal');
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const closeVolumeModal = document.getElementById('close-volume-modal');

// Hidden elements for voice processing
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    initializeThreeJS();
});

// Initialize the application
async function initializeApp() {
    updateConnectionStatus('connecting', 'Connecting to server...');
    setCallState(CALL_STATES.IDLE);
    
    try {
        // Check server health
        await checkServerHealth();
        
        // Create or restore session
        await initializeSession();
        
        updateConnectionStatus('connected', 'Connected');
        isConnected = true;
        
        // Start AI greeting sequence
        await startGreetingSequence();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        updateConnectionStatus('error', 'Connection failed');
        greetingStatus.textContent = 'Connection failed. Please check if the backend server is running.';
        greetingStatus.style.color = '#f44336';
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
        localStorage.setItem('emotionalai_session_id', currentSessionId);
    } else {
        throw new Error('Failed to create session');
    }
}

// Start AI greeting sequence
async function startGreetingSequence() {
    setCallState(CALL_STATES.GREETING);
    greetingStatus.textContent = 'Connected! Ready to chat.';
    greetingStatus.style.color = '#4CAF50';
    
    // Wait a moment, then show call invitation
    setTimeout(() => {
        setCallState(CALL_STATES.CTA_VISIBLE);
    }, 2000);
}

// Set call state and update UI
function setCallState(newState) {
    currentCallState = newState;
    
    switch (newState) {
        case CALL_STATES.IDLE:
            callStateOverlay.style.display = 'flex';
            aiGreeting.style.display = 'block';
            callInvitation.style.display = 'none';
            callStatus.style.display = 'none';
            callControls.style.display = 'none';
            transcriptContainer.style.display = 'none';
            break;
            
        case CALL_STATES.GREETING:
            callStateOverlay.style.display = 'flex';
            aiGreeting.style.display = 'block';
            callInvitation.style.display = 'none';
            break;
            
        case CALL_STATES.CTA_VISIBLE:
            callStateOverlay.style.display = 'flex';
            aiGreeting.style.display = 'block';
            callInvitation.style.display = 'block';
            break;
            
        case CALL_STATES.CALL_STARTING:
            showLoading(true, 'Starting call...');
            break;
            
        case CALL_STATES.CALL_ACTIVE:
            callStateOverlay.style.display = 'none';
            callStatus.style.display = 'block';
            callControls.style.display = 'block';
            showLoading(false);
            setCallStatus('listening', 'Listening...');
            break;
            
        case CALL_STATES.SPEAKING:
            setCallStatus('speaking', 'Speaking...');
            break;
            
        case CALL_STATES.LISTENING:
            setCallStatus('listening', 'Listening...');
            break;
    }
}

// Set call status indicator
function setCallStatus(type, text) {
    const statusDot = callStatus.querySelector('.status-dot');
    statusDot.className = `status-dot ${type}`;
    statusText.textContent = text;
}

// Setup event listeners
function setupEventListeners() {
    // Enter call button
    enterCallBtn.addEventListener('click', enterCall);
    
    // Call control buttons
    muteBtn.addEventListener('click', toggleMute);
    volumeBtn.addEventListener('click', showVolumeModal);
    showTranscriptBtn.addEventListener('click', toggleTranscript);
    endCallBtn.addEventListener('click', endCall);
    
    // Volume modal
    closeVolumeModal.addEventListener('click', hideVolumeModal);
    volumeSlider.addEventListener('input', updateVolume);
    
    // Transcript toggle
    transcriptToggle.addEventListener('click', toggleTranscript);
    
    // Voice input processing (hidden)
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // Initialize voice recording capability
    initializeVoiceRecording();
    
    // Handle window resize for Three.js
    window.addEventListener('resize', onWindowResize);
    
    // Handle page visibility change
    document.addEventListener('visibilitychange', function() {
        if (document.visibilityState === 'visible' && !isConnected) {
            initializeApp();
        }
    });
}

// Enter call mode
async function enterCall() {
    try {
        setCallState(CALL_STATES.CALL_STARTING);
        
        // Initialize WebAudio context (requires user gesture)
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }
        
        // Initialize microphone access
        await initializeMicrophone();
        
        // Start call mode
        setCallState(CALL_STATES.CALL_ACTIVE);
        
        console.log('Call started successfully');
        
    } catch (error) {
        console.error('Failed to enter call:', error);
        showError('Failed to start call. Please check microphone permissions.');
        setCallState(CALL_STATES.CTA_VISIBLE);
    }
}

// Initialize microphone access
async function initializeMicrophone() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            }
        });
        
        // Set up MediaRecorder for voice input
        mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm;codecs=opus'
        });
        
        mediaRecorder.ondataavailable = function(event) {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };
        
        mediaRecorder.onstop = function() {
            processVoiceInput();
        };
        
        // Start continuous listening
        startListening();
        
    } catch (error) {
        throw new Error('Microphone access denied or not available');
    }
}

// Start listening for voice input
function startListening() {
    if (!mediaRecorder || isMuted) return;
    
    audioChunks = [];
    mediaRecorder.start();
    isRecording = true;
    
    // Auto-stop after 10 seconds (can be adjusted)
    setTimeout(() => {
        if (isRecording) {
            stopListening();
        }
    }, 10000);
}

// Stop listening for voice input
function stopListening() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
    }
}

// Process voice input
async function processVoiceInput() {
    if (audioChunks.length === 0) return;
    
    try {
        setCallState(CALL_STATES.SPEAKING);
        showLoading(true, 'Processing voice...');
        
        // Create audio blob
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
        
        // Create form data for upload
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        // Send to transcription API
        const response = await fetch(`${API_BASE_URL}/voice/transcribe`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data.text && data.data.text.trim()) {
            // Process the transcribed text
            messageInput.value = data.data.text;
            await sendMessage();
        } else {
            // No speech detected, continue listening
            setCallState(CALL_STATES.LISTENING);
            showLoading(false);
            startListening();
        }
        
    } catch (error) {
        console.error('Error processing voice input:', error);
        showError('Failed to process voice input');
        setCallState(CALL_STATES.LISTENING);
        showLoading(false);
        startListening();
    }
}

// Send message to AI
async function sendMessage() {
    const message = messageInput.value.trim();
    if (!message || !isConnected) return;
    
    try {
        showLoading(true, 'AI is thinking...');
        
        // Add to transcript
        addToTranscript(message, 'user');
        
        // Clear input
        messageInput.value = '';
        
        // Send message to API
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                session_id: currentSessionId,
                emotion: 'neutral'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            // Add AI response to transcript
            addToTranscript(data.data.message, 'ai');
            
            // Synthesize speech
            await synthesizeSpeech(data.data.message);
            
            // Update session ID if it changed
            if (data.data.session_id && data.data.session_id !== currentSessionId) {
                currentSessionId = data.data.session_id;
                localStorage.setItem('emotionalai_session_id', currentSessionId);
            }
        } else {
            throw new Error(data.error?.message || 'Unknown error occurred');
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        showError('Failed to send message: ' + error.message);
        setCallState(CALL_STATES.LISTENING);
        showLoading(false);
        startListening();
    }
}

// Synthesize speech from text
async function synthesizeSpeech(text) {
    try {
        const response = await fetch(`${API_BASE_URL}/voice/synthesize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                voice: 'default',
                emotion: 'neutral'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data.audio_url) {
            // Play the synthesized audio
            await playAudio(data.data.audio_url);
        } else {
            throw new Error('Speech synthesis failed');
        }
        
    } catch (error) {
        console.error('Error synthesizing speech:', error);
        showError('Failed to synthesize speech');
    } finally {
        // Return to listening state
        setCallState(CALL_STATES.LISTENING);
        showLoading(false);
        startListening();
    }
}

// Play audio
async function playAudio(audioUrl) {
    return new Promise((resolve, reject) => {
        const audio = new Audio(audioUrl);
        audio.volume = currentVolume;
        
        audio.onended = () => {
            resolve();
        };
        
        audio.onerror = () => {
            reject(new Error('Audio playback failed'));
        };
        
        audio.play().catch(reject);
    });
}

// Add message to transcript
function addToTranscript(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `transcript-message ${sender}`;
    
    if (sender === 'user') {
        messageDiv.textContent = `You: ${message}`;
    } else {
        messageDiv.textContent = `AI: ${message}`;
    }
    
    transcriptMessages.appendChild(messageDiv);
    transcriptMessages.scrollTop = transcriptMessages.scrollHeight;
}

// Toggle mute
function toggleMute() {
    isMuted = !isMuted;
    
    if (isMuted) {
        muteBtn.classList.add('muted');
        muteBtn.querySelector('.control-icon').textContent = '🔇';
        muteBtn.querySelector('.control-label').textContent = 'Unmute';
        stopListening();
    } else {
        muteBtn.classList.remove('muted');
        muteBtn.querySelector('.control-icon').textContent = '🎤';
        muteBtn.querySelector('.control-label').textContent = 'Mute';
        if (currentCallState === CALL_STATES.LISTENING) {
            startListening();
        }
    }
}

// Show volume modal
function showVolumeModal() {
    volumeModal.style.display = 'flex';
    volumeSlider.value = currentVolume * 100;
    volumeValue.textContent = Math.round(currentVolume * 100) + '%';
}

// Hide volume modal
function hideVolumeModal() {
    volumeModal.style.display = 'none';
}

// Update volume
function updateVolume() {
    currentVolume = volumeSlider.value / 100;
    volumeValue.textContent = Math.round(currentVolume * 100) + '%';
}

// Toggle transcript
function toggleTranscript() {
    const isVisible = transcriptContainer.style.display !== 'none';
    
    if (isVisible) {
        transcriptContainer.style.display = 'none';
        showTranscriptBtn.querySelector('.control-label').textContent = 'Transcript';
        showTranscriptBtn.classList.remove('active');
    } else {
        transcriptContainer.style.display = 'block';
        showTranscriptBtn.querySelector('.control-label').textContent = 'Hide';
        showTranscriptBtn.classList.add('active');
    }
}

// End call
function endCall() {
    // Stop recording
    if (isRecording) {
        stopListening();
    }
    
    // Stop media tracks
    if (mediaRecorder && mediaRecorder.stream) {
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }
    
    // Reset state
    setCallState(CALL_STATES.CTA_VISIBLE);
    isMuted = false;
    muteBtn.classList.remove('muted');
    muteBtn.querySelector('.control-icon').textContent = '🎤';
    muteBtn.querySelector('.control-label').textContent = 'Mute';
    
    console.log('Call ended');
}

// Initialize Three.js for 3D avatar (placeholder for now)
function initializeThreeJS() {
    // For now, we'll skip Three.js initialization to avoid CDN issues
    // This will be replaced with proper 3D avatar rendering later
    console.log('3D Avatar system initialized (placeholder mode)');
    
    // Hide the canvas since we're not using it yet
    avatarCanvas.style.display = 'none';
}

// Placeholder functions for Three.js compatibility
function createPlaceholderAvatar() {
    // Placeholder - will be implemented with proper 3D avatar
}

function animate() {
    // Placeholder - will be implemented with proper 3D avatar
}

function onWindowResize() {
    // Placeholder - will be implemented with proper 3D avatar
}

// Initialize voice recording capability
async function initializeVoiceRecording() {
    try {
        // Check if browser supports MediaRecorder
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn('Voice recording not supported in this browser');
            return;
        }
        
        console.log('Voice recording capability initialized');
        
    } catch (error) {
        console.warn('Voice recording initialization failed:', error);
    }
}

// Update connection status
function updateConnectionStatus(status, message) {
    const statusDot = connectionStatus.querySelector('.status-dot');
    const statusText = connectionStatus.querySelector('.status-text');
    
    statusDot.className = `status-dot ${status}`;
    statusText.textContent = message;
}

// Show/hide loading overlay
function showLoading(show, message = 'AI is thinking...') {
    if (show) {
        loadingText.textContent = message;
        loadingOverlay.classList.add('show');
    } else {
        loadingOverlay.classList.remove('show');
    }
}

// Show error message
function showError(message) {
    console.error('Error:', message);
    updateConnectionStatus('error', 'Error occurred');
    
    // Reset status after 3 seconds
    setTimeout(() => {
        if (isConnected) {
            updateConnectionStatus('connected', 'Connected');
        }
    }, 3000);
}

// Handle page beforeunload
window.addEventListener('beforeunload', function() {
    // Stop any ongoing recording
    if (isRecording) {
        stopListening();
    }
    
    // Stop animation loop
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});
