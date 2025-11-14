// Main Application Controller
import { WebRTCManager } from './webrtc-manager.js';

class PTTApp {
  constructor() {
    this.wsWorker = null;
    this.webrtc = null;
    this.currentUser = null;
    this.onlineUsers = new Map();
    this.userStatus = 'online';
    this.isPTTPressed = false;

    // DOM elements
    this.loginScreen = document.getElementById('loginScreen');
    this.appScreen = document.getElementById('appScreen');
    this.loginForm = document.getElementById('loginForm');
    this.usernameInput = document.getElementById('usernameInput');
    this.loginError = document.getElementById('loginError');
    this.currentUsername = document.getElementById('currentUsername');
    this.usersList = document.getElementById('usersList');
    this.userCount = document.getElementById('userCount');
    this.connectionStatus = document.getElementById('connectionStatus');
    this.connectionText = document.getElementById('connectionText');
    this.statusBtn = document.getElementById('statusBtn');
    this.statusModal = document.getElementById('statusModal');
    this.closeStatusModal = document.getElementById('closeStatusModal');
    this.disconnectBtn = document.getElementById('disconnectBtn');
    this.loadingOverlay = document.getElementById('loadingOverlay');
    this.pttButton = document.getElementById('pttButton');
    this.audioStatus = document.getElementById('audioStatus');

    this.init();
  }

  init() {
    // Set up event listeners
    this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    this.disconnectBtn.addEventListener('click', () => this.handleDisconnect());
    this.statusBtn.addEventListener('click', () => this.openStatusModal());
    this.closeStatusModal.addEventListener('click', () => this.closeStatusModalHandler());

    // Status option buttons
    document.querySelectorAll('.status-option').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const status = e.currentTarget.dataset.status;
        this.changeStatus(status);
        this.closeStatusModalHandler();
      });
    });

    // Close modal on background click
    this.statusModal.addEventListener('click', (e) => {
      if (e.target === this.statusModal) {
        this.closeStatusModalHandler();
      }
    });

    // PTT Button - Mouse events (desktop)
    this.pttButton.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.startPTT();
    });

    this.pttButton.addEventListener('mouseup', (e) => {
      e.preventDefault();
      this.stopPTT();
    });

    this.pttButton.addEventListener('mouseleave', (e) => {
      if (this.isPTTPressed) {
        this.stopPTT();
      }
    });

    // PTT Button - Touch events (mobile)
    this.pttButton.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startPTT();
    });

    this.pttButton.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.stopPTT();
    });

    this.pttButton.addEventListener('touchcancel', (e) => {
      e.preventDefault();
      this.stopPTT();
    });

    // Prevent context menu on PTT button
    this.pttButton.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    console.log('PTT App initialized');
  }

  // Handle login form submission
  async handleLogin(e) {
    e.preventDefault();
    const username = this.usernameInput.value.trim();

    if (username.length < 2) {
      this.showLoginError('Username must be at least 2 characters');
      return;
    }

    this.showLoading(true);
    this.loginError.textContent = '';

    try {
      // Try to login first
      const loginResponse = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });

      let user;

      if (loginResponse.status === 404) {
        // User doesn't exist, create new account
        const registerResponse = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username })
        });

        if (!registerResponse.ok) {
          const error = await registerResponse.json();
          throw new Error(error.error || 'Registration failed');
        }

        const data = await registerResponse.json();
        user = data.user;
        console.log('New user registered:', username);
      } else if (loginResponse.ok) {
        // Existing user logged in
        const data = await loginResponse.json();
        user = data.user;
        console.log('User logged in:', username);
      } else {
        const error = await loginResponse.json();
        throw new Error(error.error || 'Login failed');
      }

      // Store user and connect
      this.currentUser = user;
      await this.initializeAudio();
      this.connectToServer();

    } catch (err) {
      console.error('Login error:', err);
      this.showLoginError(err.message);
      this.showLoading(false);
    }
  }

  // Initialize WebRTC audio
  async initializeAudio() {
    try {
      this.webrtc = new WebRTCManager();

      // Set up event handlers
      this.webrtc.onConnectionStateChange = (userId, state) => {
        console.log(`[App] Peer ${userId} state:`, state);
        this.updateUserConnectionState(userId, state);
      };

      this.webrtc.onRemoteStream = (userId, stream, audio) => {
        console.log(`[App] Receiving audio from:`, userId);
        this.showAudioStatus(`Receiving from ${userId}`, 'receiving');
      };

      this.webrtc.onError = (error) => {
        console.error('[App] WebRTC error:', error);
        this.showAudioStatus(error.message, 'error');
      };

      this.webrtc.onIceCandidate = (userId, candidate) => {
        // Send ICE candidate to peer via signaling server
        this.sendSignal(userId, {
          type: 'ice-candidate',
          candidate
        });
      };

      // Request microphone access
      const success = await this.webrtc.initialize();
      if (success) {
        this.showAudioStatus('Microphone ready', 'ready');
        this.pttButton.disabled = false;
        console.log('[App] Audio initialized successfully');
      } else {
        this.showAudioStatus('Microphone access denied', 'error');
        this.pttButton.disabled = true;
      }
    } catch (err) {
      console.error('[App] Failed to initialize audio:', err);
      this.showAudioStatus('Audio initialization failed', 'error');
    }
  }

  // Connect to WebSocket server via worker
  connectToServer() {
    // Initialize WebSocket worker
    this.wsWorker = new Worker('workers/ws-worker.js');

    this.wsWorker.onmessage = (event) => {
      this.handleWorkerMessage(event.data);
    };

    this.wsWorker.onerror = (error) => {
      console.error('Worker error:', error);
      this.showLoginError('Connection failed');
      this.showLoading(false);
    };

    // Connect to server
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    this.wsWorker.postMessage({
      type: 'connect',
      payload: {
        url: wsUrl,
        username: this.currentUser.username
      }
    });
  }

  // Handle messages from WebSocket worker
  handleWorkerMessage(message) {
    const { type, payload } = message;

    switch (type) {
      case 'connecting':
        this.updateConnectionStatus('Connecting...', false);
        break;

      case 'connected':
        this.updateConnectionStatus('Connected', true);
        break;

      case 'disconnected':
        this.updateConnectionStatus('Disconnected', false);
        this.handleDisconnect();
        break;

      case 'reconnecting':
        this.updateConnectionStatus('Reconnecting...', false);
        break;

      case 'message':
        this.handleServerMessage(payload);
        break;

      case 'error':
        console.error('Worker error:', payload);
        this.showLoginError(payload.error || 'Connection error');
        break;

      default:
        console.log('Unknown worker message:', type);
    }
  }

  // Handle messages from server
  async handleServerMessage(message) {
    switch (message.type) {
      case 'auth_success':
        console.log('Authentication successful');
        this.showLoading(false);
        this.showAppScreen();
        this.currentUsername.textContent = message.username;

        // Load initial online users
        if (message.onlineUsers) {
          for (const user of message.onlineUsers) {
            if (user.userId !== this.currentUser.username) {
              this.addOrUpdateUser(user);
              // Create WebRTC offer for each online user
              await this.createWebRTCOffer(user.userId);
            }
          }
        }
        break;

      case 'user_joined':
        console.log('User joined:', message.username);
        this.addOrUpdateUser({
          userId: message.userId,
          username: message.username,
          status: 'online'
        });

        // Create WebRTC offer for new user
        await this.createWebRTCOffer(message.userId);
        break;

      case 'user_left':
        console.log('User left:', message.username);
        this.removeUser(message.userId);

        // Clean up WebRTC connection
        if (this.webrtc) {
          this.webrtc.removePeer(message.userId);
        }
        break;

      case 'user_status_changed':
        console.log('User status changed:', message.userId, message.status);
        this.updateUserStatus(message.userId, message.status);
        break;

      case 'signal':
        // Handle WebRTC signaling
        await this.handleWebRTCSignal(message.fromUserId, message.signal);
        break;

      case 'heartbeat_ack':
        // Heartbeat acknowledged
        break;

      case 'error':
        console.error('Server error:', message.error);
        this.showLoginError(message.error);
        break;

      default:
        console.log('Unknown server message:', message.type);
    }
  }

  // Create WebRTC offer and send to peer
  async createWebRTCOffer(userId) {
    if (!this.webrtc) return;

    try {
      console.log('[App] Creating WebRTC offer for:', userId);
      const offer = await this.webrtc.createOffer(userId);

      // Send offer to peer via signaling server
      this.sendSignal(userId, {
        type: 'offer',
        offer
      });
    } catch (err) {
      console.error('[App] Failed to create offer:', err);
    }
  }

  // Handle incoming WebRTC signal
  async handleWebRTCSignal(fromUserId, signal) {
    if (!this.webrtc) return;

    try {
      switch (signal.type) {
        case 'offer':
          console.log('[App] Received offer from:', fromUserId);
          const answer = await this.webrtc.handleOffer(fromUserId, signal.offer);

          // Send answer back
          this.sendSignal(fromUserId, {
            type: 'answer',
            answer
          });
          break;

        case 'answer':
          console.log('[App] Received answer from:', fromUserId);
          await this.webrtc.handleAnswer(fromUserId, signal.answer);
          break;

        case 'ice-candidate':
          console.log('[App] Received ICE candidate from:', fromUserId);
          await this.webrtc.handleIceCandidate(fromUserId, signal.candidate);
          break;

        default:
          console.log('[App] Unknown signal type:', signal.type);
      }
    } catch (err) {
      console.error('[App] Error handling signal:', err);
    }
  }

  // Send WebRTC signal to peer via server
  sendSignal(targetUserId, signal) {
    if (!this.wsWorker) return;

    this.wsWorker.postMessage({
      type: 'send',
      payload: {
        type: 'signal',
        targetUserId,
        signal
      }
    });
  }

  // Start PTT transmission
  startPTT() {
    if (this.isPTTPressed || !this.webrtc) return;

    console.log('[App] PTT pressed');
    this.isPTTPressed = true;

    // Start transmitting
    this.webrtc.startTransmitting();

    // Visual feedback
    this.pttButton.classList.add('transmitting');
    this.showAudioStatus('Transmitting...', 'transmitting');

    // Haptic feedback (mobile)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  // Stop PTT transmission
  stopPTT() {
    if (!this.isPTTPressed || !this.webrtc) return;

    console.log('[App] PTT released');
    this.isPTTPressed = false;

    // Stop transmitting
    this.webrtc.stopTransmitting();

    // Visual feedback
    this.pttButton.classList.remove('transmitting');
    this.showAudioStatus('Ready', 'ready');

    // Haptic feedback (mobile)
    if (navigator.vibrate) {
      navigator.vibrate(30);
    }
  }

  // Show audio status
  showAudioStatus(message, state) {
    if (this.audioStatus) {
      this.audioStatus.textContent = message;
      this.audioStatus.className = `audio-status ${state}`;
    }
  }

  // Update user connection state
  updateUserConnectionState(userId, state) {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.connectionState = state;
      this.renderUsersList();
    }
  }

  // Add or update user in the list
  addOrUpdateUser(user) {
    this.onlineUsers.set(user.userId, user);
    this.renderUsersList();
  }

  // Remove user from the list
  removeUser(userId) {
    this.onlineUsers.delete(userId);
    this.renderUsersList();
  }

  // Update user status
  updateUserStatus(userId, status) {
    const user = this.onlineUsers.get(userId);
    if (user) {
      user.status = status;
      this.renderUsersList();
    }
  }

  // Render the online users list
  renderUsersList() {
    this.userCount.textContent = this.onlineUsers.size;

    if (this.onlineUsers.size === 0) {
      this.usersList.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <p>No other users online</p>
          <p style="font-size: 12px; margin-top: 8px;">You're the first one here!</p>
        </div>
      `;
      return;
    }

    const usersHTML = Array.from(this.onlineUsers.values())
      .map(user => this.createUserCard(user))
      .join('');

    this.usersList.innerHTML = usersHTML;
  }

  // Create HTML for a user card
  createUserCard(user) {
    const initial = user.username.charAt(0).toUpperCase();
    const statusClass = user.status || 'online';
    const connectionState = user.connectionState || 'new';
    const isConnected = connectionState === 'connected';

    return `
      <div class="user-card ${isConnected ? 'connected' : ''}" data-user-id="${user.userId}">
        <div class="user-info">
          <div class="user-avatar">
            ${initial}
            <div class="status-indicator ${statusClass}"></div>
            ${isConnected ? '<div class="audio-indicator"></div>' : ''}
          </div>
          <div class="user-details">
            <div class="user-name">${user.username}</div>
            <div class="user-status-text">${statusClass}</div>
            ${isConnected ? '<div class="connection-badge">Audio Ready</div>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Change user status
  changeStatus(status) {
    this.userStatus = status;

    if (this.wsWorker) {
      this.wsWorker.postMessage({
        type: 'change_status',
        payload: { status }
      });
    }

    // Update UI
    const statusIndicator = document.querySelector('.user-badge .status-indicator');
    if (statusIndicator) {
      statusIndicator.className = `status-indicator ${status}`;
    }
  }

  // Update connection status indicator
  updateConnectionStatus(text, isConnected) {
    this.connectionText.textContent = text;

    if (isConnected) {
      this.connectionStatus.classList.remove('disconnected');
    } else {
      this.connectionStatus.classList.add('disconnected');
    }
  }

  // Show app screen
  showAppScreen() {
    this.loginScreen.classList.remove('active');
    this.appScreen.classList.add('active');
  }

  // Show login screen
  showLoginScreen() {
    this.appScreen.classList.remove('active');
    this.loginScreen.classList.add('active');
  }

  // Handle disconnect
  handleDisconnect() {
    if (this.wsWorker) {
      this.wsWorker.postMessage({ type: 'disconnect' });
      this.wsWorker.terminate();
      this.wsWorker = null;
    }

    if (this.webrtc) {
      this.webrtc.cleanup();
      this.webrtc = null;
    }

    this.onlineUsers.clear();
    this.currentUser = null;
    this.userStatus = 'online';
    this.isPTTPressed = false;
    this.usernameInput.value = '';
    this.pttButton.disabled = true;
    this.showLoginScreen();
  }

  // Open status change modal
  openStatusModal() {
    this.statusModal.classList.add('active');
  }

  // Close status modal
  closeStatusModalHandler() {
    this.statusModal.classList.remove('active');
  }

  // Show/hide loading overlay
  showLoading(show) {
    if (show) {
      this.loadingOverlay.classList.add('active');
    } else {
      this.loadingOverlay.classList.remove('active');
    }
  }

  // Show login error message
  showLoginError(message) {
    this.loginError.textContent = message;
    setTimeout(() => {
      this.loginError.textContent = '';
    }, 5000);
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new PTTApp());
} else {
  new PTTApp();
}
