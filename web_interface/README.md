# Emotional AI Chatbot - Web Interface

A beautiful, responsive web interface for chatting with your Emotional AI companion.

## 🚀 Quick Start

### Prerequisites
- Your Flask backend server must be running on `localhost:5001`
- Make sure you have a valid OpenAI API key configured in your `.env` file

### How to Use

1. **Start the Backend Server**
   ```bash
   cd backend
   conda activate emotional_ai
   python main.py
   ```
   
   Make sure you see: `Running on http://localhost:5001`

2. **Open the Web Interface**
   - Simply open `index.html` in your web browser
   - Or use a local server (recommended):
     ```bash
     cd web_interface
     python -m http.server 8000
     ```
     Then visit: `http://localhost:8000`

## 🎯 Features

### 💬 **Chat Interface**
- Clean, modern chat interface
- Real-time messaging with your AI companion
- Message history with timestamps
- Character counter (500 character limit)

### 😊 **Emotion Selection**
- Choose your current emotion from the dropdown
- Available emotions: Neutral, Happy, Sad, Angry, Surprised, Fearful, Disgusted
- AI adapts its responses based on your selected emotion

### 🔄 **Session Management**
- Automatic session creation and persistence
- Conversation history saved across browser sessions
- Session ID displayed for reference

### 📱 **Responsive Design**
- Works on desktop, tablet, and mobile devices
- Touch-friendly interface
- Smooth animations and transitions

### 🔌 **Connection Status**
- Real-time connection status indicator
- Automatic reconnection attempts
- Error handling and user feedback

## 🎨 Interface Elements

### **Emotion Selector**
Use the dropdown at the top to select your current emotional state:
- **😐 Neutral**: Balanced, everyday conversation
- **😊 Happy**: Celebratory, enthusiastic responses
- **😢 Sad**: Compassionate, supportive responses
- **😠 Angry**: Calm, understanding responses
- **😲 Surprised**: Curious, engaged responses
- **😰 Fearful**: Reassuring, comforting responses
- **🤢 Disgusted**: Understanding, helpful responses

### **Chat Messages**
- **Your messages**: Appear on the right with blue gradient background
- **AI messages**: Appear on the left with light gray background
- **Timestamps**: Show when each message was sent
- **Auto-scroll**: Automatically scrolls to show latest messages

### **Input Area**
- **Text input**: Type your message (up to 500 characters)
- **Send button**: Click or press Enter to send
- **Character counter**: Shows remaining characters
- **Session info**: Displays current session ID

### **Status Bar**
- **Green dot**: Connected and ready
- **Yellow dot**: Connecting to server
- **Red dot**: Connection error

## 🔧 Technical Details

### **API Integration**
- Connects to Flask backend at `http://localhost:5001/api/v1`
- Uses REST API for all communication
- Handles errors gracefully with fallback messages

### **Session Persistence**
- Session IDs stored in browser's localStorage
- Conversation history automatically restored
- Works across browser tabs and sessions

### **Error Handling**
- Network error detection and user notification
- Automatic retry mechanisms
- Graceful degradation when server is unavailable

## 🎯 Usage Examples

### **Basic Conversation**
1. Select "😐 Neutral" emotion
2. Type: "Hello, how are you today?"
3. AI responds with a balanced, friendly greeting

### **Emotional Context**
1. Select "😢 Sad" emotion
2. Type: "I'm having a really difficult day"
3. AI responds with empathy and support

### **Happy Interaction**
1. Select "😊 Happy" emotion
2. Type: "I just got a promotion at work!"
3. AI responds with enthusiasm and celebration

## 🐛 Troubleshooting

### **"Connection Failed" Error**
- Make sure your Flask backend is running on port 5001
- Check that your `.env` file has a valid `OPENAI_API_KEY`
- Verify the backend shows "Connected to server" status

### **Messages Not Sending**
- Check browser console for error messages
- Ensure you have an internet connection
- Try refreshing the page to reconnect

### **Blank Responses**
- This usually indicates an API key issue
- Check your OpenAI API key is valid and has credits
- Look at the backend terminal for error messages

### **Session Not Restoring**
- Clear browser localStorage and create a new session
- Check if the backend database is accessible
- Restart both frontend and backend

## 🎨 Customization

### **Changing Colors**
Edit `style.css` to modify the color scheme:
- Main gradient: `.container` background
- Message colors: `.user-message` and `.ai-message` backgrounds
- Button colors: `#send-button` background

### **Adding Features**
The JavaScript is modular and easy to extend:
- Add new emotion types in `emotionSelect` options
- Modify API endpoints in `API_BASE_URL`
- Add new UI elements by extending the HTML structure

## 📱 Mobile Usage

The interface is fully responsive and works great on mobile:
- Touch-friendly buttons and inputs
- Optimized layout for small screens
- Swipe-friendly message scrolling
- Mobile keyboard support

## 🔐 Privacy & Security

- All conversations are stored locally in your browser
- Session data is saved on your local backend server
- No data is sent to third parties except OpenAI for AI responses
- Clear browser data to remove conversation history

---

**Enjoy chatting with your Emotional AI companion!** 🤖💬
