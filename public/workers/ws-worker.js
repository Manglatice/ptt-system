// WebSocket Worker - Handles all server communication
let ws = null;
let heartbeatInterval = null;
let reconnectTimeout = null;
let isConnecting = false;

const HEARTBEAT_INTERVAL = 25000; // Send heartbeat every 25 seconds
const RECONNECT_DELAY = 3000; // Wait 3 seconds before reconnecting

// Worker message handler
self.onmessage = (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'connect':
      connect(payload.url, payload.username);
      break;

    case 'disconnect':
      disconnect();
      break;

    case 'send':
      send(payload);
      break;

    case 'change_status':
      changeStatus(payload.status);
      break;

    default:
      console.log('[Worker] Unknown message type:', type);
  }
};

// Connect to WebSocket server
function connect(url, username) {
  if (ws || isConnecting) {
    console.log('[Worker] Already connected or connecting');
    return;
  }

  isConnecting = true;
  postMessage({ type: 'connecting' });

  try {
    ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('[Worker] WebSocket connected');
      isConnecting = false;
      postMessage({ type: 'connected' });

      // Send authentication
      send({
        type: 'auth',
        username
      });

      // Start heartbeat
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[Worker] Received:', message.type);

        // Forward message to main thread
        postMessage({
          type: 'message',
          payload: message
        });
      } catch (err) {
        console.error('[Worker] Failed to parse message:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('[Worker] WebSocket error:', error);
      postMessage({
        type: 'error',
        payload: { error: 'Connection error' }
      });
    };

    ws.onclose = (event) => {
      console.log('[Worker] WebSocket closed:', event.code, event.reason);
      isConnecting = false;
      cleanup();

      postMessage({
        type: 'disconnected',
        payload: {
          code: event.code,
          reason: event.reason
        }
      });

      // Attempt reconnection if it wasn't a clean close
      if (!event.wasClean && event.code !== 1000) {
        scheduleReconnect(url, username);
      }
    };
  } catch (err) {
    console.error('[Worker] Failed to create WebSocket:', err);
    isConnecting = false;
    postMessage({
      type: 'error',
      payload: { error: err.message }
    });
  }
}

// Disconnect from server
function disconnect() {
  console.log('[Worker] Disconnecting...');
  cleanup();

  if (ws) {
    ws.close(1000, 'User disconnected');
    ws = null;
  }
}

// Send message to server
function send(message) {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[Worker] Cannot send, WebSocket not open');
    postMessage({
      type: 'error',
      payload: { error: 'Not connected' }
    });
    return;
  }

  try {
    ws.send(JSON.stringify(message));
  } catch (err) {
    console.error('[Worker] Failed to send message:', err);
  }
}

// Change user status
function changeStatus(status) {
  send({
    type: 'status_change',
    status
  });
}

// Start sending heartbeats
function startHeartbeat() {
  stopHeartbeat(); // Clear any existing interval

  heartbeatInterval = setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      send({ type: 'heartbeat' });
    } else {
      stopHeartbeat();
    }
  }, HEARTBEAT_INTERVAL);
}

// Stop sending heartbeats
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Schedule reconnection attempt
function scheduleReconnect(url, username) {
  if (reconnectTimeout) return;

  console.log(`[Worker] Reconnecting in ${RECONNECT_DELAY}ms...`);

  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    postMessage({ type: 'reconnecting' });
    connect(url, username);
  }, RECONNECT_DELAY);
}

// Clean up resources
function cleanup() {
  stopHeartbeat();

  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
}

console.log('[Worker] WebSocket worker initialized');
