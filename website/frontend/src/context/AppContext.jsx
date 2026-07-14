import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { initializeFirebase } from '../firebase.js';

const AppContext = createContext();
let firebaseAuthMethodsPromise;

const loadFirebaseAuthMethods = () => {
  if (!firebaseAuthMethodsPromise) {
    firebaseAuthMethodsPromise = import('firebase/auth');
  }
  return firebaseAuthMethodsPromise;
};

const shouldUseLocalAuthFallback = (error) => {
  const code = error?.code || '';
  const message = error?.message || '';
  return (
    code === 'auth/unauthorized-domain' ||
    code === 'auth/invalid-credential' ||
    message.includes('auth/unauthorized-domain') ||
    message.includes('auth/invalid-credential')
  );
};

const getMessageChatKey = (message, currentUserId) => {
  if (message.channelId) return `channel:${message.channelId}`;
  const curId = currentUserId ? String(currentUserId).trim() : '';
  const mSenderId = message.userId ? String(message.userId).trim() : '';
  const mReceiverId = message.receiverId ? String(message.receiverId).trim() : '';
  
  if (!curId) return null;
  
  let otherId = '';
  if (mSenderId === curId) {
    otherId = mReceiverId;
  } else if (mReceiverId === curId) {
    otherId = mSenderId;
  } else {
    return null;
  }
  
  if (!otherId) return null;
  return `dm:${[curId, otherId].sort().join('-')}`;
};

export function useApp() {
  return useContext(AppContext);
}

// ICE servers config - includes public STUN + free TURN
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('kiko_token') || null);
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('kiko_refresh_token') || null);
  
  const [auth, setAuth] = useState(null);
  const [isFirebaseClientEnabled, setIsFirebaseClientEnabled] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await apiFetch('/api/auth/config');
        if (res.ok) {
          const configData = await safeJson(res);
          if (configData.firebaseEnabled && configData.firebaseConfig) {
            const authInstance = await initializeFirebase(configData.firebaseConfig);
            if (authInstance) {
              setAuth(authInstance);
              setIsFirebaseClientEnabled(true);
              console.log('[FirebaseClient] Dynamic Firebase Auth loaded successfully.');
            }
          } else {
            console.log('[FirebaseClient] Backend runs in local auth mode. Firebase disabled.');
          }
        }
      } catch (e) {
        console.error('Failed to load auth configuration:', e);
      }
    };
    fetchConfig();
  }, []);
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('kiko_theme') || 'dark';
    // Apply immediately to avoid flash of wrong theme
    document.documentElement.setAttribute('data-theme', saved);
    return saved;
  });
  const [bgWallpaper, setBgWallpaper] = useState(
    localStorage.getItem('kiko_wallpaper') || 
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1600&auto=format&fit=crop&q=60&blur=10'
  );

  // Settings sync states
  const [messageDensity, setMessageDensity] = useState(localStorage.getItem('kiko_density') || 'cozy');
  const [reducedMotion, setReducedMotion] = useState(localStorage.getItem('kiko_motion') === 'true');
  const [devMode, setDevMode] = useState(localStorage.getItem('kiko_dev_mode') === 'true');
  const [fontScale, setFontScale] = useState(parseInt(localStorage.getItem('kiko_font_scale')) || 100);

  // Friends & Servers
  const [friends, setFriends] = useState([]);
  const [servers, setServers] = useState([]);
  const [activeServerId, setActiveServerId] = useState(null);
  const [activeChannelId, setActiveChannelId] = useState(null);
  const [activeDMUserId, setActiveDMUserId] = useState(null);

  // Real-time Chat
  const [messages, setMessages] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const [voiceChannelsState, setVoiceChannelsState] = useState({});
  const [syncSpotifyUrl, setSyncSpotifyUrl] = useState(null);

  const [unreadCounts, setUnreadCounts] = useState(() => {
    try {
      const saved = localStorage.getItem('kiko_unread_counts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('kiko_unread_counts', JSON.stringify(unreadCounts));
  }, [unreadCounts]);

  useEffect(() => {
    if (activeDMUserId) {
      setUnreadCounts((prev) => {
        if (!prev[activeDMUserId]) return prev;
        return {
          ...prev,
          [activeDMUserId]: 0,
        };
      });
    }
  }, [activeDMUserId]);

  // Application Version & Updates
  const CURRENT_VERSION = '1.0.1';
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState('1.0.1');
  const [latestVersionInfo, setLatestVersionInfo] = useState(null);

  // WebRTC Call states
  const [callRoomId, setCallRoomId] = useState(null);
  const [callType, setCallType] = useState(null); // 'voice' | 'video' | 'screen'
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [micMuted, setMicMuted] = useState(false);
  const [deafened, setDeafened] = useState(false);
  const [camMuted, setCamMuted] = useState(false);
  const [streamQuality, setStreamQuality] = useState('720p');
  const [incomingCall, setIncomingCall] = useState(null); // { roomId, caller, streamType }

  // Audio Device Routing (Bluetooth & Audio hardware support)
  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState(localStorage.getItem('kiko_input_device') || 'default');
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState(localStorage.getItem('kiko_output_device') || 'default');

  const setInputDevice = (id) => {
    setSelectedInputDeviceId(id);
    localStorage.setItem('kiko_input_device', id);
  };
  const setOutputDevice = (id) => {
    setSelectedOutputDeviceId(id);
    localStorage.setItem('kiko_output_device', id);
  };

  const activeDMUserIdRef = useRef(activeDMUserId);
  useEffect(() => {
    activeDMUserIdRef.current = activeDMUserId;
    if (activeDMUserId && socketRef.current) {
      socketRef.current.emit('read_chat', { senderId: activeDMUserId });
    }
  }, [activeDMUserId]);

  // Refs - use refs for values needed inside socket event closures to avoid stale state
  const socketRef = useRef(null);
  const peersRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const localStreamRef = useRef(null); // Always holds the current local stream
  const callRoomIdRef = useRef(null);  // Always holds current callRoomId
  const currentUserRef = useRef(null); // Always holds current currentUser
  const [connected, setConnected] = useState(false);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('kiko_theme', theme);
  }, [theme]);

  // Sync settings and apply to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-density', messageDensity);
    localStorage.setItem('kiko_density', messageDensity);
  }, [messageDensity]);

  useEffect(() => {
    document.documentElement.setAttribute('data-motion', reducedMotion ? 'reduced' : 'normal');
    localStorage.setItem('kiko_motion', reducedMotion);
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem('kiko_dev_mode', devMode);
  }, [devMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', `${fontScale}%`);
    localStorage.setItem('kiko_font_scale', fontScale);
  }, [fontScale]);

  // Synchronize state when currentUser loads from DB
  useEffect(() => {
    if (currentUser) {
      if (currentUser.theme) setTheme(currentUser.theme);
      if (currentUser.bgWallpaper) setBgWallpaper(currentUser.bgWallpaper);
      if (currentUser.messageDensity) setMessageDensity(currentUser.messageDensity);
      if (currentUser.reducedMotion !== undefined) setReducedMotion(currentUser.reducedMotion);
      if (currentUser.devMode !== undefined) setDevMode(currentUser.devMode);
      if (currentUser.fontScale) setFontScale(currentUser.fontScale);
    }
  }, [currentUser]);

  // Sync localStream to ref
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  // Sync callRoomId to ref
  useEffect(() => {
    callRoomIdRef.current = callRoomId;
  }, [callRoomId]);

  // Sync currentUser to ref
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Auth fetch headers helper
  const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  });

  const safeJson = async (res) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      if (res.status === 502 || res.status === 503 || res.status === 504) {
        throw new Error('The server is starting up. Please wait a moment and try again.');
      }
      throw new Error(text || `Server error (HTTP ${res.status}). Please try again.`);
    }
  };

  const apiFetch = async (url, options = {}) => {
    const isDev = import.meta.env.DEV;
    // In development: hit localhost:5000 directly
    // In production (Vercel): use relative paths so Vercel rewrites proxy to Render
    const relativeUrl = url.startsWith('/') ? url : `/${url}`;
    const targetUrl = isDev
      ? `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}${relativeUrl}`
      : relativeUrl;
    try {
      return await fetch(targetUrl, options);
    } catch (e) {
      console.warn('[apiFetch] Fetch failed:', e.message);
      if (e.name === 'TypeError' && e.message.toLowerCase().includes('failed to fetch')) {
        throw new Error('Cannot reach the server. Check your internet connection or the server may be starting up.');
      }
      throw new Error('Connection to backend failed. Please try again.');
    }
  };

  // ==========================================
  // WEBRTC UTILITIES
  // ==========================================

  const createPeerConnection = (peerSocketId, peerUserId, username, streamType) => {
    console.log(`[RTC] Creating peer connection with ${username} (${peerSocketId})`);
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // Send ICE candidates to the peer via signaling server
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit('call_signal', {
          targetSocketId: peerSocketId,
          signalData: { candidate: event.candidate.toJSON() },
        });
      }
    };

    pc.onnegotiationneeded = async () => {
      try {
        console.log(`[RTC] Negotiation needed with ${username} (${peerSocketId})`);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (socketRef.current) {
          socketRef.current.emit('call_signal', {
            targetSocketId: peerSocketId,
            signalData: { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } },
          });
        }
      } catch (err) {
        console.error(`[RTC] Negotiation offer error for ${username}:`, err);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[RTC] ICE state with ${username}: ${pc.iceConnectionState}`);
    };

    pc.onconnectionstatechange = () => {
      console.log(`[RTC] Connection state with ${username}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        console.warn(`[RTC] Connection failed with ${username}, closing peer.`);
        closePeer(peerSocketId);
      }
    };

    // When remote track arrives — add to remoteStreams
    pc.ontrack = (event) => {
      console.log(`[RTC] Track received from ${username}`, event.track.kind);

      setRemoteStreams((prev) => {
        // Robust fallback: if event.streams[0] is not present, get or create a MediaStream and add track manually
        const existing = prev.find((item) => item.socketId === peerSocketId);
        let stream;
        if (event.streams && event.streams[0]) {
          stream = event.streams[0];
        } else {
          stream = existing?.stream || new MediaStream();
          stream.addTrack(event.track);
        }

        const filtered = prev.filter((item) => item.socketId !== peerSocketId);
        return [
          ...filtered,
          {
            socketId: peerSocketId,
            userId: peerUserId,
            username,
            stream,
            streamType: existing ? existing.streamType : streamType,
          },
        ];
      });
    };

    // Add local stream tracks to this peer connection
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });
    }

    return pc;
  };

  const closePeer = (socketId) => {
    const pc = peersRef.current.get(socketId);
    if (pc) {
      pc.close();
      peersRef.current.delete(socketId);
    }
    setRemoteStreams((prev) => prev.filter((item) => item.socketId !== socketId));
  };

  // ==========================================
  // SOCKET CONNECTION — only reconnect on token change, NOT on localStream
  // ==========================================
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    // IMPORTANT: Always connect directly to the backend — Vercel does not proxy WebSocket connections.
    // Use VITE_BACKEND_URL env var (Railway URL) in production, or localhost in development.
    const socketUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'], // polling as fallback
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1500,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setConnected(true);
      socket.emit('status_update', { status: 'online' });
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('[Socket] Disconnected.');
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err);
      // Fallback: If direct connection fails (DNS block), redirect socket connection to Vercel proxy
      if (socketUrl !== window.location.origin && socketUrl.includes('railway.app') && socket.io.opts.hostname !== window.location.hostname) {
        console.warn('[Socket] Direct connection failed, switching socket destination to relative host.');
        socket.io.uri = window.location.origin;
        socket.io.opts.hostname = window.location.hostname;
        socket.io.opts.port = window.location.port;
        socket.io.opts.secure = window.location.protocol === 'https:';
        socket.io.opts.transports = ['polling']; // Force polling for Vercel rewrites proxy
        socket.connect();
      }
    });

    // ── Chat events ──────────────────────────────────────────

    socket.on('new_message', (msg) => {
      let currentId = currentUserRef.current?.id;
      if (!currentId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentId = payload.id;
        } catch (e) {}
      }
      const chatKey = getMessageChatKey(msg, currentId);
      if (!chatKey) return;
      setMessages((prev) => {
        const existing = prev[chatKey] || [];
        const msgWithStatus = { ...msg, status: 'sent' };
        
        let next;
        // 1. Match by nonce
        if (msg.nonce && existing.some((m) => m.id === msg.nonce)) {
          next = existing.map((m) => m.id === msg.nonce ? msgWithStatus : m);
        }
        // 2. Match by real ID
        else if (existing.some((m) => m.id === msg.id)) {
          next = existing.map((m) => m.id === msg.id ? msgWithStatus : m);
        }
        // 3. Fallback: match by content/user if nonce was missed
        else {
          const matchingOptimistic = existing.find(
            (m) => m.id.startsWith('optimistic-') && m.content === msg.content && m.userId === msg.userId
          );
          if (matchingOptimistic) {
            next = existing.map((m) => m.id === matchingOptimistic.id ? msgWithStatus : m);
          } else {
            next = [...existing, msgWithStatus];
          }
        }
        return { ...prev, [chatKey]: next };
      });

      // If we are currently looking at this DM, mark incoming message as read
      if (!msg.channelId && msg.userId === activeDMUserIdRef.current) {
        socket.emit('read_chat', { senderId: msg.userId });
      } else if (!msg.channelId && msg.userId !== currentUserRef.current?.id) {
        // Increment unread count for this sender
        setUnreadCounts((prev) => ({
          ...prev,
          [msg.userId]: (prev[msg.userId] || 0) + 1,
        }));
      }
    });

    socket.on('message_updated', (updatedMsg) => {
      let currentId = currentUserRef.current?.id;
      if (!currentId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentId = payload.id;
        } catch (e) {}
      }
      const chatKey = getMessageChatKey(updatedMsg, currentId);
      if (!chatKey) return;
      setMessages((prev) => {
        const list = prev[chatKey] || [];
        const updatedList = list.map((m) => m.id === updatedMsg.id ? updatedMsg : m);
        return { ...prev, [chatKey]: updatedList };
      });
    });

    socket.on('message_deleted', ({ messageId, channelId, receiverId, senderId }) => {
      let currentId = currentUserRef.current?.id;
      if (!currentId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentId = payload.id;
        } catch (e) {}
      }
      const otherId = senderId === currentId ? receiverId : senderId;
      const chatKey = channelId
        ? `channel:${channelId}`
        : `dm:${[currentId, otherId].sort().join('-')}`;
      setMessages((prev) => ({
        ...prev,
        [chatKey]: (prev[chatKey] || []).filter((m) => m.id !== messageId),
      }));
    });

    socket.on('chat_cleared', ({ channelId, senderId }) => {
      let currentId = currentUserRef.current?.id;
      if (!currentId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentId = payload.id;
        } catch (e) {}
      }
      const chatKey = channelId
        ? `channel:${channelId}`
        : `dm:${[currentId, senderId].sort().join('-')}`;
      setMessages((prev) => ({
        ...prev,
        [chatKey]: [],
      }));
    });

    socket.on('messages_read', ({ readerId }) => {
      let currentId = currentUserRef.current?.id;
      if (!currentId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentId = payload.id;
        } catch (e) {}
      }
      const chatKey = `dm:${[currentId, readerId].sort().join('-')}`;
      setMessages((prev) => {
        const list = prev[chatKey] || [];
        const updatedList = list.map((m) =>
          m.userId === currentId ? { ...m, isRead: true, isDelivered: true } : m
        );
        return { ...prev, [chatKey]: updatedList };
      });
    });

    socket.on('messages_delivered', ({ receiverId, messageIds }) => {
      let currentId = currentUserRef.current?.id;
      if (!currentId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentId = payload.id;
        } catch (e) {}
      }
      const chatKey = `dm:${[currentId, receiverId].sort().join('-')}`;
      setMessages((prev) => {
        const list = prev[chatKey] || [];
        const updatedList = list.map((m) =>
          messageIds.includes(m.id) ? { ...m, isDelivered: true } : m
        );
        return { ...prev, [chatKey]: updatedList };
      });
    });

    socket.on('message_attachment_expired', ({ messageId, channelId, receiverId }) => {
      let currentId = currentUserRef.current?.id;
      if (!currentId && token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          currentId = payload.id;
        } catch (e) {}
      }
      const chatKey = channelId
        ? `channel:${channelId}`
        : `dm:${[currentId, receiverId].sort().join('-')}`;
      setMessages((prev) => ({
        ...prev,
        [chatKey]: (prev[chatKey] || []).map((m) =>
          m.id === messageId ? { ...m, isExpired: true, fileUrl: null } : m
        ),
      }));
    });

    socket.on('reaction_added', ({ messageId, reaction }) => {
      updateMessageReaction(messageId, (msg) => {
        const reactions = msg.reactions || [];
        const alreadyExists = reactions.some(r => r.id === reaction.id || (r.userId === reaction.userId && r.emoji === reaction.emoji));
        if (alreadyExists) return msg;
        return {
          ...msg,
          reactions: [...reactions, reaction],
        };
      });
    });

    socket.on('reaction_removed', ({ messageId, userId: rxUserId, emoji }) => {
      updateMessageReaction(messageId, (msg) => ({
        ...msg,
        reactions: (msg.reactions || []).filter(
          (r) => !(r.userId === rxUserId && r.emoji === emoji)
        ),
      }));
    });

    socket.on('typing_start', ({ channelId, userId: typingId, username }) => {
      const key = channelId ? `channel:${channelId}` : `dm:${typingId}`;
      setTypingUsers((prev) => {
        const list = prev[key] || [];
        if (list.some((u) => u.id === typingId)) return prev;
        return { ...prev, [key]: [...list, { id: typingId, username }] };
      });
    });

    socket.on('typing_stop', ({ channelId, userId: typingId }) => {
      const key = channelId ? `channel:${channelId}` : `dm:${typingId}`;
      setTypingUsers((prev) => ({
        ...prev,
        [key]: (prev[key] || []).filter((u) => u.id !== typingId),
      }));
    });

    socket.on('user_status_changed', ({ userId: statusUserId, status, customStatus }) => {
      setFriends((prev) =>
        prev.map((f) =>
          f.friend.id === statusUserId
            ? { ...f, friend: { ...f.friend, ...(status ? { status } : {}), ...(customStatus !== undefined ? { customStatus } : {}) } }
            : f
        )
      );
      setCurrentUser((prev) => {
        if (!prev || prev.id !== statusUserId) return prev;
        return { ...prev, ...(status ? { status } : {}), ...(customStatus !== undefined ? { customStatus } : {}) };
      });
    });

    socket.on('voice_channels_update', (update) => {
      setVoiceChannelsState(update);
    });

    socket.on('incoming_call', ({ roomId, caller, streamType }) => {
      console.log('[Socket] Incoming call:', roomId, caller, streamType);
      setIncomingCall({ roomId, caller, streamType });
    });

    socket.on('spotify_sync_play', ({ embedUrl, trackName, senderName }) => {
      console.log('[Socket] Synced Spotify track play:', embedUrl, trackName, senderName);
      setSyncSpotifyUrl(embedUrl);
    });

    // ── WebRTC Signaling ─────────────────────────────────────

    /**
     * Fired at EXISTING participants when a NEW user joins.
     * Existing participants create offers TO the new joiner.
     * Relying on pc.onnegotiationneeded (triggered by addTrack) to send the offer.
     */
    socket.on('user_joined_call', async ({ userId: joinedUserId, socketId, username, streamType }) => {
      console.log(`[RTC] New user joined: ${username} (${socketId})`);

      // Don't create duplicate connections
      if (peersRef.current.has(socketId)) {
        peersRef.current.get(socketId).close();
        peersRef.current.delete(socketId);
      }

      const pc = createPeerConnection(socketId, joinedUserId, username, streamType);
      peersRef.current.set(socketId, pc);
    });

    /**
     * Fired at the JOINER with the list of already-present participants.
     * Joiner creates peer connections with all of them but WAITS for offers from them.
     */
    socket.on('call_participants', (participantsList) => {
      console.log(`[RTC] Existing participants:`, participantsList);

      for (const { socketId, userId: pUserId, username, streamType } of participantsList) {
        if (peersRef.current.has(socketId)) continue;
        const pc = createPeerConnection(socketId, pUserId, username, streamType);
        peersRef.current.set(socketId, pc);
      }
    });

    /**
     * Handle incoming SDP (offer/answer) and ICE candidates
     */
    socket.on('call_signal', async ({ senderSocketId, senderUserId, senderUsername, signalData }) => {
      let pc = peersRef.current.get(senderSocketId);

      if (!pc) {
        console.log(`[RTC] Creating peer connection for incoming signal from ${senderUsername}`);
        pc = createPeerConnection(senderSocketId, senderUserId, senderUsername, 'voice');
        peersRef.current.set(senderSocketId, pc);
      }

      try {
        if (!pc.candidatesQueue) {
          pc.candidatesQueue = [];
        }

        if (signalData.sdp) {
          const sdpDesc = new RTCSessionDescription(signalData.sdp);

          // Avoid setting remote description if we're in wrong state
          if (sdpDesc.type === 'offer' && pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') {
            console.warn('[RTC] Received offer but signaling state is:', pc.signalingState);
          }

          await pc.setRemoteDescription(sdpDesc);
          console.log(`[RTC] Set remote description (${sdpDesc.type}) from ${senderUsername}`);

          // Process queued candidates
          if (pc.candidatesQueue && pc.candidatesQueue.length > 0) {
            console.log(`[RTC] Processing ${pc.candidatesQueue.length} queued ICE candidates`);
            for (const cand of pc.candidatesQueue) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(cand));
              } catch (e) {
                console.error('[RTC] Error adding queued ICE candidate:', e);
              }
            }
            pc.candidatesQueue = [];
          }

          if (sdpDesc.type === 'offer') {
            // Add local tracks if not yet added
            const stream = localStreamRef.current;
            if (stream) {
              const senders = pc.getSenders();
              stream.getTracks().forEach((track) => {
                const alreadyAdded = senders.some((s) => s.track === track);
                if (!alreadyAdded) {
                  pc.addTrack(track, stream);
                }
              });
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('call_signal', {
              targetSocketId: senderSocketId,
              signalData: { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } },
            });
            console.log(`[RTC] Answer sent to ${senderUsername}`);
          }
        } else if (signalData.candidate) {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signalData.candidate));
          } else {
            pc.candidatesQueue.push(signalData.candidate);
            console.log(`[RTC] Queued ICE candidate from ${senderUsername} (SDP not set yet)`);
          }
        }
      } catch (err) {
        console.error('[RTC] Signal handling error:', err);
      }
    });

    socket.on('user_left_call', ({ socketId, username }) => {
      console.log(`[RTC] User left call: ${username} (${socketId})`);
      closePeer(socketId);
    });

    socket.on('user_stream_type_changed', ({ socketId, streamType }) => {
      setRemoteStreams((prev) =>
        prev.map((item) =>
          item.socketId === socketId ? { ...item, streamType } : item
        )
      );
    });

    return () => {
      socket.off('new_message');
      socket.off('message_deleted');
      socket.off('chat_cleared');
      socket.off('message_attachment_expired');
      socket.off('typing_start');
      socket.off('typing_stop');
      socket.off('user_status_changed');
      socket.off('voice_channels_update');
      socket.off('incoming_call');
      socket.off('user_joined_call');
      socket.off('call_participants');
      socket.off('call_signal');
      socket.off('user_left_call');
      socket.off('user_stream_type_changed');
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]); // ← ONLY token, NOT localStream

  // ==========================================
  // CHANNEL ROOM JOINING
  // ==========================================
  useEffect(() => {
    if (!connected || !socketRef.current) return;
    if (activeChannelId) {
      socketRef.current.emit('join_channel', activeChannelId);
    }
    return () => {
      if (activeChannelId && socketRef.current) {
        socketRef.current.emit('leave_channel', activeChannelId);
      }
    };
  }, [activeChannelId, connected]);

  // Helper to locate and update a reaction on a message locally
  const updateMessageReaction = (messageId, updater) => {
    setMessages((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        next[key] = next[key].map((msg) => (msg.id === messageId ? updater(msg) : msg));
      });
      return next;
    });
  };

  // ==========================================
  // AUTH
  // ==========================================

  // Register
  const register = async (email, username, password, displayName) => {
    let tokenToUse = null;

    if (isFirebaseClientEnabled && auth) {
      try {
        const { createUserWithEmailAndPassword, updateProfile } = await loadFirebaseAuthMethods();
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName });
        tokenToUse = await userCred.user.getIdToken();
      } catch (err) {
        if (shouldUseLocalAuthFallback(err)) {
          console.warn('[FirebaseClient] Falling back to local registration:', err.message);
        } else {
          throw new Error(err.message || 'Firebase sign up failed');
        }
      }
    }

    if (tokenToUse) {
      const res = await apiFetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenToUse}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Firebase sync failed');
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      localStorage.setItem('kiko_token', data.accessToken);
      localStorage.setItem('kiko_refresh_token', data.refreshToken);
      setCurrentUser(data.user);
      return data.user;
    } else {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, displayName }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      localStorage.setItem('kiko_token', data.accessToken);
      localStorage.setItem('kiko_refresh_token', data.refreshToken);
      setCurrentUser(data.user);
      return data.user;
    }
  };

  // Login
  const login = async (emailOrUsername, password) => {
    let tokenToUse = null;

    if (isFirebaseClientEnabled && auth) {
      try {
        const { signInWithEmailAndPassword } = await loadFirebaseAuthMethods();
        let email = emailOrUsername;
        if (!emailOrUsername.includes('@')) {
          const emailRes = await apiFetch(`/api/auth/email-by-username?username=${encodeURIComponent(emailOrUsername)}`);
          if (emailRes.ok) {
            const emailData = await safeJson(emailRes);
            email = emailData.email;
          }
        }
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        tokenToUse = await userCred.user.getIdToken();
      } catch (err) {
        if (shouldUseLocalAuthFallback(err)) {
          console.warn('[FirebaseClient] Falling back to local sign in:', err.message);
        } else {
          throw new Error(err.message || 'Firebase sign in failed');
        }
      }
    }

    if (tokenToUse) {
      const res = await apiFetch('/api/auth/firebase-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenToUse}` },
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Firebase sync failed');
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      localStorage.setItem('kiko_token', data.accessToken);
      localStorage.setItem('kiko_refresh_token', data.refreshToken);
      setCurrentUser(data.user);
      return data.user;
    } else {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrUsername, password }),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Login failed');
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      localStorage.setItem('kiko_token', data.accessToken);
      localStorage.setItem('kiko_refresh_token', data.refreshToken);
      setCurrentUser(data.user);
      return data.user;
    }
  };

  // Google Sign-In (Firebase or Mock fallback)
  const loginWithGoogle = async (mockCredentials = null) => {
    // 1. If Firebase Client is enabled, use real Firebase Google Auth
    if (isFirebaseClientEnabled && auth) {
      try {
        const { GoogleAuthProvider, signInWithPopup } = await loadFirebaseAuthMethods();
        const provider = new GoogleAuthProvider();
        const userCred = await signInWithPopup(auth, provider);
        const tokenToUse = await userCred.user.getIdToken();

        const res = await apiFetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenToUse}` },
        });
        const data = await safeJson(res);
        if (!res.ok) throw new Error(data.error || 'Firebase sync failed');
        setToken(data.accessToken);
        setRefreshToken(data.refreshToken);
        localStorage.setItem('kiko_token', data.accessToken);
        localStorage.setItem('kiko_refresh_token', data.refreshToken);
        setCurrentUser(data.user);
        return data.user;
      } catch (err) {
        if (shouldUseLocalAuthFallback(err)) {
          throw new Error('MOCK_SIMULATION_REQUIRED');
        }
        throw new Error(err.message || 'Firebase Google Sign-In failed');
      }
    }

    // 2. Local Mock Google Auth for development testing
    if (mockCredentials) {
      const res = await apiFetch('/api/auth/mock-google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockCredentials),
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data.error || 'Mock Google authentication failed');
      setToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      localStorage.setItem('kiko_token', data.accessToken);
      localStorage.setItem('kiko_refresh_token', data.refreshToken);
      setCurrentUser(data.user);
      return data.user;
    }

    // Throw error to trigger simulator modal UI on the auth page
    throw new Error('MOCK_SIMULATION_REQUIRED');
  };

  // Reset Password
  const resetPassword = async (email, password) => {
    const res = await apiFetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Reset failed');
    return data.message;
  };

  // Logout
  const logout = async () => {
    // Clean up call room first
    leaveCallRoom();

    if (isFirebaseClientEnabled && auth) {
      try {
        const { signOut } = await loadFirebaseAuthMethods();
        await signOut(auth);
      } catch (e) { /* ignore */ }
    }

    try {
      await apiFetch('/api/auth/logout', { method: 'POST', headers: getHeaders() });
    } catch (e) { /* ignore */ }

    setToken(null);
    setRefreshToken(null);
    setCurrentUser(null);
    setFriends([]);
    setServers([]);
    setMessages({});
    setActiveServerId(null);
    setActiveChannelId(null);
    setActiveDMUserId(null);
    localStorage.removeItem('kiko_token');
    localStorage.removeItem('kiko_refresh_token');
  };

  // Load current session
  const loadUser = async () => {
    if (!token) return;
    try {
      let res = await apiFetch('/api/auth/me', { headers: getHeaders() });
      if (!res.ok && (res.status === 401 || res.status === 403)) {
        // Access token might be expired. Attempt refresh.
        const rToken = localStorage.getItem('kiko_refresh_token') || refreshToken;
        if (rToken) {
          console.log('[AppContext] Access token expired/invalid, attempting refresh...');
          try {
            const refreshRes = await apiFetch('/api/auth/refresh', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken: rToken }),
            });
            if (refreshRes.ok) {
              const refreshData = await safeJson(refreshRes);
              setToken(refreshData.accessToken);
              setRefreshToken(refreshData.refreshToken);
              localStorage.setItem('kiko_token', refreshData.accessToken);
              localStorage.setItem('kiko_refresh_token', refreshData.refreshToken);
              
              // Retry profile fetch with new token
              res = await apiFetch('/api/auth/me', {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${refreshData.accessToken}`,
                }
              });
            }
          } catch (refreshErr) {
            console.error('[AppContext] Failed to refresh token:', refreshErr);
          }
        }
      }

      if (res.ok) {
        const data = await safeJson(res);
        setCurrentUser(data);
      } else if (res.status === 401 || res.status === 403) {
        logout();
      } else {
        console.warn(`[AppContext] loadUser returned status ${res.status}. Session retained.`);
      }
    } catch (e) {
      console.error('Error fetching user', e);
    }
  };

  useEffect(() => {
    if (token) loadUser();
  }, [token]);

  // Re-sync messages when socket connection is established or re-established
  useEffect(() => {
    if (connected && currentUserRef.current?.id) {
      if (activeChannelId) {
        fetchMessages(`channel:${activeChannelId}`, activeChannelId, true);
      } else if (activeDMUserId) {
        fetchMessages(`dm:${[currentUserRef.current.id, activeDMUserId].sort().join('-')}`, activeDMUserId, false);
      }
    }
  }, [connected]);

  // Keep-alive background ping to prevent free backend container from sleeping
  useEffect(() => {
    const pingBackend = async () => {
      try {
        const apiBaseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
        await fetch(`${apiBaseUrl}/health`);
        console.log('[Keep-Alive] Pinged backend health status endpoint.');
      } catch (e) {
        console.warn('[Keep-Alive] Failed to ping backend health status:', e);
      }
    };
    // Ping on load
    pingBackend();
    // Ping every 25 seconds
    const interval = setInterval(pingBackend, 25000);
    return () => clearInterval(interval);
  }, []);

  // Automated version checking for updates
  useEffect(() => {
    if (!token) return;
    
    const checkUpdate = async () => {
      try {
        const res = await fetch('/version.json');
        if (res.ok) {
          const data = await res.json();
          if (data.version && data.version !== CURRENT_VERSION) {
            setUpdateAvailable(true);
            setLatestVersion(data.version);
            setLatestVersionInfo(data);
            
            // Show native desktop notification if running in Electron
            if (window.kikoElectron) {
              window.kikoElectron.showNotification(
                'Kiko Update Available',
                `Version ${data.version} is ready. Click to reload and apply the update.`
              );
            }
          }
        }
      } catch (e) {
        console.warn('[AppContext] Version check failed:', e);
      }
    };

    // Check 5 seconds after startup
    const initialTimeout = setTimeout(checkUpdate, 5000);
    // Check every 5 minutes
    const interval = setInterval(checkUpdate, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [token]);

  // Update Profile
  const updateProfile = async (fields) => {
    const res = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(fields),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to update profile');
    setCurrentUser((prev) => ({ ...prev, ...data }));

    if (socketRef.current && fields.status) {
      socketRef.current.emit('status_update', { status: fields.status, customStatus: fields.customStatus });
    }
    return data;
  };

  // ==========================================
  // FRIENDS
  // ==========================================

  const loadFriends = async () => {
    try {
      const res = await apiFetch('/api/friends', { headers: getHeaders() });
      if (res.ok) {
        const data = await safeJson(res);
        setFriends(data);
      }
    } catch (e) {
      console.error('Error fetching friends', e);
    }
  };

  const sendFriendRequest = async (username) => {
    const res = await apiFetch('/api/friends/request', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ username }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to send request');
    await loadFriends();
    return data.message;
  };

  const respondFriendRequest = async (friendId, action) => {
    const res = await apiFetch('/api/friends/respond', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ friendId, action }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to respond');
    await loadFriends();
    return data.message;
  };

  const removeFriend = async (friendId) => {
    const res = await apiFetch(`/api/friends/${friendId}`, { method: 'DELETE', headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to remove friend');
    await loadFriends();
  };

  // ==========================================
  // SERVERS
  // ==========================================

  const loadServers = async () => {
    try {
      const res = await apiFetch('/api/servers', { headers: getHeaders() });
      if (res.ok) {
        const data = await safeJson(res);
        setServers(data);
      }
    } catch (e) {
      console.error('Error fetching servers', e);
    }
  };

  const createServer = async (name, iconUrl) => {
    const res = await apiFetch('/api/servers', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, iconUrl }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to create server');
    await loadServers();
    return data;
  };

  const joinServer = async (inviteCode) => {
    const res = await apiFetch(`/api/servers/join/${inviteCode}`, { method: 'POST', headers: getHeaders() });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to join server');
    await loadServers();
    return data;
  };  const leaveServer = async (serverId) => {
    const res = await apiFetch(`/api/servers/${serverId}/leave`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to leave server');
    
    // Clear active server view if we left it
    if (activeServerId === serverId) {
      setActiveServerId(null);
      setActiveChannelId(null);
    }
    
    await loadServers();
    return data;
  };

  const deleteServer = async (serverId) => {
    const res = await apiFetch(`/api/servers/${serverId}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to delete server');

    if (activeServerId === serverId) {
      setActiveServerId(null);
      setActiveChannelId(null);
    }

    await loadServers();
    return data;
  };

  const createChannel = async (serverId, name, type, categoryName) => {
    const res = await apiFetch(`/api/servers/${serverId}/channels`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, type, categoryName }),
    });
    const data = await safeJson(res);
    if (!res.ok) throw new Error(data.error || 'Failed to create channel');
    await loadServers();
    return data;
  };

  const loadServerMembers = async (serverId) => {
    if (!serverId) return [];
    try {
      const res = await apiFetch(`/api/servers/${serverId}/members`, { headers: getHeaders() });
      if (res.ok) return await safeJson(res);
      return [];
    } catch (e) {
      console.error('Error fetching server members', e);
      return [];
    }
  };

  // ==========================================
  // CHAT / MESSAGING
  // ==========================================

  const fetchMessages = async (chatKey, id, isChannel = true) => {
    try {
      const queryParam = isChannel ? `channelId=${id}` : `receiverId=${id}`;
      const res = await apiFetch(`/api/servers/chat/messages?${queryParam}`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await safeJson(res);
        setMessages((prev) => {
          const existing = prev[chatKey] || [];
          if (data.length === 0 && existing.length > 0) {
            return prev;
          }
          const merged = [...existing];
          data.forEach((incoming) => {
            const index = merged.findIndex((msg) => msg.id === incoming.id);
            if (index >= 0) {
              merged[index] = incoming;
            } else {
              merged.push(incoming);
            }
          });
          merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          return { ...prev, [chatKey]: merged };
        });
      }
    } catch (e) {
      console.error('Error fetching messages', e);
    }
  };

  const sendMessage = async (content, file, replyToId) => {
    const nonce = `optimistic-${Date.now()}-${Math.random()}`;
    const chatKey = activeChannelId
      ? `channel:${activeChannelId}`
      : activeDMUserId
        ? `dm:${[currentUser?.id, activeDMUserId].sort().join('-')}`
        : null;

    if (!chatKey) return;

    let replyTo = null;
    if (replyToId) {
      const existingMsgs = messages[chatKey] || [];
      replyTo = existingMsgs.find(m => m.id === replyToId) || null;
    }

    const optimisticMsg = {
      id: nonce,
      content: content || (file ? `📎 Attachment: ${file.name}` : ''),
      userId: currentUser?.id,
      createdAt: new Date().toISOString(),
      user: {
        id: currentUser?.id,
        displayName: currentUser?.displayName || currentUser?.username,
        username: currentUser?.username,
        avatarUrl: currentUser?.avatarUrl,
      },
      status: 'sending', // 'sending' | 'sent' | 'error'
      fileUrl: file ? URL.createObjectURL(file) : null,
      fileName: file ? file.name : null,
      fileType: file ? file.type : null,
      fileSize: file ? file.size : null,
      replyTo,
      reactions: []
    };

    setMessages(prev => ({
      ...prev,
      [chatKey]: [...(prev[chatKey] || []), optimisticMsg]
    }));

    (async () => {
      let fileUrl = null, fileName = null, fileType = null, fileSize = null, expiresAt = null;
      try {
        if (file) {
          const formData = new FormData();
          formData.append('file', file);
          const uploadRes = await apiFetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          });
          if (!uploadRes.ok) throw new Error('Failed to upload attachment.');
          const uploadData = await safeJson(uploadRes);
          fileUrl = uploadData.fileUrl;
          fileName = uploadData.fileName;
          fileType = uploadData.fileType;
          fileSize = uploadData.fileSize;
          expiresAt = uploadData.expiresAt;
        }

        if (socketRef.current) {
          socketRef.current.emit('send_message', {
            content,
            replyToId,
            fileUrl, fileName, fileType, fileSize, expiresAt,
            nonce,
            ...(activeChannelId ? { channelId: activeChannelId } : { receiverId: activeDMUserId }),
          });
        }
      } catch (err) {
        console.error('Failed to send message:', err);
        setMessages(prev => {
          const list = prev[chatKey] || [];
          return {
            ...prev,
            [chatKey]: list.map(m => m.id === nonce ? { ...m, status: 'error' } : m)
          };
        });
      }
    })();
  };

  const deleteMessage = (messageId) => {
    if (socketRef.current) socketRef.current.emit('delete_message', { messageId });
  };

  const clearChat = () => {
    const chatKey = activeChannelId
      ? `channel:${activeChannelId}`
      : activeDMUserId
        ? `dm:${[currentUser?.id, activeDMUserId].sort().join('-')}`
        : null;

    if (chatKey) {
      setMessages((prev) => ({
        ...prev,
        [chatKey]: [],
      }));
    }

    if (socketRef.current) {
      if (activeChannelId) {
        socketRef.current.emit('clear_chat', { channelId: activeChannelId });
      } else if (activeDMUserId) {
        socketRef.current.emit('clear_chat', { receiverId: activeDMUserId });
      }
    }
  };

  const addReaction = (messageId, emoji) => {
    if (socketRef.current) socketRef.current.emit('add_reaction', { messageId, emoji });
  };

  const removeReaction = (messageId, emoji) => {
    if (socketRef.current) socketRef.current.emit('remove_reaction', { messageId, emoji });
  };

  const sendTypingStatus = (isTyping) => {
    if (!socketRef.current) return;
    const event = isTyping ? 'typing_start' : 'typing_stop';
    if (activeChannelId) {
      socketRef.current.emit(event, { channelId: activeChannelId });
    } else if (activeDMUserId) {
      socketRef.current.emit(event, { receiverId: activeDMUserId });
    }
  };

  // Helper to capture and mix screen audio + microphone input for screen sharing
  const getScreenStreamWithMicMix = async () => {
    // Capture screen capture stream
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      audio: true, // Request system audio if selected by user
      video: { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
    });

    // Capture microphone user voice
    let micStream = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (e) {
      console.warn('[RTC] Microphone getUserMedia failed, screen sharing system audio only:', e);
    }

    const screenAudioTrack = screenStream.getAudioTracks()[0];
    const micAudioTrack = micStream?.getAudioTracks()[0];

    // Mix both tracks together using Web Audio API
    if (screenAudioTrack && micAudioTrack) {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = audioCtx.createMediaStreamDestination();

      const source1 = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTrack]));
      const source2 = audioCtx.createMediaStreamSource(new MediaStream([micAudioTrack]));

      source1.connect(dest);
      source2.connect(dest);

      const mixedTrack = dest.stream.getAudioTracks()[0];
      const combinedStream = new MediaStream([screenStream.getVideoTracks()[0], mixedTrack]);

      // Custom cleanup wrapper to close AudioContext and both streams
      combinedStream.cleanup = () => {
        try { audioCtx.close(); } catch (e) {}
        try { screenStream.getTracks().forEach(t => t.stop()); } catch (e) {}
        try { micStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      };

      return combinedStream;
    } else {
      // Fallback if only one of them is available
      const audioTracks = [];
      if (screenAudioTrack) audioTracks.push(screenAudioTrack);
      if (micAudioTrack) {
        audioTracks.push(micAudioTrack);
      } else if (micStream) {
        micStream.getTracks().forEach(t => t.stop());
      }

      const combinedStream = new MediaStream([screenStream.getVideoTracks()[0], ...audioTracks]);
      combinedStream.cleanup = () => {
        try { screenStream.getTracks().forEach(t => t.stop()); } catch (e) {}
        try { if (micStream) micStream.getTracks().forEach(t => t.stop()); } catch (e) {}
      };

      return combinedStream;
    }
  };

  // ==========================================
  // WEBRTC CALLING
  // ==========================================

  const joinCallRoom = async (roomId, type = 'voice') => {
    // Leave any existing call first
    if (callRoomIdRef.current && callRoomIdRef.current !== roomId) {
      leaveCallRoom();
    }

    try {
      console.log(`[RTC] Joining call room: ${roomId} as ${type}`);

      const audioConstraint = selectedInputDeviceId && selectedInputDeviceId !== 'default'
        ? { deviceId: { exact: selectedInputDeviceId } }
        : true;

      let stream = null;
      if (type === 'voice') {
        stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
      } else if (type === 'video') {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        });
      } else if (type === 'screen') {
        stream = await getScreenStreamWithMicMix();
        // When user stops screen share via browser UI
        stream.getVideoTracks()[0].onended = () => {
          switchLocalStreamType('voice');
        };
      }

      // Update ref BEFORE emitting call_join so event handlers get the stream
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallRoomId(roomId);
      setCallType(type);
      setMicMuted(false);
      setCamMuted(type === 'voice');

      if (socketRef.current) {
        socketRef.current.emit('call_join', { roomId, streamType: type });
      }
    } catch (err) {
      console.error('[WebRTC] Access error:', err);
      if (err.name === 'NotAllowedError') {
        alert('Permission denied. Please allow camera/microphone access in your browser settings and try again.');
      } else if (err.name === 'NotFoundError') {
        alert('No camera or microphone found. Please connect a device and try again.');
      } else {
        alert(`Could not start call: ${err.message}`);
      }
      leaveCallRoom();
    }
  };

  const leaveCallRoom = () => {
    try {
      if (socketRef.current && callRoomIdRef.current) {
        socketRef.current.emit('call_leave', { roomId: callRoomIdRef.current });
      }
      // Stop all media tracks using the custom cleanup method if available
      if (localStreamRef.current) {
        if (typeof localStreamRef.current.cleanup === 'function') {
          localStreamRef.current.cleanup();
        } else {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
      }
      // Close all peer connections
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      setIncomingCall(null);
    } catch (e) {
      console.warn('[WebRTC] leaveCallRoom cleanup error:', e);
    } finally {
      localStreamRef.current = null;
      setCallRoomId(null);
      setCallType(null);
      setLocalStream(null);
      setRemoteStreams([]);
    }
  };

  /**
   * Switch between voice, video, and screen share WITHIN an active call.
   * Replaces tracks in all existing peer connections via RTCRtpSender.replaceTrack()
   * and renegotiates if needed.
   */
  const switchLocalStreamType = async (newType) => {
    if (!callRoomIdRef.current) return;
    console.log(`[RTC] Switching to ${newType}`);

    try {
      // Stop existing tracks using custom cleanup if available
      if (localStreamRef.current) {
        if (typeof localStreamRef.current.cleanup === 'function') {
          localStreamRef.current.cleanup();
        } else {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
      }

      const audioConstraint = selectedInputDeviceId && selectedInputDeviceId !== 'default'
        ? { deviceId: { exact: selectedInputDeviceId } }
        : true;

      let newStream = null;
      if (newType === 'voice') {
        newStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraint, video: false });
      } else if (newType === 'video') {
        newStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraint,
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } else if (newType === 'screen') {
        newStream = await getScreenStreamWithMicMix();
        newStream.getVideoTracks()[0].onended = () => switchLocalStreamType('voice');
      }

      // Update ref and state
      localStreamRef.current = newStream;
      setLocalStream(newStream);
      setCallType(newType);
      setCamMuted(newType === 'voice');

      // Replace tracks in all active peer connections
      const newAudioTrack = newStream?.getAudioTracks()[0] || null;
      const newVideoTrack = newStream?.getVideoTracks()[0] || null;

      for (const [peerSocketId, pc] of peersRef.current) {
        const senders = pc.getSenders();
        const audioSender = senders.find((s) => s.track?.kind === 'audio');
        const videoSender = senders.find((s) => s.track?.kind === 'video');

        // Handle audio track — replaceTrack works silently (no renegotiation needed)
        if (audioSender && newAudioTrack) {
          try { await audioSender.replaceTrack(newAudioTrack); } catch (e) {
            console.warn('[RTC] audio replaceTrack failed, adding instead:', e);
            pc.addTrack(newAudioTrack, newStream);
          }
        } else if (newAudioTrack && !audioSender) {
          pc.addTrack(newAudioTrack, newStream);
        }

        // Handle video track
        if (newVideoTrack) {
          if (videoSender) {
            // replaceTrack keeps same m= section — no renegotiation needed
            try { await videoSender.replaceTrack(newVideoTrack); } catch (e) {
              console.warn('[RTC] video replaceTrack failed, adding instead:', e);
              pc.addTrack(newVideoTrack, newStream);
            }
          } else {
            // Adding a new video track triggers onnegotiationneeded → renegotiation
            pc.addTrack(newVideoTrack, newStream);
          }
        } else if (videoSender) {
          // Switching back to voice — remove video sender (triggers renegotiation)
          pc.removeTrack(videoSender);
          // Manually trigger renegotiation since removeTrack doesn't always fire onnegotiationneeded
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            if (socketRef.current) {
              socketRef.current.emit('call_signal', {
                targetSocketId: peerSocketId,
                signalData: { sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } },
              });
            }
          } catch (negErr) {
            console.warn('[RTC] Manual renegotiation after removeTrack failed:', negErr);
          }
        }
      }

      // Notify peers of the stream type change
      if (socketRef.current) {
        socketRef.current.emit('call_stream_type_changed', {
          roomId: callRoomIdRef.current,
          streamType: newType,
        });
      }
    } catch (err) {
      console.error('[WebRTC] switchLocalStreamType error:', err);
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        alert(`Failed to switch to ${newType}: ${err.message}`);
      }
    }
  };

  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamMuted(!videoTrack.enabled);
      }
    }
  };

  const toggleDeafen = () => {
    setDeafened((prev) => !prev);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        token,
        friends,
        servers,
        activeServerId,
        activeChannelId,
        activeDMUserId,
        messages,
        typingUsers,
        unreadCounts,
        setUnreadCounts,
        theme,
        setTheme,
        bgWallpaper,
        setBgWallpaper,
        messageDensity,
        setMessageDensity,
        reducedMotion,
        setReducedMotion,
        devMode,
        setDevMode,
        fontScale,
        setFontScale,
        setActiveServerId,
        setActiveChannelId,
        setActiveDMUserId,
        connected,
        
        // Updates
        updateAvailable,
        latestVersion,
        latestVersionInfo,
        CURRENT_VERSION,

        // Auth
        login,
        register,
        loginWithGoogle,
        resetPassword,
        logout,
        updateProfile,
        safeJson,

        // Server management
        leaveServer,
        deleteServer,
        // Friends
        loadFriends,
        sendFriendRequest,
        respondFriendRequest,
        removeFriend,

        // Servers
        loadServers,
        createServer,
        joinServer,
        createChannel,
        loadServerMembers,

        // Chat
        fetchMessages,
        sendMessage,
        deleteMessage,
        clearChat,
        addReaction,
        removeReaction,
        sendTypingStatus,
        syncSpotifyUrl,
        setSyncSpotifyUrl,

        // WebRTC
        callRoomId,
        callType,
        localStream,
        remoteStreams,
        micMuted,
        deafened,
        camMuted,
        streamQuality,
        setStreamQuality,
        joinCallRoom,
        leaveCallRoom,
        toggleMic,
        toggleCam,
        toggleDeafen,
        switchLocalStreamType,

        // Audio device routing
        selectedInputDeviceId,
        selectedOutputDeviceId,
        setInputDevice,
        setOutputDevice,
        voiceChannelsState,
        incomingCall,
        setIncomingCall,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
