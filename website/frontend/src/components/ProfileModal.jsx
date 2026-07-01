import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  X, LogOut, User, Volume2, Sliders, Link2, Monitor, HelpCircle,
  Crown, Flame, Inbox, Moon, Sun, Mic, ChevronDown, Gamepad2,
  Sparkles, Shield, Pencil, Trash2
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   DARK GLASS DESIGN TOKENS
   ═══════════════════════════════════════════════════════ */
const G = {
  bg0:     'rgba(12,12,22,0.97)',
  bg1:     'rgba(18,18,32,0.85)',
  bg2:     'rgba(255,255,255,0.04)',
  bg3:     'rgba(255,255,255,0.07)',
  border:  'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.13)',
  text:    '#e8eaf0',
  textSub: 'rgba(255,255,255,0.5)',
  textMut: 'rgba(255,255,255,0.28)',
  accent:  '#8b5cf6',
  accent2: '#6366f1',
  cyan:    '#06b6d4',
  green:   '#22c55e',
  red:     '#ef4444',
};

/* ── Pill Toggle ────────────────────────────────────── */
function Toggle({ checked, onChange, disabled }) {
  return (
    <div onClick={() => !disabled && onChange(!checked)} style={{
      width: '42px', height: '24px', borderRadius: '12px', flexShrink: 0,
      background: checked
        ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
        : 'rgba(255,255,255,0.12)',
      position: 'relative', cursor: disabled ? 'default' : 'pointer',
      transition: 'background 0.25s ease',
      opacity: disabled ? 0.4 : 1,
      boxShadow: checked ? '0 0 12px rgba(139,92,246,0.4)' : 'none',
    }}>
      <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: '#fff', position: 'absolute', top: '3px',
        left: checked ? '21px' : '3px',
        transition: 'left 0.2s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
      }} />
    </div>
  );
}

/* ── Glass Field Row ────────────────────────────────── */
function FieldRow({ label, hint, children }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '20px',
      padding: '14px 0',
      borderBottom: `1px solid ${G.border}`,
    }}>
      <label style={{
        width: '130px', flexShrink: 0, fontSize: '0.85rem',
        color: G.textSub, fontWeight: '500', paddingTop: '9px',
      }}>{label}</label>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {children}
        {hint && <span style={{ fontSize: '0.72rem', color: G.textMut }}>{hint}</span>}
      </div>
    </div>
  );
}

/* ── Toggle Row ─────────────────────────────────────── */
function SettingToggleRow({ icon, label, description, checked, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '14px',
      padding: '14px 18px', borderRadius: '12px',
      background: G.bg2, border: `1px solid ${G.border}`,
      marginBottom: '8px', transition: 'background 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.background = G.bg3}
      onMouseLeave={e => e.currentTarget.style.background = G.bg2}
    >
      {icon && (
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'rgba(139,92,246,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{icon}</div>
      )}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', fontSize: '0.88rem', color: G.text }}>{label}</div>
        {description && <div style={{ fontSize: '0.75rem', color: G.textMut, marginTop: '3px' }}>{description}</div>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════ */
export default function ProfileModal({ isOpen, onClose }) {
  const {
    currentUser, updateProfile, logout,
    theme, setTheme, bgWallpaper, setBgWallpaper,
    messageDensity, setMessageDensity,
    reducedMotion, setReducedMotion,
    devMode, setDevMode,
    fontScale, setFontScale,
    activeServerId, activeChannelId,
    selectedInputDeviceId, selectedOutputDeviceId,
    setInputDevice, setOutputDevice
  } = useApp();

  const [activeTab, setActiveTab] = useState('account');
  const [activeSubSection, setActiveSubSection] = useState('my-account');

  const [displayName, setDisplayName]         = useState(currentUser?.displayName || '');
  const [avatarUrl, setAvatarUrl]             = useState(currentUser?.avatarUrl || '');
  const [bannerColor, setBannerColor]         = useState(currentUser?.bannerColor || '#4f46e5');
  const [bio, setBio]                         = useState(currentUser?.bio || '');
  const [customStatus, setCustomStatus]       = useState(currentUser?.customStatus || '');
  const [pronouns, setPronouns]               = useState(currentUser?.pronouns || '');
  const [status, setStatus]                   = useState(currentUser?.status || 'online');
  const [email, setEmail]                     = useState(currentUser?.email || '');
  const [username, setUsername]               = useState(currentUser?.username || '');
  const [favoriteGame, setFavoriteGame]       = useState(currentUser?.favoriteGame || '');
  const [gamesInRotation, setGamesInRotation] = useState(currentUser?.gamesInRotation || '');
  const [inputVolume, setInputVolume]         = useState(80);
  const [outputVolume, setOutputVolume]       = useState(80);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [autoGain, setAutoGain]               = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [autoDeleteDuration, setAutoDeleteDuration] = useState(currentUser?.autoDeleteDuration || 0);
  const [toast, setToast]                     = useState('');

  const [connections, setConnections] = useState([
    { id: 'yt',      platform: 'YouTube',  account: 'moaaqil',   emoji: '▶️', connected: true  },
    { id: 'gh',      platform: 'GitHub',   account: 'moaaqil99', emoji: '🐙', connected: true  },
    { id: 'sp',      platform: 'Spotify',  account: 'moaaqil',   emoji: '🎵', connected: true  },
    { id: 'tw',      platform: 'Twitch',   account: '',          emoji: '🟣', connected: false },
    { id: 'steam',   platform: 'Steam',    account: '',          emoji: '🎮', connected: false },
    { id: 'discord', platform: 'Discord',  account: '',          emoji: '💬', connected: false },
  ]);

  // Real audio device enumeration (Bluetooth support)
  const [audioInputDevices,  setAudioInputDevices]  = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);

  const enumerateDevices = async () => {
    try {
      // Request mic permission first so device labels are visible
      await navigator.mediaDevices.getUserMedia({ audio: true })
        .then(s => s.getTracks().forEach(t => t.stop()))
        .catch(() => {}); // ignore if already granted or denied

      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs  = devices.filter(d => d.kind === 'audioinput');
      const outputs = devices.filter(d => d.kind === 'audiooutput');
      setAudioInputDevices(inputs);
      setAudioOutputDevices(outputs);
      
      // Default to first active device globally if default is selected
      if (inputs.length && (!selectedInputDeviceId || selectedInputDeviceId === 'default')) {
        setInputDevice(inputs[0].deviceId);
      }
      if (outputs.length && (!selectedOutputDeviceId || selectedOutputDeviceId === 'default')) {
        setOutputDevice(outputs[0].deviceId);
      }
    } catch (e) {
      console.warn('[DeviceEnum]', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      enumerateDevices();
      navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
      return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);



  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);



  if (!isOpen) return null;

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName, avatarUrl, bannerColor, bio, customStatus, status, pronouns, favoriteGame, gamesInRotation, autoDeleteDuration });
      showToast('✓ Changes saved successfully');
    } catch (e) { showToast('✗ Save failed: ' + (e.message || 'Unknown error')); }
    finally { setSaving(false); }
  };

  const toggleConn = (id) => {
    setConnections(prev => prev.map(c => {
      if (c.id !== id) return c;
      if (c.connected) return { ...c, connected: false, account: '' };
      const name = prompt(`Enter your ${c.platform} username:`);
      if (!name) return c;
      showToast(`✓ ${c.platform} connected!`);
      return { ...c, connected: true, account: name };
    }));
  };

  /* ── Sidebar nav structure ──────────────────────────── */
  const sidebarSections = [
    {
      label: 'User Settings',
      items: [
        { id: 'my-account',    label: 'My Account',     tab: 'account',      icon: <User size={14} /> },
        { id: 'profiles',      label: 'Profiles',        tab: 'account',      icon: <Sliders size={14} /> },
        { id: 'connections',   label: 'Connections',     tab: 'connections',  icon: <Link2 size={14} /> },
      ],
    },
    {
      label: 'Billing',
      items: [
        { id: 'nitro',         label: 'Nitro',           tab: 'nitro',        icon: <Crown size={14} color="#a78bfa" />, badge: 'FREE' },
        { id: 'server-boost',  label: 'Server Boost',    tab: 'nitro',        icon: <Flame size={14} color="#f472b6" /> },
        { id: 'subscriptions', label: 'Subscriptions',   tab: 'nitro',        icon: <Inbox size={14} /> },
      ],
    },
    {
      label: 'App Settings',
      items: [
        { id: 'voice-video',   label: 'Voice & Video',   tab: 'voice',        icon: <Volume2 size={14} /> },
        { id: 'chat-settings',  label: 'Chat Settings',   tab: 'chat',         icon: <Sliders size={14} /> },
        { id: 'appearance',    label: 'Appearance',      tab: 'appearance',   icon: <Moon size={14} /> },
        { id: 'accessibility', label: 'Accessibility',   tab: 'accessibility',icon: <HelpCircle size={14} /> },
      ],
    },
    {
      label: 'Developer',
      items: [
        { id: 'advanced',      label: 'Advanced',        tab: 'advanced',     icon: <Monitor size={14} /> },
      ],
    },
  ];

  const setSection = (item) => { setActiveSubSection(item.id); setActiveTab(item.tab); };

  /* ── Dark glass input styles ──────────────────────── */
  const inp = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: `1px solid ${G.border2}`,
    background: 'rgba(255,255,255,0.05)',
    fontSize: '0.88rem', color: G.text, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };
  const sel = {
    ...inp, appearance: 'none', cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px',
  };
  const area = { ...inp, resize: 'none', lineHeight: '1.5' };

  /* ── Section heading helpers ──────────────────────── */
  const SectionTitle = ({ children }) => (
    <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: G.text, marginBottom: '5px', lineHeight: 1.2, letterSpacing: '-0.3px' }}>{children}</h2>
  );
  const SectionDesc = ({ children }) => (
    <p style={{ fontSize: '0.85rem', color: G.textSub, marginBottom: '24px', lineHeight: 1.6 }}>{children}</p>
  );
  const GroupLabel = ({ children }) => (
    <div style={{ fontSize: '0.65rem', fontWeight: '800', color: G.textMut, textTransform: 'uppercase', letterSpacing: '1px', margin: '20px 0 8px 0' }}>{children}</div>
  );
  const GlassCard = ({ children, style = {} }) => (
    <div style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px', padding: '4px 18px', ...style }}>{children}</div>
  );

  /* ═══════ Tab Content Renderers ═══════ */

  const renderAccount = () => (
    <div>
      {activeSubSection === 'my-account' && (
        <>
          <SectionTitle>My Account</SectionTitle>
          <SectionDesc>Manage your identity, security credentials, and account standing.</SectionDesc>

          {/* Banner + avatar card */}
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${G.border2}`, marginBottom: '24px' }}>
            <div style={{ height: '88px', background: `linear-gradient(135deg, ${bannerColor}cc, ${bannerColor}55)`, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, backdropFilter: 'blur(2px)' }} />
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', padding: '0 20px 20px', borderTop: `1px solid ${G.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '-36px', marginBottom: '14px' }}>
                <img
                  src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`}
                  alt="avatar"
                  style={{ width: '70px', height: '70px', borderRadius: '50%', border: '3px solid rgba(139,92,246,0.6)', background: '#1a1a2e', objectFit: 'cover', boxShadow: '0 4px 20px rgba(139,92,246,0.3)' }}
                />
                <button onClick={() => setActiveSubSection('profiles')} style={{
                  padding: '7px 16px', borderRadius: '8px', border: `1px solid ${G.border2}`,
                  background: G.bg3, color: G.text, cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                  transition: 'all 0.15s',
                }}>
                  ✏️ Edit Profile
                </button>
              </div>
              <div style={{ fontWeight: '700', fontSize: '1rem', color: G.text }}>{displayName || username}</div>
              <div style={{ fontSize: '0.82rem', color: G.textMut }}>@{username}</div>
            </div>
          </div>

          <GlassCard>
            <FieldRow label="Display Name">
              <input style={inp} value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your display name" />
            </FieldRow>
            <FieldRow label="Username">
              <input style={{ ...inp, opacity: 0.55, cursor: 'not-allowed' }} value={`@${username}`} readOnly />
            </FieldRow>
            <FieldRow label="Email">
              <input style={inp} value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" type="email" />
            </FieldRow>
            <FieldRow label="Custom Status">
              <input style={inp} value={customStatus} onChange={e => setCustomStatus(e.target.value)} placeholder="What are you up to?" />
            </FieldRow>
            <FieldRow label="Online Status">
              <select style={sel} value={status} onChange={e => setStatus(e.target.value)}>
                <option value="online">🟢 Online</option>
                <option value="idle">🟡 Idle</option>
                <option value="dnd">🔴 Do Not Disturb</option>
                <option value="offline">⚪ Invisible</option>
              </select>
            </FieldRow>
          </GlassCard>

          {/* Account standing */}
          <div style={{ marginTop: '20px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '12px', padding: '14px 18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
            <Shield size={20} color="#22c55e" strokeWidth={1.5} />
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.88rem', color: '#4ade80' }}>Safe & Verified Account</div>
              <div style={{ fontSize: '0.74rem', color: 'rgba(74,222,128,0.65)', marginTop: '2px' }}>No active violations or reports on your profile.</div>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} style={{
            marginTop: '20px', width: '100%', padding: '12px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', color: '#fff', fontSize: '0.92rem', fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            boxShadow: '0 4px 20px rgba(139,92,246,0.35)', transition: 'all 0.2s',
          }}>
            {saving ? '⏳ Saving…' : '💾 Save Changes'}
          </button>
        </>
      )}

      {activeSubSection === 'profiles' && (
        <>
          <SectionTitle>Profiles</SectionTitle>
          <SectionDesc>Customize how your profile appears to other users on Kiko.</SectionDesc>
          <GlassCard>
            <FieldRow label="Avatar URL" hint="Paste a direct image URL or randomize.">
              <div style={{ display: 'flex', gap: '8px' }}>
                <input style={{ ...inp, flex: 1 }} value={avatarUrl} onChange={e => setAvatarUrl(e.target.value)} placeholder="https://…" />
                <button onClick={() => setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${Math.random().toString(36).slice(2)}`)}
                  style={{ padding: '9px 14px', borderRadius: '10px', border: `1px solid ${G.border2}`, background: G.bg3, color: G.text, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                  🎲 Random
                </button>
              </div>
            </FieldRow>
            <FieldRow label="Banner Color">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="color" value={bannerColor} onChange={e => setBannerColor(e.target.value)} style={{ width: '40px', height: '40px', borderRadius: '10px', border: `1px solid ${G.border2}`, cursor: 'pointer', padding: '2px', background: 'transparent' }} />
                <input style={{ ...inp, flex: 1 }} value={bannerColor} onChange={e => setBannerColor(e.target.value)} />
              </div>
            </FieldRow>
            <FieldRow label="Pronouns">
              <input style={inp} value={pronouns} onChange={e => setPronouns(e.target.value)} placeholder="e.g. they/them" />
            </FieldRow>
            <FieldRow label="Bio" hint="Brief intro shown on your profile card.">
              <textarea style={area} rows={3} value={bio} onChange={e => setBio(e.target.value)} placeholder="Write a short bio…" />
            </FieldRow>
            <FieldRow label="Favorite Game">
              <input style={inp} value={favoriteGame} onChange={e => setFavoriteGame(e.target.value)} placeholder="e.g. VALORANT" />
            </FieldRow>
            <FieldRow label="Games in Rotation" hint="Comma-separated list of games you actively play.">
              <input style={inp} value={gamesInRotation} onChange={e => setGamesInRotation(e.target.value)} placeholder="VALORANT, Wuthering Waves, …" />
            </FieldRow>
          </GlassCard>
          <button onClick={handleSave} disabled={saving} style={{ marginTop: '20px', width: '100%', padding: '12px', borderRadius: '12px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff', fontSize: '0.92rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 20px rgba(139,92,246,0.35)' }}>
            {saving ? '⏳ Saving…' : '💾 Save Changes'}
          </button>
        </>
      )}
    </div>
  );

  const renderConnections = () => (
    <div>
      <SectionTitle>Connections</SectionTitle>
      <SectionDesc>Link external platform accounts to showcase on your Kiko profile card.</SectionDesc>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {connections.map(c => (
          <div key={c.id} style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = G.bg3}
            onMouseLeave={e => e.currentTarget.style.background = G.bg2}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{c.emoji}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '600', color: G.text, fontSize: '0.88rem' }}>{c.platform}</div>
              <div style={{ fontSize: '0.74rem', color: c.connected ? G.green : G.textMut, marginTop: '2px' }}>
                {c.connected ? `@${c.account}` : 'Not connected'}
              </div>
            </div>
            <button onClick={() => toggleConn(c.id)} style={{
              padding: '7px 16px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
              border: `1px solid ${c.connected ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
              background: c.connected ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
              color: c.connected ? '#f87171' : '#4ade80', transition: 'all 0.15s',
            }}>{c.connected ? '✗ Disconnect' : '+ Connect'}</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderVoice = () => {
    const deviceLabel = (d) => {
      if (!d.label) return `Device ${d.deviceId.slice(0, 6)}…`;
      // Detect Bluetooth devices
      const isBT = d.label.toLowerCase().includes('bluetooth') || d.label.toLowerCase().includes('airpod') || d.label.toLowerCase().includes('headset');
      return (isBT ? '🔵 ' : '🔊 ') + d.label.replace(/\s*\(.*?\)\s*/g, '').trim();
    };

    return (
    <div>
      <SectionTitle>Voice & Video</SectionTitle>
      <SectionDesc>Configure your microphone, speakers, and audio processing settings.</SectionDesc>

      {/* Real device selectors */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <GroupLabel style={{ margin: 0 }}>Input / Output Devices</GroupLabel>
        <button onClick={enumerateDevices} style={{ fontSize: '0.7rem', color: G.textSub, background: G.bg3, border: `1px solid ${G.border}`, borderRadius: '6px', padding: '3px 10px', cursor: 'pointer' }}>
          🔄 Refresh
        </button>
      </div>

      <GlassCard>
        <FieldRow label="Microphone" hint={audioInputDevices.length === 0 ? 'Allow microphone permission to see devices' : `${audioInputDevices.length} device(s) found`}>
          {audioInputDevices.length > 0 ? (
            <select style={sel} value={selectedInputDeviceId} onChange={e => setInputDevice(e.target.value)}>
              {audioInputDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{deviceLabel(d)}</option>
              ))}
            </select>
          ) : (
            <div style={{ ...inp, color: G.textMut, fontStyle: 'italic', cursor: 'not-allowed' }}>
              No microphone detected — check permissions
            </div>
          )}
        </FieldRow>

        <FieldRow label="Speaker / Output" hint={audioOutputDevices.length === 0 ? 'Connect a speaker or Bluetooth device' : `${audioOutputDevices.length} device(s) found`}>
          {audioOutputDevices.length > 0 ? (
            <select style={sel} value={selectedOutputDeviceId} onChange={e => setOutputDevice(e.target.value)}>
              {audioOutputDevices.map(d => (
                <option key={d.deviceId} value={d.deviceId}>{deviceLabel(d)}</option>
              ))}
            </select>
          ) : (
            <div style={{ ...inp, color: G.textMut, fontStyle: 'italic', cursor: 'not-allowed' }}>
              No output device detected
            </div>
          )}
        </FieldRow>
      </GlassCard>

      {/* Device status chips */}
      {(audioInputDevices.length > 0 || audioOutputDevices.length > 0) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px', marginBottom: '4px' }}>
          {[...audioInputDevices, ...audioOutputDevices]
            .filter(d => d.label.toLowerCase().includes('bluetooth') || d.label.toLowerCase().includes('airpod') || d.label.toLowerCase().includes('headset'))
            .slice(0, 4)
            .map(d => (
              <div key={d.deviceId} style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '999px', padding: '4px 12px', fontSize: '0.72rem', color: '#a78bfa', display: 'flex', alignItems: 'center', gap: '5px' }}>
                🔵 {d.label.replace(/\s*\(.*?\)\s*/g, '').trim()} <span style={{ color: G.green, fontSize: '0.6rem' }}>● Connected</span>
              </div>
            ))
          }
        </div>
      )}

      <GroupLabel>Volume Controls</GroupLabel>
      <div style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px', padding: '20px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: G.text }}>Input Volume</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: G.green }}>{inputVolume}%</span>
          </div>
          <input type="range" min="0" max="100" value={inputVolume} onChange={e => setInputVolume(e.target.value)} style={{ width: '100%', accentColor: G.green }} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: G.text }}>Output Volume</span>
            <span style={{ fontSize: '0.85rem', fontWeight: '700', color: G.accent }}>{outputVolume}%</span>
          </div>
          <input type="range" min="0" max="100" value={outputVolume} onChange={e => setOutputVolume(e.target.value)} style={{ width: '100%', accentColor: G.accent }} />
        </div>
      </div>
      <GroupLabel>Audio Processing</GroupLabel>
      <SettingToggleRow icon={<Mic size={15} color="#a78bfa" />} label="Noise Suppression" description="Automatically filter out keyboard clicks and room echoes." checked={noiseSuppression} onChange={setNoiseSuppression} />
      <SettingToggleRow icon={<Volume2 size={15} color="#a78bfa" />} label="Echo Cancellation" description="Prevent feedback loops between speaker output and mic input." checked={echoCancellation} onChange={setEchoCancellation} />
      <SettingToggleRow icon={<Sparkles size={15} color="#a78bfa" />} label="Automatic Gain Control" description="Automatically normalize input levels to a consistent volume." checked={autoGain} onChange={setAutoGain} />
    </div>
    );
  };

  const renderChatSettings = () => (
    <div>
      <SectionTitle>Chat Settings</SectionTitle>
      <SectionDesc>Configure your online status visibility and automatic message disappearing timer.</SectionDesc>

      <GroupLabel>Online Status</GroupLabel>
      <FieldRow label="Visibility" hint="Choose how you appear to others on Kiko.">
        <select
          style={sel}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="online">🟢 Online</option>
          <option value="idle">🟡 Idle</option>
          <option value="dnd">🔴 Do Not Disturb</option>
          <option value="offline">⚫ Invisible</option>
        </select>
      </FieldRow>

      <GroupLabel>Disappearing Messages</GroupLabel>
      <FieldRow label="Auto-Delete Duration" hint="Messages you send will be automatically deleted after this duration.">
        <select
          style={sel}
          value={autoDeleteDuration}
          onChange={(e) => setAutoDeleteDuration(parseInt(e.target.value))}
        >
          <option value="0">Disabled (Keep Forever)</option>
          <option value="5">5 Minutes</option>
          <option value="60">1 Hour</option>
          <option value="1440">24 Hours (1 Day)</option>
        </select>
      </FieldRow>

      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ padding: '10px 20px', fontWeight: 'bold' }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div>
      <SectionTitle>Appearance</SectionTitle>
      <SectionDesc>Choose how Kiko looks and feels across the entire application.</SectionDesc>
      <GroupLabel>Theme</GroupLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { id: 'dark',   label: 'Dark',        icon: <Moon size={18} />,    desc: 'Rich dark backgrounds' },
          { id: 'light',  label: 'Light',        icon: <Sun size={18} />,     desc: 'Clean white surfaces' },
          { id: 'amoled', label: 'AMOLED Black', icon: <Shield size={18} />,  desc: 'Pure black, battery saver' },
        ].map(t => (
          <div key={t.id} onClick={() => { setTheme(t.id); updateProfile({ theme: t.id }); }} style={{
            padding: '16px', borderRadius: '12px', cursor: 'pointer',
            border: theme === t.id ? `2px solid ${G.accent}` : `1px solid ${G.border}`,
            background: theme === t.id ? 'rgba(139,92,246,0.12)' : G.bg2,
            transition: 'all 0.15s',
          }}>
            <div style={{ color: theme === t.id ? G.accent : G.textMut, marginBottom: '8px' }}>{t.icon}</div>
            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: theme === t.id ? G.accent : G.text }}>{t.label}</div>
            <div style={{ fontSize: '0.72rem', color: G.textMut, marginTop: '3px' }}>{t.desc}</div>
          </div>
        ))}
      </div>
      <GroupLabel>Message Density</GroupLabel>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
        {[{ id: 'cozy', label: '☁️ Cozy', desc: 'Spaced, readable layout' }, { id: 'compact', label: '⚡ Compact', desc: 'Dense, efficient layout' }].map(d => (
          <div key={d.id} onClick={() => { setMessageDensity(d.id); updateProfile({ messageDensity: d.id }); }} style={{ padding: '16px', borderRadius: '12px', cursor: 'pointer', border: messageDensity === d.id ? `2px solid ${G.accent}` : `1px solid ${G.border}`, background: messageDensity === d.id ? 'rgba(139,92,246,0.12)' : G.bg2, transition: 'all 0.15s' }}>
            <div style={{ fontWeight: '700', fontSize: '0.88rem', color: messageDensity === d.id ? G.accent : G.text }}>{d.label}</div>
            <div style={{ fontSize: '0.75rem', color: G.textMut, marginTop: '3px' }}>{d.desc}</div>
          </div>
        ))}
      </div>
      <GroupLabel>Font Scale</GroupLabel>
      <div style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px', padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '500', color: G.textSub }}>Chat Font Size</span>
          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: G.accent }}>{fontScale}%</span>
        </div>
        <input type="range" min="80" max="140" step="10" value={fontScale} onChange={e => setFontScale(parseInt(e.target.value))} onMouseUp={e => updateProfile({ fontScale: parseInt(e.target.value) })} onTouchEnd={e => updateProfile({ fontScale: parseInt(e.target.value) })} style={{ width: '100%', accentColor: G.accent }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.7rem', color: G.textMut }}>
          <span>80% Smaller</span><span>100% Default</span><span>140% Larger</span>
        </div>
      </div>
      <GroupLabel>Chat Wallpaper</GroupLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
        {[
          { name: 'Cozy',     url: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=60' },
          { name: 'Studio',   url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=60' },
          { name: 'Abstract', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=60' },
          { name: 'Dream',    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=60' },
        ].map(wp => (
          <div key={wp.name} onClick={() => { setBgWallpaper(wp.url); updateProfile({ bgWallpaper: wp.url }); showToast(`🖼 Wallpaper set to ${wp.name}`); }}
            style={{ height: '64px', borderRadius: '10px', cursor: 'pointer', overflow: 'hidden', backgroundImage: `url(${wp.url})`, backgroundSize: 'cover', backgroundPosition: 'center', border: bgWallpaper === wp.url ? `2px solid ${G.accent}` : '2px solid transparent', position: 'relative', boxShadow: bgWallpaper === wp.url ? `0 0 12px rgba(139,92,246,0.5)` : 'none', transition: 'all 0.15s' }}>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '3px 6px', fontSize: '0.62rem', fontWeight: '700', color: '#fff' }}>{wp.name}</div>
          </div>
        ))}
      </div>
      <label style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', borderRadius: '10px', border: `1px dashed ${G.border2}`, cursor: 'pointer', color: G.textSub, fontSize: '0.84rem' }}>
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
          const file = e.target.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = ev => { setBgWallpaper(ev.target.result); updateProfile({ bgWallpaper: ev.target.result }); showToast('✓ Custom wallpaper applied!'); };
          reader.readAsDataURL(file);
        }} />
        📸 Upload custom wallpaper…
      </label>
    </div>
  );

  const renderNitro = () => (
    <div>
      <SectionTitle>Nitro</SectionTitle>
      <SectionDesc>Unlock premium features, custom cosmetics, and support ongoing development.</SectionDesc>
      <div style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #7c3aed, #6366f1, #06b6d4)', padding: '32px', textAlign: 'center', marginBottom: '20px', boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
        <Crown size={36} color="#fff" style={{ marginBottom: '10px' }} />
        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', margin: '0 0 6px' }}>Kiko Nitro</h3>
        <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Unlock HD streams, 500MB uploads, custom effects.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: G.text, marginBottom: '6px' }}>Monthly Nitro</div>
          <div style={{ fontSize: '0.78rem', color: G.textMut, marginBottom: '16px' }}>Animated decorations, effects, and profile cosmetics.</div>
          <button onClick={() => showToast('✓ Monthly Nitro trial activated!')} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', border: 'none', color: '#fff', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>Try 2 Weeks Free</button>
        </div>
        <div style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: G.text, marginBottom: '6px' }}>Gift Nitro</div>
          <div style={{ fontSize: '0.78rem', color: G.textMut, marginBottom: '16px' }}>Send Nitro gift cards to friends on your list.</div>
          <button onClick={() => showToast('🎁 Gift Nitro: select a friend…')} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: G.bg3, border: `1px solid ${G.border2}`, color: G.text, fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}>🎁 Gift Nitro</button>
        </div>
      </div>
      <GroupLabel>Premium Perks</GroupLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        {[
          { emoji: '👾', title: 'Custom Emoji',          desc: 'Use custom emoji anywhere in chats.' },
          { emoji: '🎥', title: 'HD Video Streaming',    desc: 'Share in up to 4K 60fps.' },
          { emoji: '📁', title: '500MB Upload Limits',   desc: 'Attach large files in chat.' },
          { emoji: '✨', title: 'Profile Effects',        desc: 'Animated banners, halos, and particles.' },
        ].map(p => (
          <div key={p.title} style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '8px' }}>{p.emoji}</div>
            <div style={{ fontWeight: '700', fontSize: '0.85rem', color: G.text }}>{p.title}</div>
            <div style={{ fontSize: '0.72rem', color: G.textMut, marginTop: '4px', lineHeight: 1.4 }}>{p.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAccessibility = () => (
    <div>
      <SectionTitle>Accessibility</SectionTitle>
      <SectionDesc>Configure display and interaction preferences for a more comfortable experience.</SectionDesc>
      <GroupLabel>Motion & Animation</GroupLabel>
      <SettingToggleRow label="Reduced Motion" description="Minimize animations throughout the interface." checked={reducedMotion} onChange={val => { setReducedMotion(val); updateProfile({ reducedMotion: val }); }} />
      <GroupLabel>Display</GroupLabel>
      <GlassCard>
        <FieldRow label="Saturation" hint="Adjust color saturation of the entire interface.">
          <input type="range" min="50" max="150" defaultValue="100" style={{ width: '100%', accentColor: G.accent }} />
        </FieldRow>
      </GlassCard>
    </div>
  );

  const renderAdvanced = () => (
    <div>
      <SectionTitle>Advanced</SectionTitle>
      <SectionDesc>Developer tools, debugging options, and experimental features.</SectionDesc>
      <SettingToggleRow icon={<Monitor size={15} color="#a78bfa" />} label="Developer Mode" description="Enables ID copying for servers, channels, messages, and users." checked={devMode} onChange={val => { setDevMode(val); updateProfile({ devMode: val }); }} />
      {devMode && (
        <div style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px', padding: '20px', marginTop: '12px' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '700', color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>Developer Actions</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Copy User ID',    value: () => currentUser?.id || '' },
              { label: 'Copy Server ID',  value: () => activeServerId || 'null' },
              { label: 'Copy Channel ID', value: () => activeChannelId || 'null' },
            ].map(a => (
              <button key={a.label} onClick={() => { navigator.clipboard.writeText(a.value()); showToast(`✓ ${a.label} copied!`); }}
                style={{ padding: '8px 16px', borderRadius: '8px', border: `1px solid ${G.border2}`, background: G.bg3, color: G.text, cursor: 'pointer', fontSize: '0.8rem', fontWeight: '600' }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const tabRenderers = {
    account: renderAccount, connections: renderConnections, voice: renderVoice,
    chat: renderChatSettings,
    appearance: renderAppearance, nitro: renderNitro, accessibility: renderAccessibility, advanced: renderAdvanced,
  };

  /* ═══════════════════════════════════════════════════════
     RENDER — centered popup
     ═══════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── Keyframe injector ── */}
      <style>{`
        @keyframes settingsFadeIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .settings-input:focus {
          border-color: rgba(139,92,246,0.55) !important;
          box-shadow: 0 0 0 3px rgba(139,92,246,0.15) !important;
        }
        .settings-nav-item:hover {
          background: rgba(255,255,255,0.06) !important;
          color: #e8eaf0 !important;
        }
        .settings-save-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(139,92,246,0.5) !important;
        }
      `}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.72)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          animation: 'overlayFadeIn 0.2s ease',
        }}
      />

      {/* ── Modal box ── */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        pointerEvents: 'none',
      }}>
        <div
          onClick={e => e.stopPropagation()}
          style={{
            width: '1060px', maxWidth: '100%', height: '700px', maxHeight: '95vh',
            display: 'flex', borderRadius: '20px', overflow: 'hidden',
            background: G.bg0,
            border: `1px solid ${G.border2}`,
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
            animation: 'settingsFadeIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'all',
          }}
        >
          {/* ── Left Sidebar ── */}
          <div style={{
            width: '220px', flexShrink: 0,
            background: 'rgba(255,255,255,0.025)',
            borderRight: `1px solid ${G.border}`,
            display: 'flex', flexDirection: 'column',
            padding: '24px 12px 20px',
            overflowY: 'auto',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px', paddingLeft: '8px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(139,92,246,0.4)' }}>
                <span style={{ color: '#fff', fontWeight: '900', fontSize: '0.85rem' }}>K</span>
              </div>
              <span style={{ fontWeight: '800', fontSize: '0.95rem', color: G.text, letterSpacing: '-0.3px' }}>Kiko Settings</span>
            </div>

            {/* Nav */}
            {sidebarSections.map(section => (
              <div key={section.label} style={{ marginBottom: '18px' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: '800', color: G.textMut, textTransform: 'uppercase', letterSpacing: '1px', padding: '0 8px', marginBottom: '4px' }}>
                  {section.label}
                </div>
                {section.items.map(item => {
                  const isActive = activeSubSection === item.id;
                  return (
                    <div
                      key={item.id}
                      className="settings-nav-item"
                      onClick={() => setSection(item)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', marginBottom: '1px',
                        background: isActive ? 'rgba(139,92,246,0.18)' : 'transparent',
                        color: isActive ? '#a78bfa' : G.textSub,
                        fontWeight: isActive ? '700' : '500',
                        fontSize: '0.84rem',
                        boxShadow: isActive ? 'inset 2px 0 0 #8b5cf6' : 'none',
                        transition: 'all 0.12s ease',
                      }}
                    >
                      <span style={{ color: isActive ? '#a78bfa' : G.textMut, flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {item.badge && (
                        <span style={{ fontSize: '0.56rem', fontWeight: '800', background: 'linear-gradient(90deg, #7c3aed, #6366f1)', color: '#fff', padding: '2px 7px', borderRadius: '6px', letterSpacing: '0.3px' }}>
                          {item.badge}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Logout */}
            <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: `1px solid ${G.border}` }}>
              <div onClick={() => { logout(); onClose(); }} style={{
                display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px',
                borderRadius: '8px', cursor: 'pointer', color: '#f87171',
                fontSize: '0.84rem', fontWeight: '600',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <LogOut size={14} />
                <span>Log Out</span>
              </div>
            </div>
          </div>

          {/* ── Main Content ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px 48px' }}>
            <div style={{ maxWidth: '560px' }}>
              {(tabRenderers[activeTab] || renderAccount)()}
            </div>
          </div>

          {/* ── Close button ── */}
          <button
            onClick={onClose}
            title="Close (Esc)"
            style={{
              position: 'absolute', top: '16px', right: '16px',
              width: '32px', height: '32px', borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', border: `1px solid ${G.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: G.textSub, transition: 'all 0.15s',
              zIndex: 10,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#f87171'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = G.textSub; }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* ── Toast notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '28px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(22,22,38,0.95)', color: G.text,
          padding: '12px 24px', borderRadius: '12px', fontSize: '0.86rem',
          fontWeight: '600', zIndex: 99999,
          border: `1px solid ${G.border2}`,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(20px)',
          animation: 'settingsFadeIn 0.2s ease',
        }}>
          {toast}
        </div>
      )}
    </>
  );
}
