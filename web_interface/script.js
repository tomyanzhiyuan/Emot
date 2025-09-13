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
            startSpeakingAnimation();
            break;
            
        case CALL_STATES.LISTENING:
            setCallStatus('listening', 'Listening...');
            startListeningAnimation();
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

// Initialize Three.js for 3D avatar
function initializeThreeJS() {
    try {
        // Scene setup
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1e3c72);
        
        // Camera setup
        camera = new THREE.PerspectiveCamera(
            50, 
            avatarContainer.clientWidth / avatarContainer.clientHeight, 
            0.1, 
            1000
        );
        camera.position.set(0, 1.6, 3);
        
        // Renderer setup
        renderer = new THREE.WebGLRenderer({ 
            canvas: avatarCanvas,
            antialias: true,
            alpha: true
        });
        renderer.setSize(avatarContainer.clientWidth, avatarContainer.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        
        // Lighting setup
        setupLighting();
        
        // Create avatar
        createAvatar();
        
        // Start render loop
        animate();
        
        // Show the canvas
        avatarCanvas.style.display = 'block';
        
        console.log('3D Avatar system initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize 3D Avatar system:', error);
        // Fallback to placeholder mode
        avatarCanvas.style.display = 'none';
    }
}

// Setup lighting for the 3D scene
function setupLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Main directional light (key light)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 4, 3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -10;
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    scene.add(directionalLight);
    
    // Fill light (softer, from the side)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-2, 2, 1);
    scene.add(fillLight);
    
    // Rim light (from behind, for depth)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 2, -3);
    scene.add(rimLight);
}

// Create 3D avatar
function createAvatar() {
    // Create avatar group
    avatar = new THREE.Group();
    
    // Create stylized humanoid avatar
    createAvatarHead();
    createAvatarBody();
    createAvatarArms();
    
    // Position avatar
    avatar.position.y = -0.5;
    scene.add(avatar);
    
    console.log('3D Avatar created successfully');
}

// Create avatar head with facial features
function createAvatarHead() {
    const headGroup = new THREE.Group();
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.35, 32, 32);
    const headMaterial = new THREE.MeshLambertMaterial({ 
        color: 0xffdbac,
        transparent: true,
        opacity: 0.95
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.7;
    head.castShadow = true;
    head.receiveShadow = true;
    headGroup.add(head);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(0.06, 16, 16);
    const eyeMaterial = new THREE.MeshLambertMaterial({ color: 0x2c3e50 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.12, 1.75, 0.28);
    headGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.12, 1.75, 0.28);
    headGroup.add(rightEye);
    
    // Eye pupils
    const pupilGeometry = new THREE.SphereGeometry(0.03, 12, 12);
    const pupilMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
    
    const leftPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    leftPupil.position.set(-0.12, 1.75, 0.32);
    headGroup.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeometry, pupilMaterial);
    rightPupil.position.set(0.12, 1.75, 0.32);
    headGroup.add(rightPupil);
    
    // Mouth (for lip-sync)
    const mouthGeometry = new THREE.SphereGeometry(0.08, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    const mouthMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const mouth = new THREE.Mesh(mouthGeometry, mouthMaterial);
    mouth.position.set(0, 1.6, 0.3);
    mouth.rotation.x = Math.PI;
    headGroup.add(mouth);
    
    // Store references for animation
    headGroup.userData = {
        head: head,
        leftEye: leftEye,
        rightEye: rightEye,
        leftPupil: leftPupil,
        rightPupil: rightPupil,
        mouth: mouth
    };
    
    avatar.add(headGroup);
    avatar.userData.head = headGroup;
}

// Create avatar body
function createAvatarBody() {
    // Torso
    const torsoGeometry = new THREE.CylinderGeometry(0.35, 0.4, 1.2, 12);
    const torsoMaterial = new THREE.MeshLambertMaterial({ color: 0x4a90e2 });
    const torso = new THREE.Mesh(torsoGeometry, torsoMaterial);
    torso.position.y = 0.8;
    torso.castShadow = true;
    torso.receiveShadow = true;
    avatar.add(torso);
    
    avatar.userData.torso = torso;
}

// Create avatar arms
function createAvatarArms() {
    // Left arm
    const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.8, 8);
    const armMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.5, 1.0, 0);
    leftArm.rotation.z = Math.PI * 0.2;
    leftArm.castShadow = true;
    avatar.add(leftArm);
    
    // Right arm
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.5, 1.0, 0);
    rightArm.rotation.z = -Math.PI * 0.2;
    rightArm.castShadow = true;
    avatar.add(rightArm);
    
    avatar.userData.leftArm = leftArm;
    avatar.userData.rightArm = rightArm;
}

// Animation loop
function animate() {
    animationId = requestAnimationFrame(animate);
    
    if (avatar) {
        // Idle breathing animation
        const time = Date.now() * 0.001;
        const breathingIntensity = 0.02;
        
        // Breathing motion
        if (avatar.userData.torso) {
            avatar.userData.torso.scale.y = 1 + Math.sin(time * 2) * breathingIntensity;
        }
        
        // Subtle head movement
        if (avatar.userData.head) {
            avatar.userData.head.rotation.y = Math.sin(time * 0.5) * 0.1;
            avatar.userData.head.position.y = 1.7 + Math.sin(time * 2) * 0.01;
        }
        
        // Eye blinking
        if (avatar.userData.head && avatar.userData.head.userData) {
            const blinkTime = time * 3;
            const blinkPhase = Math.sin(blinkTime) > 0.95 ? 1 : 0;
            
            if (avatar.userData.head.userData.leftEye) {
                avatar.userData.head.userData.leftEye.scale.y = 1 - blinkPhase * 0.8;
                avatar.userData.head.userData.rightEye.scale.y = 1 - blinkPhase * 0.8;
            }
        }
        
        // Gentle swaying
        avatar.rotation.y = Math.sin(time * 0.3) * 0.05;
        avatar.position.y = -0.5 + Math.sin(time * 1.5) * 0.02;
    }
    
    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

// Handle window resize
function onWindowResize() {
    if (camera && renderer && avatarContainer) {
        const width = avatarContainer.clientWidth;
        const height = avatarContainer.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
}

// Avatar speaking animation (for lip-sync)
function startSpeakingAnimation() {
    if (avatar && avatar.userData.head && avatar.userData.head.userData.mouth) {
        const mouth = avatar.userData.head.userData.mouth;
        
        // Simple mouth opening animation
        const speakingAnimation = () => {
            if (currentCallState === CALL_STATES.SPEAKING) {
                const time = Date.now() * 0.01;
                mouth.scale.y = 1 + Math.sin(time) * 0.3;
                mouth.scale.x = 1 + Math.sin(time * 1.2) * 0.2;
                requestAnimationFrame(speakingAnimation);
            } else {
                // Return to normal
                mouth.scale.y = 1;
                mouth.scale.x = 1;
            }
        };
        
        speakingAnimation();
    }
}

// Avatar listening animation
function startListeningAnimation() {
    if (avatar && avatar.userData.head) {
        // Subtle head tilt to show attentiveness
        const head = avatar.userData.head;
        head.rotation.z = Math.sin(Date.now() * 0.001) * 0.05;
    }
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
