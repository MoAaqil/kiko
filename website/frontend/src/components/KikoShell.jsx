import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { 
  MessageSquare, Users, Hash, Plus, Search, X, CornerUpLeft, Send,
  Paperclip, Volume2, Video, Compass, Shield, LogOut, Trash2, Menu,
  Gamepad2, Copy, Check, Phone, Monitor, Mic, MicOff, Headphones, Settings,
  ChevronDown, MoreVertical, User, Link2, HelpCircle, Moon, Sun, Sliders
} from 'lucide-react';
import WebRTCCall from './WebRTCCall.jsx';
import ProfileModal from './ProfileModal.jsx';
import { KikoLogo } from './AuthPage.jsx';

// Simple Markdown + Code block parser
function parseMarkdown(text) {
  if (!text) return '';
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Triple backtick code blocks
  html = html.replace(/```([\s\S]+?)```/g, '<pre><code>$1</code></pre>');
  // Single backtick inline code
  html = html.replace(/`([^`\n]+?)`/g, '<code>$1</code>');
  // Bold
  html = html.replace(/\*\*([\s\S]+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*([\s\S]+?)\*/g, '<em>$1</em>');

  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

// ─── Web Audio SFX Synthesizer ────────────────────────────────────────────────
function playSFX(type) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    if (type === 'pop') {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(420, now);
      o.frequency.exponentialRampToValueAtTime(900, now + 0.09);
      g.gain.setValueAtTime(0.14, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      o.start(now); o.stop(now + 0.09);
    } else if (type === 'click') {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(1100, now);
      o.frequency.exponentialRampToValueAtTime(1600, now + 0.04);
      g.gain.setValueAtTime(0.07, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      o.start(now); o.stop(now + 0.04);
    } else if (type === 'ring') {
      [0, 0.15].forEach(delay => {
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.setValueAtTime(660, now + delay);
        g.gain.setValueAtTime(0.0, now + delay);
        g.gain.linearRampToValueAtTime(0.1, now + delay + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4);
        o.start(now + delay); o.stop(now + delay + 0.4);
      });
    } else if (type === 'join') {
      // Rising tone for joining a call
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(350, now);
      o.frequency.exponentialRampToValueAtTime(700, now + 0.25);
      g.gain.setValueAtTime(0.1, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      o.start(now); o.stop(now + 0.25);
    }
  } catch (_) { /* Audio may not be available in all contexts */ }
}

// ─── Voice Waveform Visualizer (AudioContext Fixed) ──────────────────────────
// Fix: AudioContext + MediaElementSource must be created ONCE per audio element.
// Re-creating on each play throws InvalidStateError → no sound.
function VoiceWaveform({ audioUrl }) {
  const { selectedOutputDeviceId } = useApp();
  const canvasRef    = useRef(null);
  const audioRef     = useRef(null);
  const analyserRef  = useRef(null);
  const audioCtxRef  = useRef(null);   // persist across plays
  const animFrameRef = useRef(null);
  const connectedRef = useRef(false);  // source connected only once
  const [isPlaying, setIsPlaying]   = useState(false);
  const [duration, setDuration]     = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [bars] = useState(() =>
    Array.from({ length: 40 }, () => Math.random() * 0.65 + 0.1)
  );

  useEffect(() => {
    const el = audioRef.current;
    if (el && el.setSinkId && selectedOutputDeviceId && selectedOutputDeviceId !== 'default') {
      el.setSinkId(selectedOutputDeviceId)
        .catch(err => console.warn('[VoiceWaveform] setSinkId error:', err));
    }
  }, [selectedOutputDeviceId]);

  const drawStatic = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width; const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const barW = W / bars.length - 1.5;
    bars.forEach((h, i) => {
      const bH = Math.max(4, h * H);
      const x = i * (barW + 1.5);
      const y = (H - bH) / 2;
      const grad = ctx.createLinearGradient(0, y, 0, y + bH);
      grad.addColorStop(0, 'rgba(139,92,246,0.55)');
      grad.addColorStop(1, 'rgba(217,70,239,0.35)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, bH, 3);
      ctx.fill();
    });
  };

  const drawLive = () => {
    const canvas   = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width; const H = canvas.height;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    ctx.clearRect(0, 0, W, H);
    const barCount = 40;
    const step = Math.floor(data.length / barCount);
    const barW  = W / barCount - 1.5;
    for (let i = 0; i < barCount; i++) {
      const val = data[i * step] / 255;
      const bH  = Math.max(3, val * H);
      const x   = i * (barW + 1.5);
      const y   = (H - bH) / 2;
      const grad = ctx.createLinearGradient(0, y, 0, y + bH);
      grad.addColorStop(0, `rgba(139,92,246,${0.5 + val * 0.5})`);
      grad.addColorStop(1, `rgba(217,70,239,${0.4 + val * 0.6})`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, bH, 3);
      ctx.fill();
    }
    animFrameRef.current = requestAnimationFrame(drawLive);
  };

  useEffect(() => {
    drawStatic();
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      cancelAnimationFrame(animFrameRef.current);
      drawStatic();
      setIsPlaying(false);
      return;
    }

    // Create AudioContext once, resume if suspended
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const audioCtx = audioCtxRef.current;
      if (audioCtx.state === 'suspended') await audioCtx.resume();

      // Connect MediaElementSource ONCE only
      if (!connectedRef.current) {
        const source   = audioCtx.createMediaElementSource(audio);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioCtx.destination); // critical: must reach destination for sound!
        analyserRef.current = analyser;
        connectedRef.current = true;
      }
    } catch (e) {
      console.warn('[VoiceWaveform] AudioContext error:', e);
    }

    try {
      await audio.play();
      setIsPlaying(true);
      drawLive();
    } catch (e) {
      console.warn('[VoiceWaveform] Playback failed:', e);
    }
  };

  const fmtTime = t => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '10px',
      background: 'rgba(139,92,246,0.08)', borderRadius: '14px',
      padding: '10px 14px', border: '1px solid rgba(139,92,246,0.25)',
      minWidth: '260px', maxWidth: '360px', backdropFilter: 'blur(8px)',
    }}>
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="metadata"
        onLoadedMetadata={e => setDuration(e.target.duration)}
        onTimeUpdate={e => setCurrentTime(e.target.currentTime)}
        onEnded={() => {
          setIsPlaying(false); setCurrentTime(0);
          cancelAnimationFrame(animFrameRef.current); drawStatic();
        }}
        style={{ display: 'none' }}
      />
      <button onClick={handlePlayPause} style={{
        width: '38px', height: '38px', borderRadius: '50%',
        background: isPlaying
          ? 'linear-gradient(135deg, #d946ef, #8b5cf6)'
          : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
        border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, boxShadow: `0 4px 16px rgba(139,92,246,${isPlaying ? 0.6 : 0.35})`,
        transition: 'all 0.2s',
      }}>
        {isPlaying
          ? <span style={{ color: '#fff', fontSize: '0.75rem' }}>⏸</span>
          : <span style={{ color: '#fff', fontSize: '0.85rem', marginLeft: '2px' }}>▶</span>
        }
      </button>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <canvas ref={canvasRef} width={180} height={32}
          style={{ width: '100%', height: '32px', cursor: 'pointer' }}
          onClick={e => {
            const audio = audioRef.current;
            if (!audio || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}
        />
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', cursor: 'pointer', position: 'relative' }}
          onClick={e => {
            const audio = audioRef.current;
            if (!audio || !duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
          }}
        >
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #8b5cf6, #d946ef)', borderRadius: '2px', transition: 'width 0.1s linear' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>
          <span>🎙 Voice Message</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtTime(currentTime)} / {fmtTime(duration || 0)}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Profile Particle Effects ──────────────────────────────────────────────────
function ProfileEffects({ type }) {
  const [particles] = useState(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: `${(i / 18) * 100 + Math.random() * 5}%`,
      delay: `${(Math.random() * 5).toFixed(2)}s`,
      dur: `${(Math.random() * 5 + 4).toFixed(2)}s`,
      size: `${Math.random() * 7 + 4}px`,
      opacity: (Math.random() * 0.5 + 0.4).toFixed(2),
    }))
  );
  if (!type || type === 'none') return null;
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 3 }}>
      {type === 'sakura' && particles.map(p => (
        <span key={p.id} style={{
          position: 'absolute', top: '-12px', left: p.left,
          width: p.size, height: p.size,
          background: 'linear-gradient(135deg, #ffb7c5, #ff8fab)',
          borderRadius: '50% 0 50% 50%',
          opacity: p.opacity,
          animation: `kikoSakuraFall ${p.dur} linear ${p.delay} infinite`,
          boxShadow: '0 0 4px rgba(255,143,171,0.5)',
        }} />
      ))}
      {type === 'sparkles' && particles.map(p => (
        <span key={p.id} style={{
          position: 'absolute',
          top: `${Math.random() * 90}%`,
          left: p.left,
          width: p.size, height: p.size,
          background: '#ffe066',
          borderRadius: '50%',
          opacity: p.opacity,
          boxShadow: `0 0 8px #ffe066, 0 0 16px #ffe066`,
          animation: `kikoSparkle ${p.dur} ease-in-out ${p.delay} infinite`,
        }} />
      ))}
      {type === 'neon' && particles.map(p => (
        <span key={p.id} style={{
          position: 'absolute', top: '-30px', left: p.left,
          width: '1.5px',
          height: `${parseInt(p.size) * 5}px`,
          background: 'linear-gradient(to bottom, transparent, #00ffcc, transparent)',
          opacity: p.opacity,
          animation: `kikoNeonDrop ${p.dur} linear ${p.delay} infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Tic-Tac-Toe Game Widget ───────────────────────────────────────────────────
function TicTacToeWidget({ startMsgId, chatHistory, onMove, currentUserId }) {
  const board = Array.from({ length: 3 }, () => Array(3).fill(null));
  let xTurn = true;
  const moves = chatHistory.filter(
    m => m.content?.startsWith(`[GAME_MOVE] ${startMsgId},`)
  );
  moves.forEach(m => {
    const parts = m.content.replace(`[GAME_MOVE] ${startMsgId},`, '').split(',');
    const r = parseInt(parts[0]); const c = parseInt(parts[1]);
    if (!isNaN(r) && !isNaN(c) && r >= 0 && r < 3 && c >= 0 && c < 3 && !board[r][c]) {
      board[r][c] = xTurn ? '✕' : '◯';
      xTurn = !xTurn;
    }
  });

  const startMsg = chatHistory.find(m => m.id === startMsgId);
  const playerX = startMsg ? startMsg.userId : null;

  // Determine player O: first person who made a non-X move
  let playerO = null;
  for (const m of moves) {
    if (m.userId !== playerX) {
      playerO = m.userId;
      break;
    }
  }

  // Enforce Turn restriction
  // Player X plays ✕, Player O plays ◯
  const isMyTurn = xTurn
    ? (currentUserId === playerX)
    : (playerO ? currentUserId === playerO : currentUserId !== playerX);

  const checkWin = () => {
    const lines = [
      [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
      [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
      [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]],
    ];
    for (const line of lines) {
      const [a, b, c] = line;
      if (board[a[0]][a[1]] && board[a[0]][a[1]] === board[b[0]][b[1]] && board[a[0]][a[1]] === board[c[0]][c[1]])
        return board[a[0]][a[1]];
    }
    return null;
  };

  const winner = checkWin();
  const isFull = board.every(row => row.every(cell => cell !== null));

  // Build beautiful status message
  let statusMsg = '';
  if (winner) {
    const winnerId = winner === '✕' ? playerX : playerO;
    if (winnerId === currentUserId) {
      statusMsg = '🎉 You won!';
    } else {
      const winnerName = winner === '✕'
        ? (startMsg?.user?.displayName || 'Player X')
        : 'Opponent';
      statusMsg = `🎉 ${winnerName} won!`;
    }
  } else if (isFull) {
    statusMsg = '🤝 Draw!';
  } else {
    statusMsg = isMyTurn ? '👉 Your turn!' : '⏳ Opponent\'s turn...';
  }

  return (
    <div style={{
      padding: '14px', background: 'rgba(20,20,35,0.4)',
      border: '1px solid rgba(139,92,246,0.3)', borderRadius: '14px',
      width: '220px', display: 'flex', flexDirection: 'column', gap: '10px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#a78bfa' }}>🎮 Tic-Tac-Toe</span>
        <span style={{ fontSize: '0.74rem', fontWeight: '600', color: winner ? '#ffd700' : isMyTurn ? '#34d399' : 'rgba(255,255,255,0.4)' }}>{statusMsg}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
        {board.map((row, r) => row.map((cell, c) => (
          <button
            key={`${r}-${c}`}
            disabled={!!cell || !!winner || isFull || !isMyTurn}
            onClick={() => { playSFX('click'); onMove(r, c); }}
            style={{
              height: '52px',
              background: cell ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px',
              color: cell === '✕' ? '#8b5cf6' : '#d946ef',
              fontSize: '1.4rem', fontWeight: '800',
              cursor: (cell || winner || !isMyTurn) ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
              opacity: (!cell && !isMyTurn) ? 0.5 : 1,
            }}
            onMouseEnter={e => { if (!cell && !winner && isMyTurn) e.target.style.background = 'rgba(139,92,246,0.15)'; }}
            onMouseLeave={e => { e.target.style.background = cell ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)'; }}
          >
            {cell}
          </button>
        )))}
      </div>
      {(winner || isFull) && (
        <button
          onClick={() => { playSFX('click'); onMove('reset', 'reset', 'Tic-Tac-Toe'); }}
          style={{
            padding: '7px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(139,92,246,0.4)', borderRadius: '8px',
            color: '#a78bfa', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '700',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.target.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))'}
          onMouseLeave={e => e.target.style.background = 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))'}
        >
          🔄 New Game
        </button>
      )}
    </div>
  );
}

function ConnectFourWidget({ startMsgId, chatHistory, onMove, currentUserId }) {
  const board = Array.from({ length: 6 }, () => Array(7).fill(null));
  let xTurn = true;
  const moves = chatHistory.filter(
    m => m.content?.startsWith(`[GAME_MOVE] ${startMsgId},`)
  );

  moves.forEach(m => {
    const col = parseInt(m.content.replace(`[GAME_MOVE] ${startMsgId},`, ''));
    if (!isNaN(col) && col >= 0 && col < 7) {
      let row = -1;
      for (let r = 5; r >= 0; r--) {
        if (!board[r][col]) {
          row = r;
          break;
        }
      }
      if (row !== -1) {
        board[row][col] = xTurn ? '🔴' : '🟡';
        xTurn = !xTurn;
      }
    }
  });

  const startMsg = chatHistory.find(m => m.id === startMsgId);
  const playerX = startMsg ? startMsg.userId : null;

  let playerO = null;
  for (const m of moves) {
    if (m.userId !== playerX) {
      playerO = m.userId;
      break;
    }
  }

  const isMyTurn = xTurn
    ? (currentUserId === playerX)
    : (playerO ? currentUserId === playerO : currentUserId !== playerX);

  const checkWin = () => {
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] && board[r][c] === board[r][c+1] && board[r][c] === board[r][c+2] && board[r][c] === board[r][c+3])
          return board[r][c];
      }
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 7; c++) {
        if (board[r][c] && board[r][c] === board[r+1][c] && board[r][c] === board[r+2][c] && board[r][c] === board[r+3][c])
          return board[r][c];
      }
    }
    for (let r = 3; r < 6; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] && board[r][c] === board[r-1][c+1] && board[r][c] === board[r-2][c+2] && board[r][c] === board[r-3][c+3])
          return board[r][c];
      }
    }
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        if (board[r][c] && board[r][c] === board[r+1][c+1] && board[r][c] === board[r+2][c+2] && board[r][c] === board[r+3][c+3])
          return board[r][c];
      }
    }
    return null;
  };

  const winner = checkWin();
  const isFull = board.every(row => row.every(cell => cell !== null));

  let statusMsg = '';
  if (winner) {
    const winnerId = winner === '🔴' ? playerX : playerO;
    if (winnerId === currentUserId) {
      statusMsg = '🎉 You won!';
    } else {
      const winnerName = winner === '🔴'
        ? (startMsg?.user?.displayName || 'Red')
        : 'Opponent';
      statusMsg = `🎉 ${winnerName} won!`;
    }
  } else if (isFull) {
    statusMsg = '🤝 Draw!';
  } else {
    statusMsg = isMyTurn ? '👉 Your turn!' : '⏳ Opponent\'s turn...';
  }

  return (
    <div style={{
      padding: '14px', background: 'rgba(20,20,35,0.4)',
      border: '1px solid rgba(0,210,255,0.3)', borderRadius: '14px',
      width: '240px', display: 'flex', flexDirection: 'column', gap: '10px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#00d2ff' }}>🎮 Connect Four</span>
        <span style={{ fontSize: '0.72rem', fontWeight: '600', color: winner ? '#ffd700' : isMyTurn ? '#34d399' : 'rgba(255,255,255,0.4)' }}>{statusMsg}</span>
      </div>

      {!winner && !isFull && isMyTurn && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
          {Array.from({ length: 7 }).map((_, c) => {
            const isColFull = !!board[0][c];
            return (
              <button
                key={c}
                disabled={isColFull}
                onClick={() => { playSFX('click'); onMove(c, '', 'Connect-Four'); }}
                style={{
                  padding: '4px 0', background: 'rgba(0,210,255,0.1)',
                  border: '1px solid rgba(0,210,255,0.3)', borderRadius: '6px',
                  color: '#00d2ff', fontSize: '0.75rem', cursor: isColFull ? 'default' : 'pointer',
                  fontWeight: '700', transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (!isColFull) e.target.style.background = 'rgba(0,210,255,0.25)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(0,210,255,0.1)'; }}
              >
                ▼
              </button>
            );
          })}
        </div>
      )}

      <div style={{
        background: '#15162a', padding: '8px', borderRadius: '10px',
        border: '1.5px solid rgba(0,210,255,0.2)',
        display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px'
      }}>
        {board.map((row, r) => row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              height: '24px', width: '24px', borderRadius: '50%',
              background: cell === '🔴' ? '#ef4444' : cell === '🟡' ? '#fbbf24' : '#23243a',
              boxShadow: cell ? 'inset 0 2px 6px rgba(0,0,0,0.4), 0 0 8px currentColor' : 'none',
              color: cell === '🔴' ? '#ef4444' : '#fbbf24',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          />
        )))}
      </div>

      {(winner || isFull) && (
        <button
          onClick={() => { playSFX('click'); onMove('reset', 'reset', 'Connect-Four'); }}
          style={{
            padding: '7px', background: 'linear-gradient(135deg, rgba(0,210,255,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(0,210,255,0.4)', borderRadius: '8px',
            color: '#00d2ff', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '700',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.target.style.background = 'linear-gradient(135deg, rgba(0,210,255,0.3), rgba(139,92,246,0.3))'}
          onMouseLeave={e => e.target.style.background = 'linear-gradient(135deg, rgba(0,210,255,0.2), rgba(139,92,246,0.2))'}
        >
          🔄 New Game
        </button>
      )}
    </div>
  );
}

function RockPaperScissorsWidget({ startMsgId, chatHistory, onMove, currentUserId }) {
  const moves = chatHistory.filter(
    m => m.content?.startsWith(`[GAME_MOVE] ${startMsgId},`)
  );

  const startMsg = chatHistory.find(m => m.id === startMsgId);
  const playerX = startMsg ? startMsg.userId : null;

  let playerO = null;
  for (const m of moves) {
    if (m.userId !== playerX) {
      playerO = m.userId;
      break;
    }
  }

  const choiceX = moves.find(m => m.userId === playerX)?.content.replace(`[GAME_MOVE] ${startMsgId},`, '') || null;
  const choiceO = (playerO && moves.find(m => m.userId === playerO))?.content.replace(`[GAME_MOVE] ${startMsgId},`, '') || null;

  const isPlayerX = currentUserId === playerX;
  const isPlayerO = currentUserId === playerO || (!isPlayerX && !playerO && currentUserId);
  const hasPlayed = isPlayerX ? !!choiceX : (isPlayerO ? !!choiceO : false);

  const getWinner = () => {
    if (!choiceX || !choiceO) return null;
    if (choiceX === choiceO) return 'draw';
    if (
      (choiceX === 'rock' && choiceO === 'scissors') ||
      (choiceX === 'paper' && choiceO === 'rock') ||
      (choiceX === 'scissors' && choiceO === 'paper')
    ) {
      return 'playerX';
    }
    return 'playerO';
  };

  const gameResult = getWinner();

  let statusMsg = '';
  if (choiceX && choiceO) {
    if (gameResult === 'draw') statusMsg = '🤝 Draw!';
    else if (gameResult === 'playerX') {
      statusMsg = isPlayerX ? '🎉 You Won!' : '😔 Opponent Won!';
    } else {
      statusMsg = isPlayerO ? '🎉 You Won!' : '😔 Opponent Won!';
    }
  } else {
    if (choiceX && !choiceO) {
      statusMsg = isPlayerX ? '⏳ Waiting...' : '👉 Your Turn!';
    } else if (!choiceX && choiceO) {
      statusMsg = isPlayerO ? '⏳ Waiting...' : '👉 Your Turn!';
    } else {
      statusMsg = '👉 Choose move!';
    }
  }

  const emojiMap = { rock: '🪨', paper: '📄', scissors: '✂️' };

  return (
    <div style={{
      padding: '14px', background: 'rgba(20,20,35,0.4)',
      border: '1px solid rgba(217,70,239,0.3)', borderRadius: '14px',
      width: '240px', display: 'flex', flexDirection: 'column', gap: '12px',
      backdropFilter: 'blur(12px)',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#d946ef' }}>🎮 RPS Showdown</span>
        <span style={{ fontSize: '0.72rem', fontWeight: '600', color: choiceX && choiceO ? '#ffd700' : '#34d399' }}>{statusMsg}</span>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '10px',
        border: '1px solid rgba(255,255,255,0.04)'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
            {isPlayerX ? 'You' : (startMsg?.user?.displayName || 'Player 1')}
          </span>
          <span style={{ fontSize: '1.8rem' }}>
            {choiceX && choiceO ? emojiMap[choiceX] : (choiceX ? '✔️' : '⏳')}
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'rgba(255,255,255,0.15)' }}>VS</span>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>
            {isPlayerO ? 'You' : 'Opponent'}
          </span>
          <span style={{ fontSize: '1.8rem' }}>
            {choiceX && choiceO ? emojiMap[choiceO] : (choiceO ? '✔️' : '⏳')}
          </span>
        </div>
      </div>

      {!hasPlayed && (currentUserId === playerX || !choiceO || !choiceX) && (
        <div style={{ display: 'flex', gap: '6px' }}>
          {['rock', 'paper', 'scissors'].map(choice => (
            <button
              key={choice}
              onClick={() => { playSFX('click'); onMove(choice, '', 'Rock-Paper-Scissors'); }}
              style={{
                flex: 1, padding: '8px 4px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px',
                color: '#fff', fontSize: '1.2rem', cursor: 'pointer',
                transition: 'all 0.15s'
              }}
              onMouseEnter={e => e.target.style.background = 'rgba(217,70,239,0.15)'}
              onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.04)'}
            >
              {emojiMap[choice]}
            </button>
          ))}
        </div>
      )}

      {(choiceX && choiceO) && (
        <button
          onClick={() => { playSFX('click'); onMove('reset', 'reset', 'Rock-Paper-Scissors'); }}
          style={{
            padding: '7px', background: 'linear-gradient(135deg, rgba(217,70,239,0.2), rgba(139,92,246,0.2))',
            border: '1px solid rgba(217,70,239,0.4)', borderRadius: '8px',
            color: '#f472b6', fontSize: '0.78rem', cursor: 'pointer', fontWeight: '700',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.target.style.background = 'linear-gradient(135deg, rgba(217,70,239,0.3), rgba(139,92,246,0.3))'}
          onMouseLeave={e => e.target.style.background = 'linear-gradient(135deg, rgba(217,70,239,0.2), rgba(139,92,246,0.2))'}
        >
          🔄 Rematch
        </button>
      )}
    </div>
  );
}

// Attachment Card with 24h Countdown + PDF viewer/download
function EphemeralAttachment({ fileUrl, fileName, fileType, fileSize, expiresAt, isExpired }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [pdfOpen, setPdfOpen] = useState(false);

  useEffect(() => {
    if (isExpired || !expiresAt) return;

    const updateTimer = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, isExpired]);

  if (isExpired || timeLeft === 'Expired') {
    return (
      <div style={styles.expiredAttachment}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>🔒 Media expired (24h privacy limit reached)</span>
      </div>
    );
  }

  const isImage = fileType?.startsWith('image/');
  const isVideo = fileType?.startsWith('video/');
  const isAudio = fileType?.startsWith('audio/');
  const isPdf   = fileType === 'application/pdf' || fileName?.toLowerCase().endsWith('.pdf');
  const sizeMb  = fileSize ? (fileSize / (1024 * 1024)).toFixed(2) : '?';
  const ext     = fileName?.split('.').pop()?.toUpperCase() || 'FILE';

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileName || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      {/* PDF inline viewer overlay */}
      {pdfOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(10px)', zIndex: 9999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: '90%', maxWidth: '960px', height: '85vh', display: 'flex', flexDirection: 'column', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', background: '#1e293b' }}>
              <span style={{ color: '#fff', fontWeight: '600', fontSize: '0.9rem' }}>📄 {fileName}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={handleDownload} style={{ padding: '6px 14px', background: 'rgba(0,210,255,0.15)', border: '1px solid rgba(0,210,255,0.4)', borderRadius: '6px', color: '#00d2ff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>⬇ Download</button>
                <button onClick={() => setPdfOpen(false)} style={{ padding: '6px 14px', background: 'rgba(255,100,100,0.15)', border: '1px solid rgba(255,100,100,0.4)', borderRadius: '6px', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>✕ Close</button>
              </div>
            </div>
            <iframe
              src={fileUrl}
              title={fileName}
              style={{ flex: 1, width: '100%', border: 'none' }}
            />
          </div>
        </div>
      )}

      <div style={styles.attachmentCard} className="glass-panel">
        {isImage && (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            <img src={fileUrl} alt={fileName} style={styles.attachmentPreview} />
          </a>
        )}
        {isVideo && <video src={fileUrl} controls style={styles.attachmentVideo} />}
        {isAudio && <VoiceWaveform audioUrl={fileUrl} />}

        {/* PDF or generic file card */}
        {!isImage && !isVideo && !isAudio && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '10px 14px', background: 'rgba(0,0,0,0.2)',
            borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '8px',
              background: isPdf ? 'rgba(239,68,68,0.15)' : 'rgba(88,101,242,0.15)',
              border: isPdf ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(88,101,242,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: '800', color: isPdf ? '#ef4444' : '#5865f2',
              flexShrink: 0,
            }}>
              {ext}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fileName}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{sizeMb} MB</div>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
              {isPdf && (
                <button
                  onClick={() => setPdfOpen(true)}
                  title="View PDF"
                  style={{
                    padding: '6px 10px', background: 'rgba(0,210,255,0.1)',
                    border: '1px solid rgba(0,210,255,0.3)', borderRadius: '6px',
                    color: '#00d2ff', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600',
                  }}
                >
                  👁 View
                </button>
              )}
              <button
                onClick={handleDownload}
                title="Download file"
                style={{
                  padding: '6px 10px', background: 'rgba(88,101,242,0.1)',
                  border: '1px solid rgba(88,101,242,0.3)', borderRadius: '6px',
                  color: '#8891f0', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600',
                }}
              >
                ⬇ Save
              </button>
            </div>
          </div>
        )}

        <div style={styles.attachmentMeta}>
          {timeLeft && (
            <div style={styles.countdownBadge}>⏳ Expires in: <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{timeLeft}</span></div>
          )}
        </div>
      </div>
    </>
  );
}

export default function KikoShell() {
  const {
    currentUser,
    safeJson,
    token,
    friends,
    servers,
    activeServerId,
    activeChannelId,
    activeDMUserId,
    messages,
    typingUsers,
    connected,
    logout,
    loadFriends,
    sendFriendRequest,
    respondFriendRequest,
    removeFriend,
    loadServers,
    createServer,
    joinServer,
    createChannel,
    loadServerMembers,
    fetchMessages,
    sendMessage,
    deleteMessage,
    clearChat,
    addReaction,
    removeReaction,
    sendTypingStatus,
    joinCallRoom,
    callRoomId,
    voiceChannelsState,
    updateProfile,
    setActiveServerId,
    setActiveChannelId,
    setActiveDMUserId,
    incomingCall,
    setIncomingCall,
    bgWallpaper,
    setBgWallpaper,
    leaveServer,
    deleteServer,
    micMuted,
    deafened,
    toggleMic,
    toggleDeafen,
    unreadCounts,
  } = useApp();

  // Delete confirmation modal state
  const [deleteConfirmMessageId, setDeleteConfirmMessageId] = useState(null);
  const triggerDeleteMessageModal = (messageId) => {
    setDeleteConfirmMessageId(messageId);
  };

  // Toast Notification System
  const [toasts, setToasts] = useState([]);
  const showToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // Bluetooth Device Detection state
  const [bluetoothConnected, setBluetoothConnected] = useState(false);
  const [activeBluetoothName, setActiveBluetoothName] = useState('');

  useEffect(() => {
    const checkBluetooth = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const btDevice = devices.find(d => 
          d.label.toLowerCase().includes('bluetooth') || 
          d.label.toLowerCase().includes('airpod') || 
          d.label.toLowerCase().includes('headset')
        );
        if (btDevice) {
          setBluetoothConnected(true);
          setActiveBluetoothName(btDevice.label.replace(/\s*\(.*?\)\s*/g, '').trim());
        } else {
          setBluetoothConnected(false);
          setActiveBluetoothName('');
        }
      } catch (_) {}
    };
    checkBluetooth();
    try {
      navigator.mediaDevices.addEventListener('devicechange', checkBluetooth);
      return () => navigator.mediaDevices.removeEventListener('devicechange', checkBluetooth);
    } catch (_) {}
  }, []);

  // Dialog / Modal Visibility States
  const [profileOpen, setProfileOpen] = useState(false);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [searchEngineOpen, setSearchEngineOpen] = useState(false);
  const [newServerOpen, setNewServerOpen] = useState(false);
  const [joinServerOpen, setJoinServerOpen] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);

  // Form Input States
  const [serverName, setServerName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState('TEXT');
  const [friendUsername, setFriendUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // UI view states
  const [friendTab, setFriendTab] = useState('online'); // 'online' | 'all' | 'pending' | 'add'
  const [chatInput, setChatInput] = useState('');
  const [replyMessage, setReplyMessage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Responsive: detect mobile (<= 768px) via JS so inline styles can adapt
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Voice recorder state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  // Global user search
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState([]);

  // Server Members cache
  const [serverMembers, setServerMembers] = useState([]);
  const [activeUserDetail, setActiveUserDetail] = useState(null);

  // Emoji picker & Markdown toolbar
  const [emojiDrawerOpen, setEmojiDrawerOpen] = useState(false);
  const [showMdToolbar, setShowMdToolbar] = useState(false);

  // Mini-game active game-start message ID
  const [activeTTTId, setActiveTTTId] = useState(null);
  const [showGameMenu, setShowGameMenu] = useState(false);

  useEffect(() => {
    if (!showGameMenu) return;
    const close = () => setShowGameMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [showGameMenu]);

  const chatEndRef = useRef(null);

  // Initialize
  useEffect(() => {
    loadFriends();
    loadServers();
  }, []);

  // Auto close mobile drawer on navigation
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeChannelId, activeDMUserId, activeServerId]);

  // Close profile popover when clicking anywhere else
  useEffect(() => {
    if (!profilePopoverOpen) return;
    const closePopover = () => setProfilePopoverOpen(false);
    window.addEventListener('click', closePopover);
    return () => window.removeEventListener('click', closePopover);
  }, [profilePopoverOpen]);

  // Handle global user search input
  const handleGlobalSearchChange = async (e) => {
    const q = e.target.value;
    setGlobalSearchQuery(q);
    if (!q) {
      setGlobalSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/api/friends/search?query=${encodeURIComponent(q)}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('kiko_token')}` }
      });
      if (res.ok) {
        const data = await safeJson(res);
        setGlobalSearchResults(data);
      }
    } catch (err) {
      console.error('[GlobalSearch Error]', err);
    }
  };

  // Scroll to bottom of chat
  useEffect(() => {
    const chatKey = activeChannelId
      ? `channel:${activeChannelId}`
      : activeDMUserId
        ? `dm:${[currentUser?.id, activeDMUserId].sort().join('-')}`
        : null;

    if (chatKey && messages[chatKey]) {
      const chatMsgs = messages[chatKey];
      if (chatMsgs.length > 0) {
        const lastMsg = chatMsgs[chatMsgs.length - 1];
        if (lastMsg.content?.startsWith('[GAME_MOVE]')) {
          // Skip scrolling if the last message is a game move
          return;
        }
      }
    }

    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId, activeDMUserId]);

  // Load server members when switching servers
  useEffect(() => {
    if (activeServerId) {
      fetch(`/api/servers/${activeServerId}/members`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('kiko_token')}` }
      })
      .then(res => safeJson(res))
      .then(data => setServerMembers(data))
      .catch(e => console.error(e));
    }
  }, [activeServerId, servers]);

  // Load server members when active server changes
  useEffect(() => {
    if (activeServerId) {
      loadServerMembers(activeServerId).then(setServerMembers);
    } else {
      setServerMembers([]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeServerId]);

  useEffect(() => {
    if (activeDMUserId) {
      fetch(`/api/auth/users/${activeDMUserId}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('kiko_token')}` }
      })
      .then(res => safeJson(res))
      .then(data => setActiveUserDetail(data))
      .catch(e => console.error(e));
    }
  }, [activeDMUserId]);

  // Fetch message history when active chat changes
  useEffect(() => {
    // Clear current text input draft when switching chats to prevent accidental sends to wrong people
    setChatInput('');
    setReplyMessage(null);
    setSelectedFile(null);
    setFilePreview(null);

    if (!currentUser?.id) return;
    if (activeChannelId) {
      fetchMessages(`channel:${activeChannelId}`, activeChannelId, true);
    } else if (activeDMUserId) {
      fetchMessages(`dm:${[currentUser.id, activeDMUserId].sort().join('-')}`, activeDMUserId, false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannelId, activeDMUserId, currentUser?.id]);

  const activeServer = servers.find(s => s.id === activeServerId);
  const activeChannel = activeServer?.channels?.find(c => c.id === activeChannelId);
  const activeDMFriend = friends.find(f => f.friend.id === activeDMUserId);

  const activeChatKey = activeChannelId 
    ? `channel:${activeChannelId}` 
    : `dm:${[currentUser?.id, activeDMUserId].sort().join('-')}`;
  
  const chatHistory = messages[activeChatKey] || [];
  const typers = typingUsers[activeChannelId ? `channel:${activeChannelId}` : `dm:${activeDMUserId}`] || [];

  // File Picker change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setFilePreview(URL.createObjectURL(file));
      } else {
        setFilePreview(null);
      }
    }
  };

  // Submit Message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput && !selectedFile) return;

    try {
      await sendMessage(chatInput, selectedFile, replyMessage?.id);
      playSFX('pop');
      setChatInput('');
      setSelectedFile(null);
      setFilePreview(null);
      setReplyMessage(null);
      setEmojiDrawerOpen(false);
      sendTypingStatus(false);
    } catch (err) {
      showToast(err.message || 'Failed to send message.', 'error');
    }
  };

  // Insert markdown syntax at end of chatInput
  const insertMarkdown = (syntax) => {
    playSFX('click');
    setChatInput(prev => prev + syntax);
  };

  // Launch a game in current channel/DM
  const handleLaunchGame = async (gameName) => {
    playSFX('join');
    try {
      await sendMessage(`[GAME_START] ${gameName}`);
    } catch (err) {
      showToast(`Failed to start ${gameName}.`, 'error');
    }
  };

  // Send a game move as a message
  const handleGameMove = async (startMsgId, r, c, gameName = 'Tic-Tac-Toe') => {
    if (r === 'reset') {
      try { await sendMessage(`[GAME_START] ${gameName}`); } catch (_) {}
      return;
    }
    try {
      const movePayload = c !== undefined && c !== '' ? `${r},${c}` : `${r}`;
      await sendMessage(`[GAME_MOVE] ${startMsgId},${movePayload}`);
    } catch (_) {}
  };

  // Voice Recording Controls
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options = {};
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
          options = { mimeType: 'audio/ogg;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        // Send as file attachment
        try {
          await sendMessage('🎙 Voice message', file, replyMessage?.id);
          setReplyMessage(null);
          showToast('Voice message sent!', 'success');
        } catch (err) {
          showToast('Failed to send voice message.', 'error');
        }
        setRecordingSeconds(0);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch (err) {
      showToast('Microphone access denied. Please allow mic permissions.', 'error');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    setIsRecording(false);
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    clearInterval(recordingTimerRef.current);
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingSeconds(0);
    showToast('Recording cancelled.', 'info');
  };

  const formatRecordingTime = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  // Typing state timer
  const typingTimeoutRef = useRef(null);
  const handleChatInputChange = (e) => {
    setChatInput(e.target.value);
    
    // Broadcast typing state
    sendTypingStatus(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  };

  // Create Server
  const handleCreateServer = async (e) => {
    e.preventDefault();
    try {
      const server = await createServer(serverName);
      setServerName('');
      setNewServerOpen(false);
      setActiveServerId(server.id);
      const generalCh = server.channels.find(c => c.name === 'general');
      if (generalCh) setActiveChannelId(generalCh.id);
      setActiveDMUserId(null);
      showToast(`Server "${server.name}" created!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Join Server
  const handleJoinServer = async (e) => {
    e.preventDefault();
    try {
      const server = await joinServer(inviteCode);
      setInviteCode('');
      setJoinServerOpen(false);
      setActiveServerId(server.id);
      const generalCh = server.channels.find(c => c.name === 'general');
      if (generalCh) setActiveChannelId(generalCh.id);
      setActiveDMUserId(null);
      showToast(`Joined "${server.name}"!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Create Channel
  const handleCreateChannel = async (e) => {
    e.preventDefault();
    try {
      const ch = await createChannel(activeServerId, channelName, channelType);
      setChannelName('');
      setNewChannelOpen(false);
      if (ch.type === 'TEXT') {
        setActiveChannelId(ch.id);
      }
      showToast(`Channel "${ch.name}" created!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Add Friend Request
  const handleAddFriend = async (e) => {
    e.preventDefault();
    try {
      const msg = await sendFriendRequest(friendUsername);
      showToast(msg, 'success');
      setFriendUsername('');
      setFriendTab('pending');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Search filter for messages
  const filteredChatHistory = chatHistory.filter(msg => {
    if (!searchQuery) return true;
    return msg.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
           msg.user.displayName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const currentDMRoomId = activeDMUserId ? `dm-${[currentUser?.id, activeDMUserId].sort().join('-')}` : null;
  const isCallInActiveChat = (callRoomId === activeChannelId) || (callRoomId === currentDMRoomId);

  return (
    <div 
      style={{
        ...styles.shell,
        backgroundImage: `url(${bgWallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        transition: 'background-image 0.5s ease',
      }} 
      className="kiko-shell"
    >
      {/* Mobile Drawer backdrop overlay — renders FIRST so sidebars (rendered after) are always on top */}
      {mobileSidebarOpen && isMobile && (
        <div 
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 8,
            animation: 'fadeIn 0.2s ease-out',
            cursor: 'pointer',
          }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* 1. SERVER vertical tray */}
      <div
        style={{
          ...styles.serverBar,
          // On mobile: absolute overlay, slides in/out
          ...(isMobile ? {
            position: 'absolute',
            top: 0,
            left: 0,
            bottom: 0,
            height: '100%',
            zIndex: 10,
            background: 'var(--bg-primary)',
            transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: mobileSidebarOpen ? '4px 0 20px rgba(0,0,0,0.6)' : 'none',
          } : {})
        }}
        className="kiko-server-bar"
      >
        {/* Kiko Logo representing DMs */}
        <div 
          className="logo-container" 
          onClick={() => {
            setActiveServerId(null);
            setActiveChannelId(null);
            setActiveDMUserId(null);
            setMobileSidebarOpen(false);
          }}
          style={{
            ...styles.logoWrapper,
            border: activeServerId === null ? '2px solid var(--accent-cyan)' : 'none',
          }}
        >
          <KikoLogo size={42} />
        </div>

        <div style={styles.divider} />

        {/* List of Joined Communities */}
        <div style={styles.serverListScroll}>
          {servers.map(server => (
            <div 
              key={server.id}
              style={{
                ...styles.serverItem,
                border: activeServerId === server.id ? '2px solid var(--accent-cyan)' : 'none',
              }}
              onClick={() => {
                setActiveServerId(server.id);
                // Find first text channel
                const firstText = server.channels.find(c => c.type === 'TEXT');
                if (firstText) setActiveChannelId(firstText.id);
                setActiveDMUserId(null);
              }}
              title={server.name}
            >
              {server.iconUrl ? (
                <img src={server.iconUrl} alt={server.name} style={styles.serverIcon} />
              ) : (
                server.name.substring(0, 2).toUpperCase()
              )}
            </div>
          ))}

          {/* Add / Discover Buttons */}
          <div 
            style={styles.serverItemAction} 
            onClick={() => setNewServerOpen(true)}
            title="Create a Server"
          >
            <Plus size={20} color="var(--accent-cyan)" />
          </div>

          <div 
            style={styles.serverItemAction} 
            onClick={() => setJoinServerOpen(true)}
            title="Join Server with Invite"
          >
            <Compass size={20} color="var(--accent-purple)" />
          </div>
        </div>
      </div>


      {/* 2. SUB-SIDEBAR (Server channels or Direct messages list) */}
      <div
        style={{
          ...styles.subSidebar,
          // On mobile: absolute overlay next to server bar (72px from left)
          ...(isMobile ? {
            position: 'absolute',
            top: 0,
            left: '72px',
            bottom: 0,
            height: '100%',
            width: '240px',
            zIndex: 9,
            background: 'var(--bg-secondary)',
            transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-200%)',
            transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: mobileSidebarOpen ? '4px 0 20px rgba(0,0,0,0.4)' : 'none',
          } : {})
        }}
        className="glass-panel kiko-sub-sidebar"
      >
        {activeServerId ? (
          // Server Channels lists
          <div style={styles.channelsWrapper}>
            <div 
              style={{
                ...styles.sidebarHeader,
                position: 'relative',
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onClick={() => setServerMenuOpen(!serverMenuOpen)}
            >
              <h3 style={{ ...styles.serverTitle, display: 'flex', alignItems: 'center', gap: '6px', margin: 0, fontSize: '0.95rem' }}>
                {activeServer?.name}
                <ChevronDown size={14} color="var(--text-secondary)" />
              </h3>

              {serverMenuOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '8px',
                  right: '8px',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  zIndex: 50,
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
                onClick={(e) => e.stopPropagation()}
                >
                  <button
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-primary)',
                      padding: '8px 12px',
                      textAlign: 'left',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                    className="menu-item-hover"
                    onClick={() => {
                      navigator.clipboard.writeText(activeServer?.inviteCode || '');
                      showToast('Invite code copied!', 'success');
                      setServerMenuOpen(false);
                    }}
                  >
                    <span>Copy Invite Code</span>
                    <Copy size={12} />
                  </button>

                  {currentUser?.id !== activeServer?.ownerId ? (
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        padding: '8px 12px',
                        textAlign: 'left',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                      className="menu-item-hover-danger"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to leave ${activeServer?.name}?`)) {
                          try {
                            await leaveServer(activeServer.id);
                            showToast(`Left server "${activeServer?.name}"`, 'success');
                          } catch (err) {
                            showToast(err.message, 'error');
                          }
                        }
                        setServerMenuOpen(false);
                      }}
                    >
                      <span>Leave Server</span>
                      <LogOut size={12} />
                    </button>
                  ) : (
                    <button
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        padding: '8px 12px',
                        textAlign: 'left',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                      }}
                      className="menu-item-hover-danger"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete ${activeServer?.name}? This action is permanent!`)) {
                          try {
                            await deleteServer(activeServer.id);
                            showToast(`Deleted server "${activeServer?.name}"`, 'success');
                          } catch (err) {
                            showToast(err.message, 'error');
                          }
                        }
                        setServerMenuOpen(false);
                      }}
                    >
                      <span>Delete Server</span>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div style={styles.channelsScroll}>
              {/* Text Channels */}
              <div style={styles.categoryBlock}>
                <div style={styles.categoryHeader}>
                  <span>TEXT CHANNELS</span>
                  <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => { setChannelType('TEXT'); setNewChannelOpen(true); }} />
                </div>
                {(activeServer?.channels || []).filter(c => c.type === 'TEXT').map(ch => (
                  <div 
                    key={ch.id} 
                    style={{
                      ...styles.channelRow,
                      background: activeChannelId === ch.id ? 'var(--glass-bg-active)' : 'transparent',
                    }}
                    onClick={() => { setActiveChannelId(ch.id); setMobileSidebarOpen(false); }}
                  >
                    <Hash size={16} color="var(--text-secondary)" />
                    <span style={activeChannelId === ch.id ? { color: '#fff', fontWeight: '500' } : {}}>{ch.name}</span>
                  </div>
                ))}
              </div>

              {/* Voice Channels */}
              <div style={styles.categoryBlock}>
                <div style={styles.categoryHeader}>
                  <span>VOICE ROOMS</span>
                  <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => { setChannelType('VOICE'); setNewChannelOpen(true); }} />
                </div>
                {(activeServer?.channels || []).filter(c => c.type === 'VOICE').map(ch => {
                  const roomUsers = voiceChannelsState[ch.id] || [];
                  return (
                    <div key={ch.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div 
                        style={{
                          ...styles.channelRow,
                          background: callRoomId === ch.id ? 'rgba(0, 210, 255, 0.15)' : 'transparent',
                        }}
                        onClick={() => { joinCallRoom(ch.id, 'voice'); setMobileSidebarOpen(false); }}
                      >
                        <Volume2 size={16} color="var(--accent-cyan)" />
                        <span>{ch.name}</span>
                        {callRoomId === ch.id && <span style={styles.liveCallTag}>Active</span>}
                      </div>
                      
                      {/* Nested user participants list */}
                      {roomUsers.length > 0 && (
                        <div style={styles.voiceUsersNested}>
                          {roomUsers.map(user => (
                            <div key={user.userId} style={styles.voiceUserRow}>
                              <img 
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} 
                                alt={user.username} 
                                style={styles.voiceUserAvatar} 
                              />
                              <span style={styles.voiceUserText}>{user.username}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Stream Rooms */}
              <div style={styles.categoryBlock}>
                <div style={styles.categoryHeader}>
                  <span>LIVE STREAMS</span>
                  <Plus size={14} style={{ cursor: 'pointer' }} onClick={() => { setChannelType('STREAM'); setNewChannelOpen(true); }} />
                </div>
                {(activeServer?.channels || []).filter(c => c.type === 'STREAM').map(ch => {
                  const roomUsers = voiceChannelsState[ch.id] || [];
                  return (
                    <div key={ch.id} style={{ display: 'flex', flexDirection: 'column' }}>
                      <div 
                        style={{
                          ...styles.channelRow,
                          background: callRoomId === ch.id ? 'rgba(212, 0, 255, 0.15)' : 'transparent',
                        }}
                        onClick={() => { joinCallRoom(ch.id, 'screen'); setMobileSidebarOpen(false); }}
                      >
                        <Video size={16} color="var(--accent-purple)" />
                        <span>{ch.name}</span>
                        {callRoomId === ch.id && <span style={styles.liveCallTag}>Live</span>}
                      </div>

                      {/* Nested streaming participants list */}
                      {roomUsers.length > 0 && (
                        <div style={styles.voiceUsersNested}>
                          {roomUsers.map(user => (
                            <div key={user.userId} style={styles.voiceUserRow}>
                              <img 
                                src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} 
                                alt={user.username} 
                                style={styles.voiceUserAvatar} 
                              />
                              <span style={styles.voiceUserText}>{user.username} (Streaming)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          // Direct Messages list
          <div style={styles.channelsWrapper}>
            <div style={styles.sidebarHeader}>
              <h3 style={styles.serverTitle}>Kiko Inbox</h3>
            </div>

            <div style={styles.channelsScroll}>
              {/* Find or start conversation Search Bar */}
              <div 
                style={styles.findConvoBtn}
                onClick={() => setSearchEngineOpen(true)}
              >
                <Search size={14} color="var(--text-muted)" style={{ marginRight: '8px' }} />
                <span>Find or start conversation...</span>
              </div>

              <div 
                style={{
                  ...styles.channelRow,
                  background: (activeDMUserId === null && activeServerId === null) ? 'var(--glass-bg-active)' : 'transparent',
                }}
                onClick={() => {
                  setActiveDMUserId(null);
                  setActiveChannelId(null);
                }}
              >
                <Users size={16} color="var(--accent-cyan)" />
                <span style={activeDMUserId === null ? { color: '#fff', fontWeight: '600' } : {}}>Friends Panel</span>
                
                {/* Pending requests came badge */}
                {friends.filter(f => f.status === 'PENDING_RECEIVED').length > 0 && (
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(239,68,68,0.22)',
                    border: '1px solid rgba(239,68,68,0.4)',
                    color: '#f87171',
                    borderRadius: '999px',
                    padding: '2px 6px',
                    fontWeight: 'bold',
                    marginLeft: 'auto',
                    marginRight: '4px'
                  }} title="Pending Friend Requests">
                    {friends.filter(f => f.status === 'PENDING_RECEIVED').length}
                  </span>
                )}
                
                {/* Total unread DMs count badge */}
                {Object.values(unreadCounts || {}).reduce((a, b) => a + b, 0) > 0 && (
                  <span style={{
                    fontSize: '0.72rem',
                    background: 'rgba(59,130,246,0.25)',
                    border: '1px solid rgba(59,130,246,0.45)',
                    color: '#60a5fa',
                    borderRadius: '999px',
                    padding: '2px 6px',
                    fontWeight: 'bold',
                    marginLeft: friends.filter(f => f.status === 'PENDING_RECEIVED').length > 0 ? '0' : 'auto'
                  }} title="Unread Messages">
                    {Object.values(unreadCounts || {}).reduce((a, b) => a + b, 0)}
                  </span>
                )}
              </div>

              <div style={styles.dmCategoryLabel}>DIRECT MESSAGES</div>

              {friends.filter(f => f.status === 'ACCEPTED').map(rel => {
                const unreadCount = unreadCounts?.[rel.friend.id] || 0;
                return (
                  <div 
                    key={rel.friend.id}
                    style={{
                      ...styles.channelRow,
                      background: activeDMUserId === rel.friend.id ? 'var(--glass-bg-active)' : 'transparent',
                    }}
                    onClick={() => {
                      setActiveServerId(null);
                      setActiveChannelId(null);
                      setActiveDMUserId(rel.friend.id);
                      setMobileSidebarOpen(false);
                    }}
                  >
                    <div style={styles.avatarWrapper}>
                      <img src={rel.friend.avatarUrl} alt={rel.friend.username} style={styles.dmAvatar} />
                      {rel.friend.avatarDecoration && (
                        <span className={`avatar-decoration ${rel.friend.avatarDecoration}`} />
                      )}
                      <span className={`status-dot ${rel.friend.status}`} style={styles.dmStatusDot} />
                    </div>
                    <div style={styles.dmNameBlock}>
                      <span style={activeDMUserId === rel.friend.id ? { color: '#fff', fontWeight: '500' } : {}}>
                        {rel.friend.displayName || rel.friend.username}
                      </span>
                      {rel.friend.customStatus && (
                        <span style={styles.dmCustomStatus}>{rel.friend.customStatus}</span>
                      )}
                    </div>
                    {/* Real-time unread messages badge indicator (3 to 99) */}
                    {unreadCount > 0 && (
                      <span style={{
                        marginLeft: 'auto',
                        background: '#ef4444',
                        color: '#fff',
                        borderRadius: '999px',
                        padding: '2px 6px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        lineHeight: '1',
                        minWidth: '18px',
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(239,68,68,0.4)'
                      }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom User Settings Tray */}
        <div style={{
          ...styles.userTray,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px',
          gap: '8px',
        }}>
          <div 
            style={{
              ...styles.userTrayProfile,
              flex: 1,
              overflow: 'hidden',
            }} 
            onClick={(e) => {
              e.stopPropagation();
              setProfilePopoverOpen(!profilePopoverOpen);
            }}
          >
            <div style={styles.avatarWrapper}>
              <img src={currentUser?.avatarUrl} alt={currentUser?.displayName} style={styles.trayAvatar} />
              {currentUser?.avatarDecoration && (
                <span className={`avatar-decoration ${currentUser.avatarDecoration}`} />
              )}
              <span className={`status-dot ${currentUser?.status || 'online'}`} style={styles.trayStatusDot} />
            </div>
            <div style={styles.trayNameBlock}>
              <span style={styles.trayDisplayName}>{currentUser?.displayName}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={styles.trayUsername}>@{currentUser?.username}</span>
                {bluetoothConnected && (
                  <span 
                    title={`Bluetooth Connected: ${activeBluetoothName}`}
                    style={{
                      fontSize: '0.62rem',
                      background: 'rgba(139,92,246,0.22)',
                      border: '1px solid rgba(139,92,246,0.4)',
                      borderRadius: '4px',
                      padding: '0 4px',
                      color: '#a78bfa',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    🔹 BT
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => toggleMic()}
              title={micMuted ? "Unmute Mic" : "Mute Mic"}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                color: micMuted ? '#ef4444' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="user-tray-btn"
            >
              {micMuted ? <MicOff size={15} /> : <Mic size={15} />}
            </button>

            <button
              onClick={() => toggleDeafen()}
              title={deafened ? "Undeafen" : "Deafen"}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                color: deafened ? '#ef4444' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="user-tray-btn"
            >
              <Headphones size={15} />
            </button>

            <button
              onClick={() => setProfileOpen(true)}
              title="User Settings"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              className="user-tray-btn"
            >
              <Settings size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. PRIMARY VIEWPORT */}
      <div
        style={{
          ...styles.mainViewport,
          // On mobile: take full 100% width (sidebars are absolute overlays)
          ...(isMobile ? { 
            width: '100%', 
            minWidth: 0, 
            position: 'relative', 
            zIndex: 1, 
            isolation: 'isolate' 
          } : {})
        }}
        className="kiko-main-viewport"
      >
        
        {/* Top Header Bar */}
        <div style={styles.mainHeader} className="glass-panel">
          <div style={styles.headerTitleRow}>
            {/* Mobile Menu Toggle Button */}
            <button
              className="kiko-mobile-menu-btn"
              onClick={() => setMobileSidebarOpen(true)}
              style={styles.mobileMenuBtn}
              title="Open Navigation"
            >
              <Menu size={20} color="var(--text-primary)" />
            </button>

            {activeServerId ? (
              <>
                <Hash size={20} color="var(--text-secondary)" />
                <span style={styles.headerTitle}>{activeChannel?.name || 'welcome'}</span>
                {activeChannel?.categoryName && (
                  <span style={styles.headerCategory}>{activeChannel.categoryName}</span>
                )}
              </>
            ) : activeDMUserId ? (
              <>
                <div style={styles.avatarWrapper}>
                  <img src={activeDMFriend?.friend?.avatarUrl} alt={activeDMFriend?.friend?.username} style={styles.headerAvatar} />
                  {activeDMFriend?.friend?.avatarDecoration && (
                    <span className={`avatar-decoration ${activeDMFriend.friend.avatarDecoration}`} />
                  )}
                  <span className={`status-dot ${activeDMFriend?.friend?.status}`} style={styles.headerStatusDot} />
                </div>
                <span style={styles.headerTitle}>{activeDMFriend?.friend?.displayName || activeDMFriend?.friend?.username}</span>
                {activeDMFriend?.friend?.customStatus && (
                  <span style={styles.headerCategory}>{activeDMFriend.friend.customStatus}</span>
                )}
                
                {/* Voice, Video & Screen Calls buttons — hidden on mobile to prevent overflow */}
                <div style={{ display: isMobile ? 'none' : 'flex', gap: '8px', marginLeft: '12px' }}>
                  {(() => {
                    const dmRoomId = `dm-${[currentUser?.id, activeDMUserId].sort().join('-')}`;
                    const activeParticipants = voiceChannelsState[dmRoomId];
                    const hasActiveCall = activeParticipants && activeParticipants.length > 0;
                    const isUserInThisCall = callRoomId === dmRoomId;

                    if (hasActiveCall && !isUserInThisCall) {
                      return (
                        <button
                          className="btn btn-primary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.82rem',
                            backgroundColor: '#23a55a',
                            borderColor: '#23a55a',
                            color: '#fff',
                            fontWeight: '700',
                            borderRadius: '16px',
                            boxShadow: '0 0 15px rgba(35, 165, 90, 0.4)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            animation: 'pulseGlow 1.8s infinite alternate',
                          }}
                          onClick={() => {
                            joinCallRoom(dmRoomId, 'voice');
                          }}
                        >
                          <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
                          Join Active Call
                        </button>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--glass-bg)',
                            color: 'var(--accent-cyan)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          className="header-call-btn"
                          onClick={() => joinCallRoom(dmRoomId, 'voice')}
                          title="Audio Call"
                        >
                          <Phone size={16} />
                        </button>
                        <button
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--glass-border)',
                            background: 'var(--glass-bg)',
                            color: 'var(--accent-purple)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                          className="header-call-btn"
                          onClick={() => joinCallRoom(dmRoomId, 'video')}
                          title="Video Call"
                        >
                          <Video size={16} />
                        </button>
                        {(() => {
                          const someoneSharingScreen = activeParticipants && activeParticipants.some(p => p.streamType === 'screen' && p.userId !== currentUser?.id);
                          return (
                            <button
                              disabled={someoneSharingScreen}
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: someoneSharingScreen ? '1px solid rgba(0,0,0,0.1)' : '1px solid var(--glass-border)',
                                background: someoneSharingScreen ? 'rgba(0,0,0,0.02)' : 'var(--glass-bg)',
                                color: someoneSharingScreen ? 'var(--text-muted)' : 'var(--accent-cyan)',
                                opacity: someoneSharingScreen ? 0.5 : 1,
                                cursor: someoneSharingScreen ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                              className="header-call-btn"
                              onClick={() => joinCallRoom(dmRoomId, 'screen')}
                              title={someoneSharingScreen ? "Someone else is sharing their screen" : "Screen Share"}
                            >
                              <Monitor size={16} />
                            </button>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              </>
            ) : (
              <>
                <Users size={20} color="var(--accent-cyan)" />
                <span style={styles.headerTitle}>Friends Dashboard</span>
              </>
            )}
          </div>

          <div style={styles.headerActions}>
            {/* Search Input — hidden on mobile to prevent header overflow */}
            {(activeChannelId || activeDMUserId) && !isMobile && (
              <div style={styles.searchBox}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search in this chat..."
                  style={styles.searchInput}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && <X size={14} color="var(--text-muted)" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />}
              </div>
            )}

            {/* Clear Chat Button */}
            {(activeChannelId || activeDMUserId) && (
              <button
                className="header-call-btn"
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#f87171',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => {
                  playSFX('click');
                  if (window.confirm("⚠️ Are you sure you want to delete the entire chat history? This cannot be undone.")) {
                    clearChat();
                  }
                }}
                title="Clear Entire Chat"
              >
                <Trash2 size={15} />
              </button>
            )}

            {/* Detail drawer toggle — hidden on mobile (detail drawer doesn't show on mobile) */}
            {!isMobile && (
              <button 
                style={styles.drawerToggleBtn} 
                onClick={() => setRightPanelOpen(!rightPanelOpen)}
                title="Toggle Details Drawer"
              >
                <Users size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Content Body Grid */}
        <div style={styles.contentBodyGrid}>
          {/* Left Main Scrollable Panel */}
          <div style={styles.chatAreaContainer}>
            {/* Render WebRTC Streaming panel if call is active in this room */}
            {callRoomId && isCallInActiveChat && (
              <div style={styles.rtcWidgetContainer}>
                <WebRTCCall />
              </div>
            )}

            {/* Decide whether to show Friends list dashboard or Chat threads */}
            {(activeServerId || activeDMUserId) ? (
              // Messaging View
              <div style={styles.chatThreadWrapper}>
                {/* Scrollable messages thread */}
                <div style={styles.messagesScroll}>
                  {filteredChatHistory.length === 0 ? (
                    <div style={styles.emptyChatBanner}>
                      <MessageSquare size={48} color="var(--text-muted)" />
                      <h3>No messages found</h3>
                      <p>Start the conversation, upload media, or initiate a stream room call.</p>
                    </div>
                  ) : (
                    filteredChatHistory.map(msg => {
                      if (msg.content?.startsWith('[GAME_MOVE]')) return null;
                      const isOwn = msg.userId === currentUser?.id;
                      const readers = msg.readBy
                        ? msg.readBy.filter(r => r.userId !== currentUser?.id).slice(0, 3)
                        : [];
                      return (
                        <div
                          key={msg.id}
                          className="messageRow"
                          style={{ alignItems: isOwn ? 'flex-end' : 'flex-start' }}
                        >
                          {/* Reply reference banner */}
                          {msg.replyTo && (
                            <div style={{
                              ...styles.replyRefBanner,
                              marginLeft: isOwn ? '0' : '48px',
                              marginRight: isOwn ? '8px' : '0',
                              flexDirection: 'row',
                              alignSelf: isOwn ? 'flex-end' : 'flex-start',
                            }}>
                              <CornerUpLeft size={12} color="var(--text-muted)" style={{ margin: '0 6px' }} />
                              <span style={styles.replyAuthor}>{msg.replyTo.user.displayName}:</span>
                              <span style={styles.replySnippet}>{msg.replyTo.content.substring(0, 50)}</span>
                            </div>
                          )}

                          {/* Main row */}
                          <div style={{
                            display: 'flex',
                            flexDirection: isOwn ? 'row-reverse' : 'row',
                            alignItems: 'flex-end',
                            gap: '10px',
                            maxWidth: '82%',
                            position: 'relative',
                          }}>
                            {/* Avatar — only for received */}
                            {!isOwn && (
                              <div style={{ ...styles.avatarWrapper, flexShrink: 0 }}>
                                <img src={msg.user.avatarUrl} alt={msg.user.username} style={{ ...styles.msgAvatar, width: '34px', height: '34px' }} />
                                {msg.user.avatarDecoration && (
                                  <span className={`avatar-decoration ${msg.user.avatarDecoration}`} />
                                )}
                              </div>
                            )}

                            {/* Content */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: isOwn ? 'flex-end' : 'flex-start',
                              gap: '3px',
                            }}>
                              {/* Name + time for received only */}
                              {!isOwn && (
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', paddingLeft: '4px' }}>
                                  <span style={{ fontWeight: '700', fontSize: '0.82rem', color: '#e3e5e8' }}>{msg.user.displayName}</span>
                                  <span style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.35)' }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              )}

                              {/* Bubble — game-aware */}
                              {msg.content?.startsWith('[GAME_START]') ? (
                                msg.content.includes('Connect-Four') ? (
                                  <ConnectFourWidget
                                    startMsgId={msg.id}
                                    chatHistory={filteredChatHistory}
                                    onMove={(r, c) => handleGameMove(msg.id, r, c, 'Connect-Four')}
                                    currentUserId={currentUser?.id}
                                  />
                                ) : msg.content.includes('Rock-Paper-Scissors') ? (
                                  <RockPaperScissorsWidget
                                    startMsgId={msg.id}
                                    chatHistory={filteredChatHistory}
                                    onMove={(r, c) => handleGameMove(msg.id, r, c, 'Rock-Paper-Scissors')}
                                    currentUserId={currentUser?.id}
                                  />
                                ) : (
                                  <TicTacToeWidget
                                    startMsgId={msg.id}
                                    chatHistory={filteredChatHistory}
                                    onMove={(r, c) => handleGameMove(msg.id, r, c, 'Tic-Tac-Toe')}
                                    currentUserId={currentUser?.id}
                                  />
                                )
                              ) : msg.content?.startsWith('[GAME_MOVE]') ? null : (
                                <div style={{ position: 'relative', maxWidth: '100%' }}>
                                  {/* Floating action overlay — OUTSIDE bubble so text isn't covered */}
                                  <div
                                    className="message-actions-overlay msgActionsHover"
                                    style={{ display: 'none', top: '-24px', right: isOwn ? '0px' : 'auto', left: isOwn ? 'auto' : '0px' }}
                                  >
                                    <button className="msg-action-btn" onClick={() => setReplyMessage(msg)} title="Reply">
                                      <CornerUpLeft size={13} />
                                    </button>
                                    {['❤️','😂','🔥','👍','🚀'].map(emo => (
                                      <button key={emo} className="msg-action-btn" title={emo} onClick={() => {
                                        const reacted = msg.reactions?.some(r => r.userId === currentUser?.id && r.emoji === emo);
                                        reacted ? removeReaction(msg.id, emo) : addReaction(msg.id, emo);
                                      }}>{emo}</button>
                                    ))}
                                    {isOwn && (
                                      <button className="msg-action-btn" style={{ color: '#ff6b6b' }} onClick={() => deleteMessage(msg.id)} title="Delete">
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                  {/* The actual bubble wrapped with explicit delete button */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexDirection: isOwn ? 'row-reverse' : 'row', maxWidth: '100%' }}>
                                    <div className={isOwn ? 'chat-bubble-outgoing' : 'chat-bubble-incoming'}>
                                      <div style={{ ...styles.msgText, color: '#fff', lineHeight: 1.45, position: 'relative', paddingBottom: '14px', minWidth: '70px' }}>
                                        <div style={{ wordBreak: 'break-word', marginRight: isOwn ? '15px' : '0px' }}>
                                          {parseMarkdown(msg.content)}
                                        </div>
                                        <div style={{
                                          position: 'absolute',
                                          bottom: '-4px',
                                          right: '2px',
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '2px',
                                          userSelect: 'none',
                                          pointerEvents: 'none'
                                        }}>
                                          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', letterSpacing: '-0.3px' }}>
                                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                                          </span>
                                          {isOwn && (() => {
                                            // SVG single tick
                                            const SingleTick = ({ color }) => (
                                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" style={{ display: 'block', flexShrink: 0 }}>
                                                <path d="M1 4L3.5 6.5L9 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                              </svg>
                                            );
                                            // SVG double tick (two overlapping checks)
                                            const DoubleTick = ({ color }) => (
                                              <svg width="15" height="8" viewBox="0 0 15 8" fill="none" style={{ display: 'block', flexShrink: 0 }}>
                                                <path d="M1 4L3.5 6.5L9 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M5 4L7.5 6.5L13 1" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                              </svg>
                                            );
                                            if (msg.channelId) {
                                              return readers.length > 0
                                                ? <DoubleTick color="var(--accent-cyan)" />
                                                : <SingleTick color="rgba(255,255,255,0.3)" />;
                                            } else {
                                              if (msg.isRead) return <DoubleTick color="#2ecc71" />;
                                              if (msg.isDelivered) return <DoubleTick color="rgba(255,255,255,0.4)" />;
                                              return <SingleTick color="rgba(255,255,255,0.3)" />;
                                            }
                                          })()}
                                        </div>
                                      </div>
                                    </div>
                                    {isOwn && (
                                      <button 
                                        className="msg-bubble-delete-btn" 
                                        onClick={() => {
                                          triggerDeleteMessageModal(msg.id);
                                        }}
                                        title="Delete Message"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Attachment */}
                              {(msg.fileUrl || msg.isExpired) && (
                                <div style={{ alignSelf: isOwn ? 'flex-end' : 'flex-start', marginTop: '4px' }}>
                                  <EphemeralAttachment
                                    fileUrl={msg.fileUrl}
                                    fileName={msg.fileName}
                                    fileType={msg.fileType}
                                    fileSize={msg.fileSize}
                                    expiresAt={msg.expiresAt}
                                    isExpired={msg.isExpired}
                                  />
                                </div>
                              )}

                              {/* Rich link embed */}
                              {msg.embedTitle && (
                                <div
                                  className="rich-embed-card"
                                  style={{ borderLeftColor: msg.embedColor || 'var(--accent-cyan)', alignSelf: isOwn ? 'flex-end' : 'flex-start', marginTop: '4px' }}
                                >
                                  {msg.embedSiteName && <div className="rich-embed-header">{msg.embedSiteName}</div>}
                                  <a href={msg.content.match(/(https?:\/\/[^\s]+)/gi)?.[0] || '#'} target="_blank" rel="noopener noreferrer" className="rich-embed-title">{msg.embedTitle}</a>
                                  {msg.embedDescription && <div className="rich-embed-description">{msg.embedDescription}</div>}
                                  {msg.embedThumbnail && (
                                    <div className="rich-embed-thumbnail-wrapper" onClick={() => window.open(msg.content.match(/(https?:\/\/[^\s]+)/gi)?.[0], '_blank')}>
                                      <img src={msg.embedThumbnail} alt="preview" className="rich-embed-thumbnail" />
                                      {(msg.embedVideoUrl || msg.embedSiteName?.toLowerCase() === 'youtube') && <div className="play-button-overlay">▶</div>}
                                    </div>
                                  )}
                                </div>
                              )}

{/* Reactions */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className="reactions-display-row" style={{ justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                                  {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(emoji => {
                                    const count = msg.reactions.filter(r => r.emoji === emoji).length;
                                    const userReacted = msg.reactions.some(r => r.userId === currentUser?.id && r.emoji === emoji);
                                    return (
                                      <div key={emoji}
                                        className={`reaction-pill ${userReacted ? 'active' : ''}`}
                                        onClick={() => userReacted ? removeReaction(msg.id, emoji) : addReaction(msg.id, emoji)}>
                                        <span>{emoji}</span><span>{count}</span>
                                      </div>
                                    );
                                  })}
                                  <div className="reaction-pill-adder" onClick={e => {
                                    e.stopPropagation();
                                    const emojis = ['❤️','😂','🔥','👍','🎉','🚀','😮','💯','😢'];
                                    const pickerId = `picker-${msg.id}`;
                                    const existing = document.getElementById(pickerId);
                                    if (existing) { existing.remove(); return; }
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const div = document.createElement('div');
                                    div.id = pickerId;
                                    Object.assign(div.style, {
                                      position: 'fixed',
                                      top: `${rect.top - 58}px`,
                                      left: `${Math.min(rect.left, window.innerWidth - 300)}px`,
                                      background: 'rgba(20,22,32,0.98)',
                                      border: '1px solid rgba(255,255,255,0.15)',
                                      borderRadius: '999px',
                                      padding: '6px 12px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '6px',
                                      zIndex: '99999',
                                      boxShadow: '0 16px 48px rgba(0,0,0,0.8)',
                                      backdropFilter: 'blur(24px)',
                                    });
                                    emojis.forEach(emo => {
                                      const btn = document.createElement('button');
                                      btn.innerText = emo;
                                      Object.assign(btn.style, {
                                        background: 'transparent',
                                        border: 'none',
                                        fontSize: '1.3rem',
                                        cursor: 'pointer',
                                        padding: '4px 6px',
                                        borderRadius: '50%',
                                        transition: 'transform 0.12s',
                                      });
                                      btn.onmouseover = () => { btn.style.transform = 'scale(1.4)'; btn.style.background = 'rgba(255,255,255,0.1)'; };
                                      btn.onmouseout = () => { btn.style.transform = 'scale(1)'; btn.style.background = 'transparent'; };
                                      btn.onclick = () => {
                                        const reacted = msg.reactions?.some(r => r.userId === currentUser?.id && r.emoji === emo);
                                        reacted ? removeReaction(msg.id, emo) : addReaction(msg.id, emo);
                                        div.remove();
                                      };
                                      div.appendChild(btn);
                                    });

                                    // Add the custom emoji search/grid expander btn
                                    const customBtn = document.createElement('button');
                                    customBtn.innerText = '➕';
                                    Object.assign(customBtn.style, {
                                      background: 'rgba(255,255,255,0.08)',
                                      border: 'none',
                                      fontSize: '1.05rem',
                                      cursor: 'pointer',
                                      padding: '4px 8px',
                                      borderRadius: '8px',
                                      color: '#fff',
                                      marginLeft: '4px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    });
                                    customBtn.onclick = (event) => {
                                      event.stopPropagation();
                                      // Clear quick emojis
                                      div.innerHTML = '';
                                      // Resize picker container to show scrollable grid
                                      Object.assign(div.style, {
                                        borderRadius: '12px',
                                        padding: '12px',
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(6, 1fr)',
                                        gap: '6px',
                                        width: '260px',
                                        maxHeight: '200px',
                                        overflowY: 'auto'
                                      });
                                      
                                      const allEmojis = [
                                        '❤️','😂','🔥','👍','🎉','🚀','😮','💯','😢','😀','😁','🤣','😃',
                                        '😄','😅','😆','😉','😊','😋','😎','😍','😘','😗','😙','😚','☺️',
                                        '🙂','🤗','🤩','🤔','🤨','😐','😑','😶','🙄','😏','😣','😥','😮',
                                        '🤐','😯','😪','😫','😴','😌','😛','😜','🤪','😝','🤤','😒','😓',
                                        '😔','😕','🙃','🤑','😲','☹️','🙁','😖','😞','😟','😤','😭','😿',
                                        '😦','😧','😨','😩','🤯','😬','😰','😱','🥵','🥶','😳','🤪','😵',
                                        '😡','😠','🤬','😷','🤒','🤕','🤢','🤮','🤧','😇','🤠','🤡','🥳',
                                        '🥴','🥺','🤥','🤫','🤭','🧐','🤓','😈','👿','👹','👺','💀','👻',
                                        '👽','🤖','💩','😺','😸','😹','😻','😼','😽','🙀','😾'
                                      ];
                                      
                                      allEmojis.forEach(emo => {
                                        const emoBtn = document.createElement('button');
                                        emoBtn.innerText = emo;
                                        Object.assign(emoBtn.style, {
                                          background: 'transparent',
                                          border: 'none',
                                          fontSize: '1.3rem',
                                          cursor: 'pointer',
                                          padding: '4px',
                                          borderRadius: '6px',
                                        });
                                        emoBtn.onmouseover = () => { emoBtn.style.background = 'rgba(255,255,255,0.1)'; };
                                        emoBtn.onmouseout = () => { emoBtn.style.background = 'transparent'; };
                                        emoBtn.onclick = () => {
                                          const reacted = msg.reactions?.some(r => r.userId === currentUser?.id && r.emoji === emo);
                                          reacted ? removeReaction(msg.id, emo) : addReaction(msg.id, emo);
                                          div.remove();
                                        };
                                        div.appendChild(emoBtn);
                                      });
                                    };
                                    div.appendChild(customBtn);

                                    document.body.appendChild(div);
                                    setTimeout(() => {
                                      const closeHandler = () => { div.remove(); document.removeEventListener('click', closeHandler); };
                                      document.addEventListener('click', closeHandler);
                                    }, 10);
                                  }}>➕</div>
                                </div>
                              )}

                              {/* Read receipts (seen avatars for channel only) */}
                              {isOwn && msg.channelId && readers.length > 0 && (
                                <div className="kiko-read-receipt" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px', marginTop: '2px' }}>
                                  {readers.map(r => (
                                    <img key={r.userId} src={r.avatarUrl || '/default-avatar.png'} alt="seen" className="kiko-read-receipt-avatar" title={`Seen by ${r.username}`} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })

                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Typers indicator */}
                {typers.length > 0 && (
                  <div style={styles.typersIndicator}>
                    <span style={styles.typingDot1}>•</span>
                    <span style={styles.typingDot2}>•</span>
                    <span style={styles.typingDot3}>•</span>
                    <span style={{ marginLeft: '6px' }}>
                      {typers.map(u => u.username).join(', ')} {typers.length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                )}

                {/* Reply state banner */}
                {replyMessage && (
                  <div style={styles.replyBanner} className="glass-panel">
                    <span style={{ fontSize: '0.8rem' }}>
                      Replying to <strong>{replyMessage.user.displayName}</strong>: "{replyMessage.content.substring(0, 40)}..."
                    </span>
                    <button style={styles.cancelReplyBtn} onClick={() => setReplyMessage(null)}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* File Upload Preview bar */}
                {selectedFile && (
                  <div style={styles.filePreviewBanner} className="glass-panel">
                    {filePreview ? (
                      <img src={filePreview} alt="upload preview" style={styles.fileThumb} />
                    ) : (
                      <div style={styles.fileIconMock}>DOC</div>
                    )}
                    <div style={styles.filePreviewMeta}>
                      <span>{selectedFile.name}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Auto-deletes after 24h
                      </span>
                    </div>
                    <button style={styles.cancelReplyBtn} onClick={() => { setSelectedFile(null); setFilePreview(null); }}>
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Input Text Form */}
                <form onSubmit={handleSendMessage} style={styles.chatInputForm}>
                  {/* Markdown Toolbar */}
                  {showMdToolbar && !isRecording && (
                    <div style={{
                      display: 'flex', gap: '4px', padding: '4px 8px 6px 8px',
                      background: 'rgba(0,0,0,0.15)', borderRadius: '8px 8px 0 0',
                      marginBottom: '-4px',
                    }}>
                      {[
                        { label: 'B', syntax: '**', title: 'Bold', style: { fontWeight: '800' } },
                        { label: 'I', syntax: '_', title: 'Italic', style: { fontStyle: 'italic' } },
                        { label: '</>', syntax: '`', title: 'Inline Code', style: { fontFamily: 'monospace', fontSize: '0.75rem' } },
                        { label: '❝', syntax: '> ', title: 'Quote', style: {} },
                        { label: '```', syntax: '```\n\n```', title: 'Code Block', style: { fontFamily: 'monospace', fontSize: '0.7rem' } },
                        { label: '—', syntax: '\n---\n', title: 'Divider', style: {} },
                      ].map(({ label, syntax, title, style: btnStyle }) => (
                        <button
                          key={label}
                          type="button"
                          title={title}
                          onClick={() => insertMarkdown(syntax)}
                          style={{
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '5px', padding: '3px 8px', color: 'var(--text-secondary)',
                            cursor: 'pointer', fontSize: '0.78rem', transition: 'all 0.15s',
                            ...btnStyle,
                          }}
                          onMouseEnter={e => { e.target.style.background = 'rgba(0,210,255,0.15)'; e.target.style.color = '#00d2ff'; }}
                          onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.color = 'var(--text-secondary)'; }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Emoji Drawer */}
                  {emojiDrawerOpen && (
                    <div style={{
                      position: 'absolute', bottom: '72px', right: '20px',
                      background: 'var(--bg-tertiary)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px', padding: '14px', zIndex: 200,
                      width: '268px', boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
                      backdropFilter: 'blur(16px)',
                    }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '700', letterSpacing: '0.5px' }}>FREQUENTLY USED</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px' }}>
                        {['😀','😂','🥰','😍','🤩','😎','🥳','😭',
                          '👍','❤️','🔥','🚀','🎉','💯','⭐','✨',
                          '😮','😢','🙄','😤','👀','💀','🙏','🤝',
                          '🍕','🎮','🎵','💻','📱','🌟','💎','👑'].map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => { setChatInput(prev => prev + emoji); playSFX('click'); }}
                            style={{
                              background: 'transparent', border: 'none', fontSize: '1.25rem',
                              cursor: 'pointer', borderRadius: '6px', padding: '4px',
                              transition: 'background 0.1s, transform 0.1s', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                            }}
                            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.transform = 'scale(1.2)'; }}
                            onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.transform = 'scale(1)'; }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{
                    ...styles.inputContainer,
                    ...(isRecording ? { border: '1.5px solid rgba(239,68,68,0.5)', background: 'rgba(239,68,68,0.04)' } : {})
                  }}>
                     {/* Attachment clip + game button */}
                    {!isRecording && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '8px' }}>
                        <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Attach file">
                          <Paperclip size={18} color="var(--text-secondary)" />
                          <input type="file" style={{ display: 'none' }} onChange={handleFileChange} />
                        </label>
                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                          <button
                            type="button"
                            title="Launch Chat Game"
                            onClick={(e) => { e.stopPropagation(); setShowGameMenu(!showGameMenu); }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                              display: 'flex', alignItems: 'center', color: showGameMenu ? '#00d2ff' : 'var(--text-secondary)',
                              transition: 'color 0.15s'
                            }}
                          >
                            <Gamepad2 size={18} color="currentColor" />
                          </button>

                          {showGameMenu && (
                            <div
                              onClick={e => e.stopPropagation()}
                              style={{
                                position: 'absolute', bottom: '34px', left: '-10px',
                                background: 'rgba(20,20,35,0.96)',
                                border: '1.5px solid rgba(0,210,255,0.25)',
                                borderRadius: '12px', padding: '8px',
                                display: 'flex', flexDirection: 'column', gap: '4px',
                                width: '180px', zIndex: '1000',
                                backdropFilter: 'blur(20px)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                              }}
                            >
                              <div style={{ fontSize: '0.65rem', fontWeight: '800', color: 'rgba(255,255,255,0.4)', padding: '4px 6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Launch Game</div>
                              {[
                                { name: 'Tic-Tac-Toe', label: '❌ Tic-Tac-Toe', color: '#a78bfa' },
                                { name: 'Connect-Four', label: '🔴 Connect Four', color: '#00d2ff' },
                                { name: 'Rock-Paper-Scissors', label: '🪨 Rock Paper Scissors', color: '#f472b6' }
                              ].map(game => (
                                <button
                                  key={game.name}
                                  type="button"
                                  onClick={() => {
                                    handleLaunchGame(game.name);
                                    setShowGameMenu(false);
                                  }}
                                  style={{
                                    textAlign: 'left', padding: '6px 8px', background: 'none', border: 'none',
                                    borderRadius: '6px', color: '#fff', fontSize: '0.8rem', cursor: 'pointer',
                                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px'
                                  }}
                                  onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.06)'; e.target.style.color = game.color; }}
                                  onMouseLeave={e => { e.target.style.background = 'none'; e.target.style.color = '#fff'; }}
                                >
                                  {game.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Recording indicator OR text input */}
                    {isRecording ? (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px', padding: '0 4px' }}>
                        <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#ef4444', flexShrink: 0, animation: 'recordingPulse 1s ease-in-out infinite' }} />
                        <span style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '600', fontFamily: 'monospace' }}>{formatRecordingTime(recordingSeconds)}</span>
                        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>Recording voice message…</span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        placeholder={`Message ${activeChannelId ? '#' + (activeChannel?.name || 'channel') : '@' + (activeDMFriend?.friend?.displayName || activeDMFriend?.friend?.username || 'user')}`}
                        style={styles.chatInputText}
                        value={chatInput}
                        onChange={handleChatInputChange}
                        onFocus={() => { if (!showMdToolbar) setShowMdToolbar(true); }}
                      />
                    )}

                    {/* Voice recording controls */}
                    {isRecording ? (
                      <>
                        <button type="button" title="Cancel" onClick={cancelVoiceRecording}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', color: 'rgba(255,255,255,0.45)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={18} />
                        </button>
                        <button type="button" title="Send voice message" onClick={stopVoiceRecording}
                          style={{ background: '#ef4444', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(239,68,68,0.4)' }}>
                          <Send size={16} color="#fff" />
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Markdown toggle */}
                        <button
                          type="button"
                          title="Markdown Toolbar"
                          onClick={() => { setShowMdToolbar(v => !v); playSFX('click'); }}
                          style={{
                            background: showMdToolbar ? 'rgba(0,210,255,0.15)' : 'transparent',
                            border: 'none', cursor: 'pointer', padding: '5px 7px',
                            color: showMdToolbar ? '#00d2ff' : 'var(--text-secondary)',
                            borderRadius: '6px', fontSize: '0.75rem', fontFamily: 'monospace',
                            fontWeight: '700', transition: 'all 0.15s',
                          }}
                        >
                          &lt;/&gt;
                        </button>
                        {/* Voice mic */}
                        {!chatInput && !selectedFile && (
                          <button type="button" title="Voice message" onClick={startVoiceRecording}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-secondary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Mic size={18} />
                          </button>
                        )}
                        {/* Emoji picker toggle */}
                        <button
                          type="button"
                          title="Emoji Picker"
                          onClick={() => { setEmojiDrawerOpen(v => !v); playSFX('click'); }}
                          style={{
                            background: emojiDrawerOpen ? 'rgba(0,210,255,0.15)' : 'transparent',
                            border: 'none', cursor: 'pointer', padding: '4px 6px',
                            fontSize: '1.1rem', borderRadius: '6px', transition: 'all 0.15s',
                          }}
                        >
                          😀
                        </button>
                        {/* Send */}
                        <button type="submit" style={styles.sendSubmitBtn} onClick={() => playSFX('click')}>
                          <Send size={18} color="#fff" />
                        </button>
                      </>
                    )}
                  </div>
                </form>
              </div>

            ) : (
              // Friends list dashboard
              <div style={styles.friendsDashboard}>
                <div style={styles.friendsHeaderTabs}>
                  <button 
                    style={{
                      ...styles.headerTabBtn,
                      borderBottom: friendTab === 'online' ? '2px solid var(--accent-cyan)' : 'none',
                    }}
                    onClick={() => setFriendTab('online')}
                  >
                    Online
                  </button>
                  <button 
                    style={{
                      ...styles.headerTabBtn,
                      borderBottom: friendTab === 'all' ? '2px solid var(--accent-cyan)' : 'none',
                    }}
                    onClick={() => setFriendTab('all')}
                  >
                    All Friends
                  </button>
                  <button 
                    style={{
                      ...styles.headerTabBtn,
                      borderBottom: friendTab === 'pending' ? '2px solid var(--accent-cyan)' : 'none',
                    }}
                    onClick={() => setFriendTab('pending')}
                  >
                    Pending Requests
                  </button>
                  <button 
                    style={{
                      ...styles.headerTabBtn,
                      borderBottom: friendTab === 'add' ? '2px solid var(--accent-cyan)' : 'none',
                      color: 'var(--accent-cyan)'
                    }}
                    onClick={() => setFriendTab('add')}
                  >
                    Add Friend +
                  </button>
                </div>

                <div style={styles.friendsContentScroll}>
                  {friendTab === 'add' && (
                    <form onSubmit={handleAddFriend} style={styles.addFriendForm} className="glass-panel">
                      <h3>ADD FRIEND</h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '15px' }}>
                        Enter your friend's exact username to connect.
                      </p>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Friend's username"
                          required
                          value={friendUsername}
                          onChange={(e) => setFriendUsername(e.target.value)}
                        />
                        <button type="submit" className="btn btn-primary">Send Request</button>
                      </div>
                    </form>
                  )}

                  {friendTab === 'pending' && (
                    <div style={styles.friendsListCol}>
                      {friends.filter(f => f.status.startsWith('PENDING')).length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No pending requests.</p>
                      ) : (
                        friends.filter(f => f.status.startsWith('PENDING')).map(rel => (
                          <div key={rel.id} style={styles.friendRow} className="glass-panel">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <img src={rel.friend.avatarUrl} alt={rel.friend.username} style={styles.friendRowAvatar} />
                              <div>
                                <h4 style={{ fontSize: '0.95rem' }}>{rel.friend.displayName}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@{rel.friend.username}</span>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                              {rel.status === 'PENDING_RECEIVED' ? (
                                <>
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => respondFriendRequest(rel.friend.id, 'ACCEPT').then(msg => showToast(msg || 'Friend added!', 'success')).catch(err => showToast(err.message, 'error'))}
                                  >
                                    Accept
                                  </button>
                                  <button
                                    className="btn"
                                    onClick={() => respondFriendRequest(rel.friend.id, 'DECLINE').then(() => showToast('Request declined.', 'info')).catch(err => showToast(err.message, 'error'))}
                                  >
                                    Decline
                                  </button>
                                </>
                              ) : (
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Outgoing request sent</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {(friendTab === 'online' || friendTab === 'all') && (
                    <div style={styles.friendsListCol}>
                      {friends.filter(f => {
                        if (f.status !== 'ACCEPTED') return false;
                        if (friendTab === 'online') return f.friend.status !== 'offline';
                        return true;
                      }).length === 0 ? (
                        <p style={{ color: 'var(--text-muted)' }}>No friends found.</p>
                      ) : (
                        friends.filter(f => {
                          if (f.status !== 'ACCEPTED') return false;
                          if (friendTab === 'online') return f.friend.status !== 'offline';
                          return true;
                        }).map(rel => (
                          <div key={rel.id} style={styles.friendRow} className="glass-panel">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={styles.avatarWrapper}>
                                <img src={rel.friend.avatarUrl} alt={rel.friend.username} style={styles.friendRowAvatar} />
                                <span className={`status-dot ${rel.friend.status}`} style={styles.friendStatusDot} />
                              </div>
                              <div>
                                <h4 style={{ fontSize: '0.95rem' }}>{rel.friend.displayName}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  @{rel.friend.username} {rel.friend.customStatus ? `• ${rel.friend.customStatus}` : ''}
                                </span>
                              </div>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px' }}>
                              <button
                                className="btn"
                                onClick={() => {
                                  setActiveServerId(null);
                                  setActiveChannelId(null);
                                  setActiveDMUserId(rel.friend.id);
                                }}
                              >
                                <MessageSquare size={14} />
                                <span>Message</span>
                              </button>
                              <button
                                className="btn"
                                style={{ borderColor: 'var(--dnd)', color: '#ff6b6b' }}
                                onClick={() => removeFriend(rel.friend.id).then(() => showToast('Friend removed.', 'info')).catch(err => showToast(err.message, 'error'))}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right details panel drawer */}
          {rightPanelOpen && !isMobile && (
            <div style={styles.detailDrawer} className="glass-panel kiko-detail-drawer">
              {activeServerId ? (
                // Server members detail view
                <div style={styles.drawerInner}>
                  <h4 style={styles.drawerSectionTitle}>COMMUNITY MEMBERS ({serverMembers.length})</h4>
                  <div style={styles.memberListScroll}>
                    {/* Group by roles: Owner/Admin, Mods, Members */}
                    {['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER'].map(role => {
                      const list = serverMembers.filter(m => m.role === role);
                      if (list.length === 0) return null;
                      return (
                        <div key={role} style={styles.roleGroup}>
                          <span style={styles.roleHeader}>{role} — {list.length}</span>
                          {list.map(member => (
                            <div key={member.id} style={styles.memberRow}>
                              <div style={styles.avatarWrapper}>
                                <img src={member.user.avatarUrl} alt={member.user.username} style={styles.memberAvatar} />
                                <span className={`status-dot ${member.user.status}`} style={styles.memberStatusDot} />
                              </div>
                              <div style={styles.memberMeta}>
                                <span style={styles.memberDisplayName}>{member.user.displayName}</span>
                                {member.user.customStatus && <span style={styles.memberCustomStatus}>{member.user.customStatus}</span>}
                              </div>
                              {role === 'OWNER' && <Shield size={14} color="var(--accent-purple)" title="Server Owner" />}
                              {role === 'ADMIN' && <Shield size={14} color="var(--accent-cyan)" title="Admin" />}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : activeDMUserId && activeUserDetail ? (
                // DM User detail profile card
                <div style={styles.drawerInner}>
                  <div style={styles.userProfileCard}>
                    {/* Banner with particle effects */}
                    <div style={{
                      ...styles.profileCardBanner,
                      backgroundColor: activeUserDetail.bannerColor || 'var(--accent-purple)',
                      backgroundImage: activeUserDetail.bannerUrl ? `url(${activeUserDetail.bannerUrl})` : 'none',
                      position: 'relative', overflow: 'hidden',
                    }}>
                      <ProfileEffects type={activeUserDetail.profileEffect || 'sakura'} />
                    </div>
                    
                    {/* Avatar */}
                    <div style={styles.profileCardAvatarWrapper}>
                      <div className="avatar-wrapper" style={{ width: '70px', height: '70px' }}>
                        <img src={activeUserDetail.avatarUrl} alt={activeUserDetail.username} style={styles.profileCardAvatar} />
                        {activeUserDetail.avatarDecoration && (
                          <span className={`avatar-decoration ${activeUserDetail.avatarDecoration}`} />
                        )}
                      </div>
                      <span className={`status-dot ${activeUserDetail.status}`} style={styles.profileCardStatusDot} />
                    </div>

                    <div style={styles.profileCardInfo}>
                      <h3 style={styles.profileCardName}>{activeUserDetail.displayName}</h3>
                      <span style={styles.profileCardUsername}>@{activeUserDetail.username}</span>

                      {activeUserDetail.customStatus && (
                        <div style={styles.profileCardStatusBox} className="glass-panel">
                          <span>💬 {activeUserDetail.customStatus}</span>
                        </div>
                      )}

                      <div style={styles.profileCardDivider} />

                      {/* Bio */}
                      <h4 style={styles.profileCardSubLabel}>About Me</h4>
                      <p style={styles.profileCardBioText}>{activeUserDetail.bio || 'No bio written yet.'}</p>

                      {/* Widgets */}
                      {activeUserDetail.favoriteGame && (
                        <>
                          <div style={styles.profileCardDivider} />
                          <h4 style={styles.profileCardSubLabel}>Favorite Game</h4>
                          <div style={styles.widgetCard}>
                            <Gamepad2 size={16} color="var(--accent-cyan)" />
                            <span style={styles.widgetText}>{activeUserDetail.favoriteGame}</span>
                          </div>
                        </>
                      )}

                      {activeUserDetail.gamesInRotation && (
                        <>
                          <div style={styles.profileCardDivider} />
                          <h4 style={styles.profileCardSubLabel}>Active Rotation</h4>
                          <div style={styles.rotationTags}>
                            {activeUserDetail.gamesInRotation.split(',').map(tag => (
                              <span key={tag} style={styles.rotationTag}>{tag.trim()}</span>
                            ))}
                          </div>
                        </>
                      )}

                      <div style={styles.profileCardDivider} />

                      {/* Meta counts */}
                      <div style={styles.mutualsRow}>
                        <div style={styles.mutualBadge}>
                          <span style={styles.mutualCount}>{activeUserDetail.mutualFriendsCount}</span>
                          <span style={styles.mutualLabel}>Mutual Friends</span>
                        </div>
                        <div style={styles.mutualBadge}>
                          <span style={styles.mutualCount}>{activeUserDetail.mutualServersCount}</span>
                          <span style={styles.mutualLabel}>Mutual Servers</span>
                        </div>
                      </div>

                      <div style={styles.profileJoinedDate}>
                        Joined Kiko: {new Date(activeUserDetail.joinedDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.drawerInnerEmpty}>
                  <Compass size={36} color="var(--text-muted)" />
                  <p>Select a conversation or server to view details.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          MODALS / DIALOGS RENDER
          ========================================== */}
      
      {/* 5. Incoming Call Invitation Modal */}
      {incomingCall && (
        <div style={{
          ...styles.overlay,
          zIndex: 99999,
        }}>
          <div className="glass-panel" style={{
            ...styles.dialog,
            maxWidth: '360px',
            textAlign: 'center',
            padding: '24px',
            border: '1px solid rgba(0, 210, 255, 0.3)',
            boxShadow: '0 0 30px rgba(0, 210, 255, 0.25)',
            animation: 'pulseGlow 2s infinite',
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '16px', animation: 'bounce 1s infinite alternate' }}>📞</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: '#fff' }}>Incoming Call</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
              <strong>{incomingCall.caller.displayName || incomingCall.caller.username}</strong> is inviting you to join a {incomingCall.streamType === 'screen' ? 'Screen Share' : incomingCall.streamType === 'video' ? 'Video Call' : 'Voice Call'}.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button 
                type="button" 
                className="btn" 
                style={{ 
                  backgroundColor: '#e74c3c', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '10px 24px',
                  fontWeight: '600',
                  borderRadius: '20px',
                  cursor: 'pointer',
                }}
                onClick={() => setIncomingCall(null)}
              >
                Decline
              </button>
              <button 
                type="button" 
                className="btn btn-primary"
                style={{ 
                  backgroundColor: '#2ecc71', 
                  color: '#fff', 
                  border: 'none', 
                  padding: '10px 24px',
                  fontWeight: '600',
                  borderRadius: '20px',
                  boxShadow: '0 4px 15px rgba(46, 204, 113, 0.4)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  joinCallRoom(incomingCall.roomId, incomingCall.streamType === 'screen' ? 'voice' : incomingCall.streamType);
                  setIncomingCall(null);
                }}
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. Create Server Modal */}
      {newServerOpen && (
        <div style={styles.overlay}>
          <div className="glass-panel" style={styles.dialog}>
            <div style={styles.dialogHeader}>
              <h3>Create Server</h3>
              <button style={styles.dialogClose} onClick={() => setNewServerOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateServer} style={styles.dialogForm}>
              <div style={styles.dialogInputGroup}>
                <label style={styles.dialogLabel}>Server Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. My Lounge"
                  required
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                />
              </div>
              <div style={styles.dialogActions}>
                <button type="button" className="btn" onClick={() => setNewServerOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Join Server Modal */}
      {joinServerOpen && (
        <div style={styles.overlay}>
          <div className="glass-panel" style={styles.dialog}>
            <div style={styles.dialogHeader}>
              <h3>Join Server</h3>
              <button style={styles.dialogClose} onClick={() => setJoinServerOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleJoinServer} style={styles.dialogForm}>
              <div style={styles.dialogInputGroup}>
                <label style={styles.dialogLabel}>Invite Code</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. kikohq"
                  required
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                />
              </div>
              <div style={styles.dialogActions}>
                <button type="button" className="btn" onClick={() => setJoinServerOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Join</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Create Channel Modal */}
      {newChannelOpen && (
        <div style={styles.overlay}>
          <div className="glass-panel" style={styles.dialog}>
            <div style={styles.dialogHeader}>
              <h3>Create Channel</h3>
              <button style={styles.dialogClose} onClick={() => setNewChannelOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateChannel} style={styles.dialogForm}>
              <div style={styles.dialogInputGroup}>
                <label style={styles.dialogLabel}>Channel Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. gaming-clips"
                  required
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                />
              </div>
              <div style={styles.dialogInputGroup}>
                <label style={styles.dialogLabel}>Channel Type</label>
                <select
                  style={styles.dialogSelect}
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value)}
                >
                  <option value="TEXT">Text Channel</option>
                  <option value="VOICE">Voice Room (WebRTC)</option>
                  <option value="STREAM">Stream Room (Screen Share)</option>
                </select>
              </div>
              <div style={styles.dialogActions}>
                <button type="button" className="btn" onClick={() => setNewChannelOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Profile Modal */}
      <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />

      {/* Delete Confirmation Modal (Everyone vs Me) */}
      {deleteConfirmMessageId && (
        <div style={styles.overlay} onClick={() => setDeleteConfirmMessageId(null)}>
          <div 
            className="glass-panel animate-scale-up" 
            style={{
              width: '400px',
              padding: '24px',
              borderRadius: '16px',
              background: 'rgba(15,17,26,0.98)',
              border: '1px solid rgba(255,255,255,0.15)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.85)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#fff', margin: 0 }}>🗑️ Delete Message</h3>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.65)', margin: 0, lineHeight: '1.5' }}>
              Would you like to delete this message only for yourself, or completely delete it for everyone in this chat?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <button 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', justifyContent: 'center', background: 'linear-gradient(90deg, #ef4444, #dc2626)', border: 'none', color: '#fff', fontWeight: 'bold' }}
                onClick={() => {
                  if (socketRef.current) {
                    socketRef.current.emit('delete_message', { messageId: deleteConfirmMessageId, mode: 'everyone' });
                  }
                  setDeleteConfirmMessageId(null);
                }}
              >
                Delete for Everyone
              </button>
              <button 
                className="btn" 
                style={{ width: '100%', padding: '12px', justifyContent: 'center', borderColor: 'rgba(255,255,255,0.15)', color: '#fff', background: 'rgba(255,255,255,0.05)', fontWeight: 'bold' }}
                onClick={() => {
                  if (socketRef.current) {
                    socketRef.current.emit('delete_message', { messageId: deleteConfirmMessageId, mode: 'me' });
                  }
                  setDeleteConfirmMessageId(null);
                }}
              >
                Delete for Me
              </button>
              <button 
                className="btn" 
                style={{ width: '100%', padding: '10px', justifyContent: 'center', border: 'none', background: 'transparent', color: 'rgba(255,255,255,0.45)' }}
                onClick={() => setDeleteConfirmMessageId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Global Search Engine Modal */}
      {searchEngineOpen && (
        <div style={styles.overlay} onClick={() => { setSearchEngineOpen(false); setGlobalSearchQuery(''); setGlobalSearchResults([]); }}>
          <div 
            className="glass-panel" 
            style={styles.searchDialog} 
            onClick={e => e.stopPropagation()}
          >
            <div style={styles.searchDialogHeader}>
              <Search size={18} color="var(--accent-cyan)" />
              <input
                type="text"
                placeholder="Find users by username, email or nickname..."
                style={styles.searchDialogInput}
                autoFocus
                value={globalSearchQuery}
                onChange={handleGlobalSearchChange}
              />
              <button 
                style={styles.dialogClose} 
                onClick={() => {
                  setSearchEngineOpen(false);
                  setGlobalSearchQuery('');
                  setGlobalSearchResults([]);
                }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={styles.searchResultsContainer}>
              {globalSearchResults.length === 0 ? (
                <div style={styles.searchEmptyState}>
                  {globalSearchQuery ? 'No users matching your query.' : 'Type to search users globally on Kiko...'}
                </div>
              ) : (
                globalSearchResults.map(user => (
                  <div key={user.id} style={styles.searchResultRow} className="glass-panel">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img src={user.avatarUrl} alt={user.username} style={styles.searchResultAvatar} />
                      <div>
                        <h4 style={{ fontSize: '0.92rem', color: '#fff' }}>{user.displayName}</h4>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>@{user.username}</span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => {
                          setActiveServerId(null);
                          setActiveChannelId(null);
                          setActiveDMUserId(user.id);
                          setSearchEngineOpen(false);
                          setGlobalSearchQuery('');
                          setGlobalSearchResults([]);
                        }}
                      >
                        Message
                      </button>
                      <button
                        className="btn"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => {
                          sendFriendRequest(user.username)
                            .then(msg => showToast(msg, 'success'))
                            .catch(err => showToast(err.message, 'error'));
                        }}
                      >
                        Add Friend
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating User Profile Popover */}
      {profilePopoverOpen && (
        <div 
          className="user-popover animate-fade-in-up" 
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            bottom: '76px',
            left: '16px',
            width: '280px',
            borderRadius: '20px',
            background: 'var(--popover-bg, #181922)',
            border: '1px solid var(--popover-border, rgba(255,255,255,0.08))',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 1000,
          }}
        >
          {/* Header: Avatar + User Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="avatar-wrapper" style={{ width: '48px', height: '48px', flexShrink: 0 }}>
              <img 
                src={currentUser?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser?.username}`} 
                alt={currentUser?.displayName} 
                style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
              />
              {currentUser?.avatarDecoration && (
                <span className={`avatar-decoration ${currentUser.avatarDecoration}`} />
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--popover-text, #fff)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.displayName || currentUser?.username}
              </span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, rgba(255,255,255,0.5))', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.email || `@${currentUser?.username}`}
              </span>
            </div>
          </div>

          {/* Upgrade Banner Button */}
          <div 
            style={{
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f766e 100%)',
              borderRadius: '14px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              boxShadow: '0 4px 14px rgba(3,105,161,0.3)',
            }}
            onClick={() => {
              setProfilePopoverOpen(false);
              setProfileOpen(true); // Open profile edit
            }}
            className="upgrade-profile-banner"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
              <span style={{ fontSize: '1.1rem' }}>👑</span>
              <span style={{ fontWeight: '700', fontSize: '0.82rem', letterSpacing: '-0.2px' }}>Upgrade profile</span>
            </div>
            <span style={{
              background: '#fff',
              color: '#0369a1',
              fontSize: '0.65rem',
              fontWeight: '800',
              padding: '2px 8px',
              borderRadius: '20px',
              letterSpacing: '0.5px'
            }}>PRO</span>
          </div>

          {/* Option Menu List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {/* User Profile */}
            <div 
              style={styles.popoverMenuItem}
              className="popover-menu-item"
              onClick={() => {
                setProfilePopoverOpen(false);
                setProfileOpen(true);
              }}
            >
              <div style={styles.popoverMenuIconWrapper}>
                <User size={16} color="var(--text-muted)" />
              </div>
              <span style={styles.popoverMenuLabel}>User Profile</span>
            </div>

            {/* Integrations */}
            <div 
              style={styles.popoverMenuItem}
              className="popover-menu-item"
              onClick={() => {
                setProfilePopoverOpen(false);
                setProfileOpen(true);
              }}
            >
              <div style={styles.popoverMenuIconWrapper}>
                <Link2 size={16} color="var(--text-muted)" />
              </div>
              <span style={styles.popoverMenuLabel}>Integrations</span>
            </div>

            {/* Settings */}
            <div 
              style={styles.popoverMenuItem}
              className="popover-menu-item"
              onClick={() => {
                setProfilePopoverOpen(false);
                setProfileOpen(true); // Will open settings
              }}
            >
              <div style={styles.popoverMenuIconWrapper}>
                <Settings size={16} color="var(--text-muted)" />
              </div>
              <span style={styles.popoverMenuLabel}>Settings</span>
            </div>

            {/* Community / Friends */}
            <div 
              style={styles.popoverMenuItem}
              className="popover-menu-item"
              onClick={() => {
                setProfilePopoverOpen(false);
                setActiveServerId(null);
                setActiveChannelId(null);
                setActiveDMUserId(null);
              }}
            >
              <div style={styles.popoverMenuIconWrapper}>
                <Users size={16} color="var(--text-muted)" />
              </div>
              <span style={styles.popoverMenuLabel}>Community</span>
            </div>

            {/* Help Center */}
            <div 
              style={styles.popoverMenuItem}
              className="popover-menu-item"
              onClick={() => {
                setProfilePopoverOpen(false);
                showToast("💡 Help Center is coming soon!", "info");
              }}
            >
              <div style={styles.popoverMenuIconWrapper}>
                <HelpCircle size={16} color="var(--text-muted)" />
              </div>
              <span style={styles.popoverMenuLabel}>Help Center</span>
            </div>

            {/* Dark Mode Option Toggle */}
            <div 
              style={{
                ...styles.popoverMenuItem,
                cursor: 'default',
              }}
              className="popover-menu-item-no-hover"
            >
              <div style={styles.popoverMenuIconWrapper}>
                {theme === 'dark' || theme === 'amoled' ? <Moon size={16} color="var(--text-muted)" /> : <Sun size={16} color="var(--text-muted)" />}
              </div>
              <span style={styles.popoverMenuLabel}>Dark Mode</span>
              <div 
                style={{
                  width: '38px',
                  height: '20px',
                  borderRadius: '10px',
                  background: theme === 'dark' || theme === 'amoled' ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.12)',
                  position: 'relative',
                  cursor: 'pointer',
                  marginLeft: 'auto',
                  transition: 'background 0.2s',
                }}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <div style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '3px',
                  left: theme === 'dark' || theme === 'amoled' ? '21px' : '3px',
                  transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
            </div>
          </div>

          <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.05)', margin: '4px 0' }} />

          {/* Log Out / User Profile (Red Item) */}
          <button 
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 12px',
              borderRadius: '12px',
              border: 'none',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.85rem',
              transition: 'background 0.15s, transform 0.1s',
            }}
            onClick={() => {
              setProfilePopoverOpen(false);
              logout();
            }}
            className="popover-logout-btn"
          >
            <LogOut size={16} />
            <span>Log Out</span>
          </button>
        </div>
      )}

      {/* Toast Notification Layer */}
      <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '10px', zIndex: 9999, pointerEvents: 'none' }}>
        {toasts.map(t => (
          <div key={t.id} style={{
            background: t.type === 'error' ? 'rgba(242,63,67,0.95)' : t.type === 'success' ? 'rgba(35,165,90,0.95)' : 'rgba(20,22,30,0.95)',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: '10px',
            fontSize: '0.88rem',
            fontWeight: '500',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            border: `1px solid ${t.type === 'error' ? '#ff6b6b' : t.type === 'success' ? '#51cf66' : 'var(--glass-border)'}`,
            animation: 'slideInUp 0.3s ease',
            pointerEvents: 'auto',
            maxWidth: '320px',
          }}>
            {t.message}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  shell: {
    display: 'flex',
    width: '100%',
    maxWidth: '100%',
    height: '100vh',
    background: 'var(--bg-primary)',
    overflow: 'hidden',
    isolation: 'isolate',
    position: 'relative',
  },
  serverBar: {
    width: '72px',
    background: 'rgba(0,0,0,0.4)',
    borderRight: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px 0',
    gap: '12px',
  },
  logoWrapper: {
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    background: '#090a0f',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
  },
  divider: {
    width: '32px',
    height: '2px',
    background: 'var(--glass-border)',
    borderRadius: '1px',
  },
  serverListScroll: {
    flex: 1,
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '10px',
    overflowY: 'auto',
  },
  serverItem: {
    width: '48px',
    height: '48px',
    borderRadius: '16px',
    background: 'var(--glass-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: 'bold',
    overflow: 'hidden',
    transition: 'var(--transition-smooth)',
  },
  serverIcon: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  serverItemAction: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'var(--glass-bg)',
    border: '1px dashed var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  subSidebar: {
    width: '240px',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid var(--glass-border)',
  },
  channelsWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  sidebarHeader: {
    padding: '20px',
    borderBottom: '1px solid var(--glass-border)',
  },
  serverTitle: {
    fontSize: '1.05rem',
    fontWeight: '700',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  inviteLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontFamily: 'monospace',
  },
  channelsScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  categoryBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  categoryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    padding: '0 8px 4px 8px',
    letterSpacing: '0.5px',
  },
  channelRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    borderRadius: 'var(--border-radius-sm)',
    color: 'var(--text-secondary)',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  liveCallTag: {
    marginLeft: 'auto',
    fontSize: '0.65rem',
    background: 'var(--dnd)',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '10px',
    fontWeight: 'bold',
  },
  dmCategoryLabel: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--text-muted)',
    padding: '8px 8px 4px 8px',
    letterSpacing: '0.5px',
  },
  avatarWrapper: {
    position: 'relative',
    display: 'inline-flex',
  },
  dmAvatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: '#12141a',
  },
  dmStatusDot: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '10px',
    height: '10px',
  },
  dmNameBlock: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  dmCustomStatus: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  friendsBadge: {
    marginLeft: 'auto',
    fontSize: '0.75rem',
    background: 'var(--accent-gradient)',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '10px',
    fontWeight: 'bold',
  },
  userTray: {
    padding: '12px',
    background: 'rgba(0,0,0,0.2)',
    borderTop: '1px solid var(--glass-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userTrayProfile: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
  },
  trayAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    background: '#12141a',
  },
  trayStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '11px',
    height: '11px',
  },
  trayNameBlock: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  trayDisplayName: {
    fontSize: '0.88rem',
    fontWeight: '600',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  trayUsername: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  mainViewport: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(10, 11, 14, 0.2)',
    minWidth: 0,
  },
  mainHeader: {
    height: '56px',
    borderBottom: '1px solid var(--glass-border)',
    borderRadius: '0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 12px',
    overflow: 'hidden',
    flexShrink: 0,
  },
  headerTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    minWidth: 0,
    overflow: 'hidden',
    flex: 1,
  },
  headerAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
  },
  headerStatusDot: {
    position: 'absolute',
    bottom: '-2px',
    right: '-2px',
    width: '9px',
    height: '9px',
  },
  headerTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    minWidth: 0,
  },
  headerCategory: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    borderLeft: '1px solid var(--glass-border)',
    paddingLeft: '10px',
  },
  dmCallBtn: {
    marginLeft: '15px',
    padding: '4px 10px',
    fontSize: '0.8rem',
    background: 'rgba(0, 210, 255, 0.1)',
    borderColor: 'var(--accent-cyan)',
    color: 'var(--accent-cyan)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0,0,0,0.25)',
    padding: '6px 12px',
    borderRadius: '16px',
    border: '1px solid var(--glass-border)',
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    outline: 'none',
    fontSize: '0.82rem',
    width: '140px',
  },
  drawerToggleBtn: {
    background: 'var(--glass-bg)',
    border: '1px solid var(--glass-border)',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'var(--transition-fast)',
  },
  contentBodyGrid: {
    flex: 1,
    display: 'flex',
    minHeight: 0,
  },
  chatAreaContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    position: 'relative',
  },
  rtcWidgetContainer: {
    maxHeight: '400px',
    borderBottom: '1px solid var(--glass-border)',
    background: '#040508',
  },
  chatThreadWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  messagesScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  emptyChatBanner: {
    margin: 'auto',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    textAlign: 'center',
    padding: '40px',
    color: 'var(--text-muted)',
    maxWidth: '400px',
  },
  messageRow: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    padding: '4px 0',
  },
  replyRefBanner: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    marginLeft: '36px',
    marginBottom: '4px',
  },
  replyAuthor: {
    fontWeight: '600',
    marginRight: '6px',
  },
  replySnippet: {
    fontStyle: 'italic',
  },
  messageMain: {
    display: 'flex',
    gap: '12px',
    group: 'hover',
  },
  msgAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#12141a',
  },
  msgContentBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },
  msgHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  msgDisplayName: {
    fontSize: '0.9rem',
    fontWeight: '700',
    color: '#fff',
  },
  msgUsername: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  msgTime: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginLeft: 'auto',
  },
  msgText: {
    fontSize: '0.92rem',
    color: 'var(--text-primary)',
    lineHeight: '1.45',
  },
  msgActionsHover: {
    position: 'absolute',
    right: '20px',
    top: '-12px',
    background: 'var(--bg-tertiary)',
    border: '1px solid var(--glass-border)',
    borderRadius: 'var(--border-radius-sm)',
    padding: '2px',
    display: 'none',
    gap: '4px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
    zIndex: 10,
  },
  msgActionIcon: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-secondary)',
    padding: '4px 6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  msgActionTrash: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#ff6b6b',
    padding: '4px 6px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
  },
  typersIndicator: {
    padding: '6px 20px',
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
  },
  typingDot1: { animation: 'pulseGlow 1s infinite' },
  typingDot2: { animation: 'pulseGlow 1.2s infinite' },
  typingDot3: { animation: 'pulseGlow 1.4s infinite' },
  replyBanner: {
    margin: '0 20px',
    padding: '10px 14px',
    background: 'rgba(0, 210, 255, 0.08)',
    borderLeft: '4px solid var(--accent-cyan)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filePreviewBanner: {
    margin: '10px 20px 0 20px',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.02)',
  },
  fileThumb: {
    width: '40px',
    height: '40px',
    objectFit: 'cover',
    borderRadius: '4px',
  },
  fileIconMock: {
    width: '40px',
    height: '40px',
    background: 'var(--accent-purple)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.7rem',
    fontWeight: 'bold',
    borderRadius: '4px',
  },
  filePreviewMeta: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    fontSize: '0.85rem',
  },
  cancelReplyBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  chatInputForm: {
    padding: '0 20px 20px 20px',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 18px',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: 'var(--border-radius-lg)',
  },
  attachmentLabel: {
    cursor: 'pointer',
    marginRight: '12px',
    display: 'flex',
    alignItems: 'center',
  },
  chatInputText: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    outline: 'none',
    fontFamily: 'var(--font-text)',
    fontSize: '0.92rem',
  },
  emojiBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '1.2rem',
    cursor: 'pointer',
    marginRight: '12px',
  },
  sendSubmitBtn: {
    background: 'var(--accent-gradient)',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 10px rgba(0, 210, 255, 0.2)',
  },
  detailDrawer: {
    width: '260px',
    background: 'var(--bg-secondary)',
    borderLeft: '1px solid var(--glass-border)',
    display: 'flex',
    flexDirection: 'column',
    borderRadius: '0',
  },
  drawerInner: {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
  },
  drawerInnerEmpty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: '30px',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    height: '100%',
    gap: '12px',
  },
  drawerSectionTitle: {
    fontSize: '0.72rem',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    letterSpacing: '0.5px',
    marginBottom: '15px',
  },
  memberListScroll: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  roleGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  roleHeader: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    fontWeight: 'bold',
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  memberAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
  },
  memberStatusDot: {
    position: 'absolute',
    bottom: '-1px',
    right: '-1px',
    width: '9px',
    height: '9px',
  },
  memberMeta: {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    flex: 1,
  },
  memberDisplayName: {
    fontSize: '0.85rem',
    color: 'var(--text-primary)',
    fontWeight: '500',
  },
  memberCustomStatus: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userProfileCard: {
    display: 'flex',
    flexDirection: 'column',
  },
  profileCardBanner: {
    height: '75px',
    background: 'var(--accent-gradient)',
    borderRadius: 'var(--border-radius-md) var(--border-radius-md) 0 0',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  },
  profileCardAvatarWrapper: {
    position: 'relative',
    marginTop: '-35px',
    marginLeft: '15px',
    alignSelf: 'flex-start',
  },
  profileCardAvatar: {
    width: '65px',
    height: '65px',
    borderRadius: '50%',
    border: '4px solid var(--bg-secondary)',
    background: '#12141a',
  },
  profileCardStatusDot: {
    position: 'absolute',
    bottom: '4px',
    right: '4px',
    width: '14px',
    height: '14px',
    border: '3px solid var(--bg-secondary)',
  },
  profileCardInfo: {
    padding: '12px 15px',
    display: 'flex',
    flexDirection: 'column',
  },
  profileCardName: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#fff',
  },
  profileCardUsername: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
    marginBottom: '10px',
  },
  profileCardStatusBox: {
    padding: '8px 12px',
    fontSize: '0.8rem',
    marginBottom: '15px',
  },
  profileCardDivider: {
    height: '1px',
    background: 'var(--glass-border)',
    margin: '10px 0',
  },
  profileCardSubLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    fontWeight: 'bold',
    marginBottom: '6px',
  },
  profileCardBioText: {
    fontSize: '0.85rem',
    lineHeight: '1.4',
    color: 'var(--text-primary)',
    marginBottom: '15px',
  },
  mutualsRow: {
    display: 'flex',
    gap: '12px',
    marginBottom: '15px',
  },
  mutualBadge: {
    flex: 1,
    background: 'rgba(0,0,0,0.15)',
    padding: '8px',
    borderRadius: '8px',
    textAlign: 'center',
    border: '1px solid var(--glass-border)',
  },
  mutualCount: {
    display: 'block',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    color: 'var(--accent-cyan)',
  },
  mutualLabel: {
    fontSize: '0.65rem',
    color: 'var(--text-secondary)',
  },
  profileJoinedDate: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  friendsDashboard: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    background: 'rgba(0,0,0,0.05)',
  },
  friendsHeaderTabs: {
    display: 'flex',
    gap: '16px',
    padding: '16px 20px',
    borderBottom: '1px solid var(--glass-border)',
  },
  headerTabBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '8px 4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontFamily: 'var(--font-brand)',
    fontWeight: '600',
    transition: 'var(--transition-fast)',
  },
  friendsContentScroll: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px',
  },
  addFriendForm: {
    padding: '24px',
    maxWidth: '500px',
    marginBottom: '20px',
  },
  friendsListCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  friendRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 20px',
    background: 'var(--glass-bg)',
  },
  friendRowAvatar: {
    width: '38px',
    height: '38px',
    borderRadius: '50%',
  },
  friendStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: '11px',
    height: '11px',
  },
  expiredAttachment: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px dashed var(--glass-border)',
    borderRadius: 'var(--border-radius-md)',
    padding: '14px',
    marginTop: '6px',
    display: 'inline-flex',
  },
  attachmentCard: {
    background: 'rgba(0,0,0,0.2)',
    padding: '12px',
    borderRadius: 'var(--border-radius-md)',
    marginTop: '8px',
    display: 'inline-flex',
    flexDirection: 'column',
    maxWidth: '350px',
    gap: '8px',
  },
  attachmentPreview: {
    width: '100%',
    maxHeight: '180px',
    objectFit: 'cover',
    borderRadius: '6px',
  },
  attachmentVideo: {
    width: '100%',
    borderRadius: '6px',
  },
  attachmentAudio: {
    width: '100%',
  },
  attachmentMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  attachmentInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  attachmentName: {
    fontSize: '0.82rem',
    fontWeight: '600',
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  attachmentSize: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
  },
  countdownBadge: {
    fontSize: '0.72rem',
    color: 'var(--accent-purple)',
    background: 'rgba(212, 0, 255, 0.08)',
    padding: '2px 8px',
    borderRadius: '10px',
    alignSelf: 'flex-start',
  },
  reactionsDisplayRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '6px',
  },
  reactionTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 8px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  dialog: {
    width: '400px',
    padding: '24px',
    animation: 'slideInUp 0.2s ease-out',
  },
  dialogHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid var(--glass-border)',
    paddingBottom: '10px',
    marginBottom: '16px',
  },
  dialogClose: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
  },
  dialogForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  dialogInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  dialogLabel: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  dialogSelect: {
    width: '100%',
    background: 'rgba(0, 0, 0, 0.25)',
    border: '1px solid var(--glass-border)',
    padding: '12px 16px',
    borderRadius: 'var(--border-radius-md)',
    color: 'var(--text-primary)',
    outline: 'none',
    cursor: 'pointer',
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  },
  findConvoBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0, 0, 0, 0.2)',
    padding: '8px 12px',
    margin: '4px 8px 12px 8px',
    borderRadius: '4px',
    color: 'var(--text-secondary)',
    fontSize: '0.8rem',
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  voiceUsersNested: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    paddingLeft: '28px',
    marginBottom: '6px',
  },
  voiceUserRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 6px',
  },
  voiceUserAvatar: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
  },
  voiceUserText: {
    fontSize: '0.78rem',
    color: 'var(--text-secondary)',
  },
  searchDialog: {
    width: '560px',
    padding: '16px',
    background: '#18191c',
    borderRadius: 'var(--border-radius-lg)',
    boxShadow: '0 8px 32px var(--glass-shadow)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  },
  searchDialogHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    paddingBottom: '12px',
    marginBottom: '14px',
  },
  searchDialogInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    outline: 'none',
    fontSize: '1rem',
  },
  searchResultsContainer: {
    maxHeight: '320px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  searchEmptyState: {
    textAlign: 'center',
    padding: '30px 10px',
    color: 'var(--text-muted)',
    fontSize: '0.88rem',
  },
  searchResultRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 14px',
    borderRadius: 'var(--border-radius-md)',
  },
  searchResultAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
  },
  widgetCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0,0,0,0.15)',
    border: '1px solid rgba(255,255,255,0.04)',
    padding: '8px 12px',
    borderRadius: 'var(--border-radius-md)',
  },
  widgetText: {
    fontSize: '0.82rem',
    color: '#fff',
    fontWeight: '500',
  },
  rotationTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  rotationTag: {
    fontSize: '0.75rem',
    color: 'var(--accent-purple)',
    background: 'rgba(212, 0, 255, 0.08)',
    border: '1px solid rgba(212, 0, 255, 0.2)',
    padding: '3px 8px',
    borderRadius: '12px',
    fontWeight: '500',
  },
  popoverBanner: {
    height: '60px',
    background: 'var(--accent-gradient)',
  },
  popoverAvatarContainer: {
    marginValues: '0',
    marginTop: '-40px',
    padding: '0 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    position: 'relative',
  },
  popoverAvatar: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    border: '6px solid #18191c',
    background: '#202225',
  },
  popoverBody: {
    padding: '16px',
  },
  popoverName: {
    fontSize: '1.15rem',
    fontWeight: 'bold',
    color: '#ffffff',
  },
  popoverTag: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    display: 'block',
    marginBottom: '12px',
  },
  popoverDivider: {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.06)',
    margin: '12px 0',
  },
  popoverSectionTitle: {
    fontSize: '0.7rem',
    textTransform: 'uppercase',
    fontWeight: '800',
    color: 'var(--text-muted)',
    letterSpacing: '0.8px',
    display: 'block',
    marginBottom: '6px',
  },
  popoverMenuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 10px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  popoverMenuIconWrapper: {
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.8,
  },
  popoverMenuLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#fff',
  },
  mobileMenuBtn: {
    display: 'none',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    marginRight: '8px',
    borderRadius: '50%',
  },
};

// Add hovering selectors via standard CSS stylesheet injecting in head
const hoverStyles = `
  .messageRow:hover .msgActionsHover {
    display: flex !important;
  }
  .popover-menu-item {
    transition: background 0.15s, transform 0.1s;
  }
  .popover-menu-item:hover {
    background: rgba(255, 255, 255, 0.06) !important;
  }
  .upgrade-profile-banner {
    transition: transform 0.15s, filter 0.15s !important;
  }
  .upgrade-profile-banner:hover {
    transform: scale(1.02) !important;
    filter: brightness(1.1) !important;
  }
  .popover-logout-btn {
    transition: background 0.15s, transform 0.1s !important;
  }
  .popover-logout-btn:hover {
    background: rgba(239, 68, 68, 0.18) !important;
    transform: scale(0.98) !important;
  }
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = hoverStyles;
  document.head.appendChild(styleSheet);
}
