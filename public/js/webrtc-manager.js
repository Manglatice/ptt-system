// WebRTC Manager - Handles peer-to-peer audio connections
export class WebRTCManager {
  constructor() {
    this.peers = new Map(); // Map<userId, RTCPeerConnection>
    this.localStream = null;
    this.audioContext = null;
    this.isMuted = true; // Start muted
    this.isTransmitting = false;

    // STUN servers for NAT traversal
    this.config = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    // Event handlers
    this.onConnectionStateChange = null;
    this.onRemoteStream = null;
    this.onError = null;
  }

  /**
   * Initialize audio - request microphone permission
   */
  async initialize() {
    try {
      console.log('[WebRTC] Requesting microphone access...');

      // Request microphone with optimized constraints for PTT
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1
        },
        video: false
      });

      // Start muted
      this.muteLocalStream();

      console.log('[WebRTC] Microphone access granted');
      return true;
    } catch (err) {
      console.error('[WebRTC] Failed to get microphone access:', err);
      if (this.onError) {
        this.onError({
          type: 'microphone',
          message: 'Microphone access denied or not available',
          error: err
        });
      }
      return false;
    }
  }

  /**
   * Create peer connection for a user
   */
  createPeerConnection(userId) {
    if (this.peers.has(userId)) {
      console.log('[WebRTC] Peer connection already exists for:', userId);
      return this.peers.get(userId);
    }

    console.log('[WebRTC] Creating peer connection for:', userId);

    const pc = new RTCPeerConnection(this.config);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[WebRTC] ICE candidate for:', userId);
        if (this.onIceCandidate) {
          this.onIceCandidate(userId, event.candidate);
        }
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState, 'for:', userId);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(userId, pc.connectionState);
      }

      // Clean up if connection failed or closed
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.removePeer(userId);
      }
    };

    // Handle incoming tracks (remote audio)
    pc.ontrack = (event) => {
      console.log('[WebRTC] Received remote track from:', userId);

      if (event.streams && event.streams[0]) {
        const remoteStream = event.streams[0];

        // Create audio element and play
        const audio = new Audio();
        audio.srcObject = remoteStream;
        audio.autoplay = true;
        audio.playsinline = true; // Important for iOS

        // Store audio element with peer
        pc.remoteAudio = audio;

        if (this.onRemoteStream) {
          this.onRemoteStream(userId, remoteStream, audio);
        }

        // Start playback
        audio.play().catch(err => {
          console.error('[WebRTC] Failed to play remote audio:', err);
        });
      }
    };

    this.peers.set(userId, pc);
    return pc;
  }

  /**
   * Create and send offer to peer
   */
  async createOffer(userId) {
    try {
      const pc = this.createPeerConnection(userId);

      console.log('[WebRTC] Creating offer for:', userId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      return offer;
    } catch (err) {
      console.error('[WebRTC] Failed to create offer:', err);
      throw err;
    }
  }

  /**
   * Handle received offer
   */
  async handleOffer(userId, offer) {
    try {
      const pc = this.createPeerConnection(userId);

      console.log('[WebRTC] Handling offer from:', userId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      return answer;
    } catch (err) {
      console.error('[WebRTC] Failed to handle offer:', err);
      throw err;
    }
  }

  /**
   * Handle received answer
   */
  async handleAnswer(userId, answer) {
    try {
      const pc = this.peers.get(userId);
      if (!pc) {
        console.error('[WebRTC] No peer connection for:', userId);
        return;
      }

      console.log('[WebRTC] Handling answer from:', userId);
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('[WebRTC] Failed to handle answer:', err);
      throw err;
    }
  }

  /**
   * Handle received ICE candidate
   */
  async handleIceCandidate(userId, candidate) {
    try {
      const pc = this.peers.get(userId);
      if (!pc) {
        console.error('[WebRTC] No peer connection for ICE candidate:', userId);
        return;
      }

      console.log('[WebRTC] Adding ICE candidate from:', userId);
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.error('[WebRTC] Failed to add ICE candidate:', err);
    }
  }

  /**
   * Start transmitting (unmute)
   */
  startTransmitting() {
    if (!this.localStream) {
      console.error('[WebRTC] No local stream available');
      return false;
    }

    console.log('[WebRTC] Start transmitting');
    this.isTransmitting = true;
    this.unmuteLocalStream();
    return true;
  }

  /**
   * Stop transmitting (mute)
   */
  stopTransmitting() {
    console.log('[WebRTC] Stop transmitting');
    this.isTransmitting = false;
    this.muteLocalStream();
  }

  /**
   * Mute local microphone
   */
  muteLocalStream() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
      this.isMuted = true;
    }
  }

  /**
   * Unmute local microphone
   */
  unmuteLocalStream() {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
      this.isMuted = false;
    }
  }

  /**
   * Remove peer connection
   */
  removePeer(userId) {
    const pc = this.peers.get(userId);
    if (pc) {
      console.log('[WebRTC] Removing peer:', userId);

      // Stop remote audio
      if (pc.remoteAudio) {
        pc.remoteAudio.pause();
        pc.remoteAudio.srcObject = null;
      }

      // Close connection
      pc.close();
      this.peers.delete(userId);
    }
  }

  /**
   * Clean up all connections
   */
  cleanup() {
    console.log('[WebRTC] Cleaning up all connections');

    // Close all peer connections
    this.peers.forEach((pc, userId) => {
      this.removePeer(userId);
    });

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    // Clean up audio context
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Get connection status for a peer
   */
  getPeerStatus(userId) {
    const pc = this.peers.get(userId);
    return pc ? pc.connectionState : 'disconnected';
  }

  /**
   * Check if microphone is available
   */
  hasMicrophone() {
    return this.localStream !== null;
  }

  /**
   * Get audio level (for visual feedback)
   */
  getAudioLevel() {
    if (!this.localStream || !this.isTransmitting) return 0;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      const analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteTimeDomainData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sum += normalized * normalized;
      }

      return Math.sqrt(sum / dataArray.length);
    } catch (err) {
      console.error('[WebRTC] Failed to get audio level:', err);
      return 0;
    }
  }
}
