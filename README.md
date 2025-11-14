# PTT System - Push-to-Talk for Dispatch & Drivers

A lightweight, WebRTC-based push-to-talk system designed for dispatch and bus drivers. Built with minimal dependencies using vanilla JavaScript and Web Workers.

## Quick Start

```bash
# Clone and install
git clone <your-repo-url> ptt-system
cd ptt-system
npm install

# Start the server
npm start
# Or with auto-restart during development:
npm run dev

# Open in browser
open http://localhost:3000
```

Open multiple browser windows/tabs and log in with different usernames to see real-time presence in action!

### 🎤 Testing PTT Audio

**Quick 2-Minute Test:**

1. Open **two browser windows** (or tabs)
2. Login as `driver1` in first window
3. Login as `dispatch` in second window
4. **Allow microphone access** when prompted in both
5. Wait for "Microphone ready" status (green)
6. **In window 1**: Hold down the blue PTT button and speak
7. **In window 2**: You should hear the audio!

**What to expect:**
- PTT button lights up bright cyan when pressed
- Status shows "Transmitting..." on sender
- Status shows "Receiving from [user]" on receiver
- Clear audio with <200ms latency
- Works on mobile with touch (tap and hold)

See **[TESTING_GUIDE.md](TESTING_GUIDE.md)** for comprehensive testing scenarios.

## Features

### ✅ Fully Implemented & Working
- ✅ **Simple Authentication** - Username-based login with automatic registration
- ✅ **File-based User Storage** - No database required, users stored as JSON files
- ✅ **Real-time Presence** - See who's online in real-time
- ✅ **Heartbeat System** - Automatic connection health monitoring
- ✅ **Status Management** - Online, Busy, Away status indicators
- ✅ **WebSocket Worker** - All network communication in separate thread
- ✅ **Responsive UI** - Works on desktop, tablet, and mobile
- ✅ **Auto-reconnection** - Automatically reconnects if connection drops
- ✅ **WebRTC P2P Audio** - Direct peer-to-peer audio streaming **[NEW!]**
- ✅ **PTT Functionality** - Push-to-talk audio transmission **[NEW!]**
- ✅ **Group Broadcasting** - Send audio to multiple users simultaneously **[NEW!]**
- ✅ **Mobile Touch Support** - Optimized touch controls for iOS/Android **[NEW!]**
- ✅ **Audio Feedback** - Visual indicators for transmitting/receiving **[NEW!]**
- ✅ **PWA Support** - Install as app on iOS/Android

### 🔄 Coming Soon
- 🔄 **Push Notifications** - Notify offline users (Web Push API)
- 🔄 **Audio Worklet** - Advanced audio processing
- 🔄 **Recording** - Record PTT messages for playback
- 🔄 **Channels** - Create separate communication channels

## Architecture

```
├── server/
│   └── index.js          # Node.js HTTP + WebSocket server
├── public/
│   ├── index.html        # Main application UI
│   ├── css/
│   │   └── styles.css    # Application styles
│   ├── js/
│   │   └── main.js       # Main application logic
│   └── workers/
│       └── ws-worker.js  # WebSocket worker thread
└── users/                # User data storage (JSON files)
```

## Technology Stack

- **Backend**: Node.js (ES Modules)
- **WebSocket**: ws library
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Workers**: Web Workers for network handling
- **Styling**: Pure CSS with CSS variables
- **Future**: WebRTC for P2P audio, Service Workers for PWA

## Getting Started

### Prerequisites
- Node.js 18+ (ES Modules support)
- Modern browser with Web Worker support

### Installation

1. Install dependencies:
```bash
cd ptt-system
npm install
```

2. Start the server:
```bash
npm start
```

Or for development with auto-restart:
```bash
npm run dev
```

3. Open your browser:
```
http://localhost:3000
```

### Testing

1. Open the app in multiple browser windows/tabs
2. Enter a username in each window (e.g., "Driver1", "Dispatch", "Driver2")
3. You should see other users appear in the "Online Users" list
4. Try changing your status (click the settings icon)
5. The status changes should reflect in all connected clients

## API Endpoints

### HTTP API

- `POST /api/register` - Register new user
  ```json
  { "username": "driver1" }
  ```

- `POST /api/login` - Login existing user
  ```json
  { "username": "driver1" }
  ```

- `GET /api/users` - Get all registered users

### WebSocket Messages

**Client → Server:**
- `auth` - Authenticate connection
- `heartbeat` - Keep connection alive
- `status_change` - Update user status
- `signal` - WebRTC signaling (future)

**Server → Client:**
- `auth_success` - Authentication successful
- `user_joined` - New user connected
- `user_left` - User disconnected
- `user_status_changed` - User changed status
- `heartbeat_ack` - Heartbeat acknowledged
- `signal` - WebRTC signaling (future)

## Configuration

### Server
Edit `server/index.js` to configure:
- `PORT` - Server port (default: 3000)
- `HEARTBEAT_INTERVAL` - How often to check connections (30s)
- `HEARTBEAT_TIMEOUT` - When to consider connection dead (45s)

### Client
Edit `workers/ws-worker.js` to configure:
- `HEARTBEAT_INTERVAL` - How often to send heartbeat (25s)
- `RECONNECT_DELAY` - Delay before reconnection attempt (3s)

## User Data Storage

Users are stored as JSON files in the `users/` directory:

```json
{
  "username": "driver1",
  "createdAt": "2025-01-13T12:00:00.000Z",
  "lastLogin": "2025-01-13T14:30:00.000Z"
}
```

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
- Chrome Android 90+

## Development Roadmap

### Phase 1: Foundation ✅ (Current)
- Basic server infrastructure
- User authentication & presence
- WebSocket communication
- Heartbeat system

### Phase 2: WebRTC Integration (Next)
- Peer-to-peer connection setup
- Audio capture and streaming
- PTT button functionality
- One-to-one audio calls

### Phase 3: Group Broadcasting
- Multi-peer connections
- Group audio routing
- SFU consideration for larger groups
- Audio mixing

### Phase 4: PWA & Notifications
- Service Worker implementation
- Install prompts
- Web Push API integration
- Background notifications

### Phase 5: Production Ready
- Error handling & logging
- Performance optimization
- Security hardening
- Deployment guide

## Troubleshooting

**Users not appearing online:**
- Check browser console for errors
- Verify WebSocket connection (should show "Connected")
- Check server logs for connection messages

**Connection keeps dropping:**
- Check network stability
- Verify firewall isn't blocking WebSocket
- Increase HEARTBEAT_TIMEOUT if needed

**Worker errors:**
- Ensure browser supports Web Workers
- Check browser console for worker errors
- Verify workers/ directory is accessible

## License

MIT
