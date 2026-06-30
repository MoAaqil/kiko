import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Volume2, VolumeX,
  Monitor, MonitorOff, Maximize2, Minimize2, Users, Wifi,
  Settings, ChevronUp, ChevronDown
} from 'lucide-react';

/* ── Bind MediaStream to a <video> element reliably ─────────────── */
function VideoTile({
  stream, muted = false, username, streamType, isSelf = false,
  isActive = false, isPip = false, style: extraStyle = {}
}) {
  const { selectedOutputDeviceId } = useApp();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mediaRef = useRef(null);
  const containerRef = useRef(null);

  const hasVideo = stream && stream.getVideoTracks().filter(t => t.enabled && t.readyState === 'live').length > 0;

  // Callback ref to bind MediaStream reliably on DOM mount
  const mediaCallbackRef = useCallback((el) => {
    mediaRef.current = el;
    if (!el) return;
    if (stream) {
      // Only set if different stream to avoid flicker
      if (el.srcObject !== stream) {
        el.srcObject = stream;
      }
      el.play().catch(() => {});

      // Route audio output to selected device (Bluetooth support)
      if (el.setSinkId && selectedOutputDeviceId && selectedOutputDeviceId !== 'default' && !isSelf) {
        el.setSinkId(selectedOutputDeviceId)
          .catch(err => console.warn('[AudioRouting]', err));
      }
    } else {
      el.srcObject = null;
    }
  }, [stream, selectedOutputDeviceId, isSelf]);

  // Re-bind when stream changes
  useEffect(() => {
    const el = mediaRef.current;
    if (!el || !stream) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [stream]);

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    } else {
      el.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        ...styles.tile,
        ...(isPip ? styles.pipTile : {}),
        border: isActive
          ? '2px solid rgba(0,210,255,0.8)'
          : isPip
            ? '2px solid rgba(255,255,255,0.2)'
            : '2px solid rgba(255,255,255,0.05)',
        boxShadow: isActive ? '0 0 20px rgba(0,210,255,0.25)' : isPip ? '0 8px 32px rgba(0,0,0,0.6)' : 'none',
        ...extraStyle,
      }}
      onDoubleClick={hasVideo ? handleFullscreen : undefined}
    >
      {hasVideo ? (
        <video
          ref={mediaCallbackRef}
          autoPlay
          playsInline
          muted={muted}
          disablePictureInPicture
          style={{
            width: '100%',
            height: '100%',
            objectFit: streamType === 'screen' ? 'contain' : 'cover',
            borderRadius: isPip ? '10px' : '12px',
            background: '#050508',
            transform: isSelf && streamType === 'video' ? 'scaleX(-1)' : 'none',
          }}
        />
      ) : (
        /* Audio-only avatar */
        <div style={styles.audioTile}>
          <div style={{
            ...styles.audioRing,
            boxShadow: isActive
              ? '0 0 0 6px rgba(0,210,255,0.2), 0 0 40px rgba(0,210,255,0.15)'
              : '0 0 0 3px rgba(255,255,255,0.08)',
            animation: isActive ? 'pulseGlow 1.8s ease-in-out infinite' : 'none',
          }}>
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
              alt={username}
              style={isPip ? { ...styles.audioAvatar, width: '40px', height: '40px' } : styles.audioAvatar}
            />
          </div>
          <audio ref={mediaCallbackRef} autoPlay playsInline muted={muted} />
        </div>
      )}

      {/* Fullscreen button — only on main tiles, not PiP */}
      {hasVideo && !isPip && (
        <button
          className="rtc-fullscreen-btn"
          onClick={(e) => {
            e.stopPropagation();
            handleFullscreen();
          }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      )}

      {/* Name tag */}
      <div style={{ ...styles.nameTag, ...(isPip ? { fontSize: '0.65rem', padding: '2px 6px', bottom: '6px', left: '6px' } : {}) }}>
        {isSelf && (
          <span style={styles.selfDot} />
        )}
        <span style={styles.nameText}>{username}{isSelf ? ' (You)' : ''}</span>
        {!isPip && streamType && streamType !== 'voice' && (
          <span style={styles.typePill}>
            {streamType === 'screen' ? '🖥 Screen' : '📷 Cam'}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Control Button ──────────────────────────────────────────────── */
function CtrlBtn({ onClick, active, danger, title, children, disabled = false }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={disabled ? null : onClick}
      title={title}
      disabled={disabled}
      onMouseEnter={() => !disabled && setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.18s ease',
        background: disabled
          ? 'rgba(255,255,255,0.03)'
          : danger
            ? (hov ? '#c0392b' : '#e74c3c')
            : active
              ? (hov ? 'rgba(0,210,255,0.35)' : 'rgba(0,210,255,0.2)')
              : (hov ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)'),
        color: disabled
          ? 'rgba(255,255,255,0.2)'
          : danger
            ? '#fff'
            : active
              ? 'var(--accent-cyan)'
              : 'rgba(255,255,255,0.8)',
        boxShadow: disabled
          ? 'none'
          : danger
            ? '0 4px 20px rgba(231,76,60,0.4)'
            : active
              ? '0 2px 12px rgba(0,210,255,0.3)'
              : 'none',
        transform: (!disabled && hov) ? 'scale(1.08)' : 'scale(1)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      {children}
    </button>
  );
}

/* ── Main WebRTC Call UI ─────────────────────────────────────────── */
export default function WebRTCCall() {
  const {
    callRoomId,
    callType,
    localStream,
    remoteStreams,
    micMuted,
    deafened,
    camMuted,
    streamQuality,
    setStreamQuality,
    leaveCallRoom,
    toggleMic,
    toggleCam,
    toggleDeafen,
    switchLocalStreamType,
    currentUser,
  } = useApp();

  const [expanded, setExpanded] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  // Call timer
  useEffect(() => {
    if (!callRoomId) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [callRoomId]);

  if (!callRoomId) return null;

  const formatTime = (s) =>
    `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const isScreenShare = callType === 'screen';
  const isVideo = callType === 'video';

  const hasRemoteStreams = remoteStreams.length > 0;
  const hasLocalVideo = localStream && localStream.getVideoTracks().filter(t => t.readyState === 'live').length > 0;

  // When there are remote streams, show local self-view as small PiP overlay in the corner
  // When alone (no remote streams), show local stream full-size
  const showLocalAsPip = hasRemoteStreams && hasLocalVideo;

  // Grid layout: only remote streams in main grid; local is PiP overlay or solo tile
  const remoteTileCount = remoteStreams.length;
  const gridCols = !hasRemoteStreams
    ? '1fr'
    : remoteTileCount === 1
      ? '1fr'
      : remoteTileCount <= 4
        ? 'repeat(2, 1fr)'
        : 'repeat(3, 1fr)';

  const isSomeoneElseSharing = remoteStreams.some(p => p.streamType === 'screen');

  return (
    <div style={{ ...styles.container, height: expanded ? '100%' : '64px' }}>

      {/* ── Header bar ─────────────────────────────────────── */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.liveBadge}>
            <span style={styles.liveDot} />
            LIVE
          </div>
          <div style={styles.callInfo}>
            <span style={styles.callTypeLabel}>
              {callType === 'screen' ? '🖥 Screen Share' : callType === 'video' ? '📷 Video Call' : '🎙 Voice Call'}
            </span>
            <span style={styles.timerLabel}>{formatTime(elapsed)}</span>
          </div>
          <div style={styles.participantCount}>
            <Users size={12} />
            <span>{remoteStreams.length + 1}</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            style={styles.miniBtn}
            onClick={() => setShowSettings((v) => !v)}
            title="Settings"
          >
            <Settings size={14} />
          </button>
          <button
            style={styles.miniBtn}
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Minimize' : 'Expand'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* ── Settings dropdown ──────────────────────────────── */}
      {showSettings && expanded && (
        <div style={styles.settingsPanel}>
          <label style={styles.settingsLabel}>Video Quality</label>
          <select
            style={styles.settingsSelect}
            value={streamQuality}
            onChange={(e) => setStreamQuality(e.target.value)}
          >
            <option value="1080p">1080p HD</option>
            <option value="720p">720p</option>
            <option value="480p">480p</option>
            <option value="360p">360p (Low bandwidth)</option>
          </select>
        </div>
      )}

      {/* ── Video / Audio Grid ─────────────────────────────── */}
      {expanded && (
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden', minHeight: 0 }}>

          {/* Main grid: remote streams OR local (when alone) */}
          <div style={{ ...styles.grid, gridTemplateColumns: gridCols }}>

            {/* When no remote streams, show local stream full */}
            {!hasRemoteStreams && localStream && (
              <VideoTile
                stream={localStream}
                muted={true}
                username={currentUser?.displayName || currentUser?.username || 'You'}
                streamType={callType}
                isSelf={true}
                isActive={!micMuted}
              />
            )}

            {/* Remote streams — always shown in main grid */}
            {remoteStreams.map((peer) => (
              <VideoTile
                key={peer.socketId}
                stream={deafened ? null : peer.stream}
                muted={deafened}
                username={peer.username}
                streamType={peer.streamType}
                isSelf={false}
                isActive={true}
              />
            ))}

            {/* Empty state */}
            {!localStream && remoteStreams.length === 0 && (
              <div style={styles.emptyState}>
                <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎙</div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  Waiting for others to join…
                </p>
              </div>
            )}
          </div>

          {/* PiP self-view — bottom right corner when remote stream is present */}
          {showLocalAsPip && (
            <div style={styles.pipWrapper}>
              <VideoTile
                stream={localStream}
                muted={true}
                username={currentUser?.displayName || currentUser?.username || 'You'}
                streamType={callType}
                isSelf={true}
                isActive={!micMuted}
                isPip={true}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Controls bar ───────────────────────────────────── */}
      <div style={styles.controls}>
        {/* Mic */}
        <CtrlBtn onClick={toggleMic} active={!micMuted} title={micMuted ? 'Unmute' : 'Mute'}>
          {micMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </CtrlBtn>

        {/* Camera */}
        <CtrlBtn
          onClick={() => switchLocalStreamType(isVideo ? 'voice' : 'video')}
          active={isVideo}
          title={isVideo ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideo ? <Video size={20} /> : <VideoOff size={20} />}
        </CtrlBtn>

        {/* Screen share */}
        <CtrlBtn
          onClick={() => switchLocalStreamType(isScreenShare ? 'voice' : 'screen')}
          active={isScreenShare}
          disabled={isSomeoneElseSharing && !isScreenShare}
          title={isScreenShare ? 'Stop sharing' : isSomeoneElseSharing ? 'Someone else is sharing screen' : 'Share screen'}
        >
          {isScreenShare ? <MonitorOff size={20} /> : <Monitor size={20} />}
        </CtrlBtn>

        {/* Deafen */}
        <CtrlBtn onClick={toggleDeafen} active={!deafened} title={deafened ? 'Undeafen' : 'Deafen'}>
          {deafened ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </CtrlBtn>

        {/* Disconnect */}
        <CtrlBtn onClick={leaveCallRoom} danger title="Leave call">
          <PhoneOff size={20} />
        </CtrlBtn>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, rgba(6,7,12,0.98) 0%, rgba(8,9,16,0.98) 100%)',
    borderBottom: '1px solid rgba(0,210,255,0.12)',
    overflow: 'hidden',
    transition: 'height 0.25s ease',
    flexShrink: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  liveBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: 'rgba(231,76,60,0.2)',
    border: '1px solid rgba(231,76,60,0.5)',
    borderRadius: '20px',
    padding: '3px 10px',
    fontSize: '0.65rem',
    fontWeight: '800',
    letterSpacing: '1px',
    color: '#e74c3c',
  },
  liveDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#e74c3c',
    animation: 'pulseGlow 1.5s infinite',
    flexShrink: 0,
  },
  callInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  callTypeLabel: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  timerLabel: {
    fontSize: '0.78rem',
    color: 'rgba(255,255,255,0.4)',
    fontVariantNumeric: 'tabular-nums',
    fontFamily: 'monospace',
  },
  participantCount: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.4)',
  },
  miniBtn: {
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'rgba(255,255,255,0.6)',
    padding: '5px 8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.15s',
  },
  settingsPanel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 16px',
    background: 'rgba(0,0,0,0.3)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  settingsLabel: {
    fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.5)',
  },
  settingsSelect: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.78rem',
    padding: '4px 8px',
    cursor: 'pointer',
    outline: 'none',
  },
  grid: {
    width: '100%',
    height: '100%',
    display: 'grid',
    gap: '10px',
    padding: '12px',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  tile: {
    position: 'relative',
    borderRadius: '12px',
    background: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    minHeight: '120px',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  pipTile: {
    // PiP self-view styling (actual positioning done by pipWrapper)
    borderRadius: '10px',
    width: '100%',
    height: '100%',
    minHeight: 'unset',
  },
  pipWrapper: {
    position: 'absolute',
    bottom: '14px',
    right: '14px',
    width: '160px',
    height: '105px',
    zIndex: 10,
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 8px 32px rgba(0,0,0,0.7)',
    border: '2px solid rgba(255,255,255,0.18)',
  },
  audioTile: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '12px',
    padding: '20px',
    background: 'linear-gradient(135deg, rgba(0,210,255,0.04) 0%, rgba(212,0,255,0.04) 100%)',
  },
  audioRing: {
    borderRadius: '50%',
    padding: '6px',
    background: 'rgba(255,255,255,0.05)',
    transition: 'box-shadow 0.3s ease',
  },
  audioAvatar: {
    width: '72px',
    height: '72px',
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'block',
  },
  nameTag: {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(6px)',
    borderRadius: '20px',
    padding: '4px 10px',
    fontSize: '0.75rem',
  },
  selfDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#2ecc71',
    flexShrink: 0,
  },
  nameText: {
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  typePill: {
    background: 'rgba(0,210,255,0.2)',
    border: '1px solid rgba(0,210,255,0.3)',
    borderRadius: '8px',
    padding: '1px 6px',
    fontSize: '0.65rem',
    color: 'var(--accent-cyan)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '12px 20px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(0,0,0,0.2)',
    flexShrink: 0,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gridColumn: '1 / -1',
    padding: '40px',
  },
};
