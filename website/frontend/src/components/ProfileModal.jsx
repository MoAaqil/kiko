import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import {
  X, LogOut, User, Volume2, Sliders, Link2, Monitor, HelpCircle,
  Crown, Flame, Inbox, Moon, Sun, Mic, ChevronDown, Gamepad2,
  Sparkles, Shield, Pencil, Trash2, RefreshCw
} from 'lucide-react';

const SpotifyLogo = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ display: 'block' }}>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.59 14.42c-.18.28-.54.37-.82.19-2.38-1.45-5.38-1.78-8.91-.97-.32.07-.64-.14-.71-.46-.07-.32.14-.64.46-.71 3.87-.88 7.17-.51 9.8.1.28.18.37.54.18.85zm1.22-2.72c-.22.37-.7.49-1.07.26-2.72-1.67-6.87-2.15-10.08-1.18-.41.13-.85-.1-.97-.52-.13-.41.1-.85.52-.97 3.67-1.11 8.24-.57 11.35 1.34.37.22.49.7.26 1.07zm.1-2.83c-3.53-2.09-9.37-2.29-12.78-1.25-.54.16-1.1-.14-1.26-.68-.16-.54.14-1.1.68-1.26 4-1.21 10.45-1 14.51 1.41.49.29.65.92.36 1.41-.3.49-.93.65-1.42.36z"/>
  </svg>
);

const GitHubLogo = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" style={{ display: 'block' }}>
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.164 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
  </svg>
);


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
    setInputDevice, setOutputDevice,
    updateAvailable, latestVersion, latestVersionInfo: contextLatestVersionInfo, CURRENT_VERSION
  } = useApp();

  const [activeTab, setActiveTab] = useState('account');
  const [activeSubSection, setActiveSubSection] = useState('my-account');

  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth <= 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
  const [avatarDecoration, setAvatarDecoration] = useState(currentUser?.avatarDecoration || '');
  const [profileEffect, setProfileEffect]       = useState(currentUser?.profileEffect || '');
  const [revealEmail, setRevealEmail]         = useState(false);
  const [revealPhone, setRevealPhone]         = useState(false);
  const [inputVolume, setInputVolume]         = useState(80);
  const [outputVolume, setOutputVolume]       = useState(80);
  const [noiseSuppression, setNoiseSuppression] = useState(true);
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [autoGain, setAutoGain]               = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [autoDeleteDuration, setAutoDeleteDuration] = useState(currentUser?.autoDeleteDuration || 0);
  const [toast, setToast]                     = useState('');
  const [authorizedApps, setAuthorizedApps] = useState([
    { id: 'wuwa', name: 'Wuthering Waves', date: '6/26/2026', permissions: 8, icon: 'https://i.pinimg.com/736x/ec/2e/ec/ec2eece0024a10df7685a420b92c4cd7.jpg' }
  ]);

  const [updateStatus, setUpdateStatus] = useState(updateAvailable ? 'available' : 'idle');
  const [latestVersionInfo, setLatestVersionInfo] = useState(contextLatestVersionInfo);

  useEffect(() => {
    if (contextLatestVersionInfo) {
      setLatestVersionInfo(contextLatestVersionInfo);
    }
  }, [contextLatestVersionInfo]);

  useEffect(() => {
    if (updateAvailable) {
      setUpdateStatus('available');
    }
  }, [updateAvailable]);

  const checkForUpdates = async () => {
    setUpdateStatus('checking');
    try {
      const res = await fetch('/version.json');
      if (res.ok) {
        const data = await res.json();
        setLatestVersionInfo(data);
        if (data.version && data.version !== CURRENT_VERSION) {
          setUpdateStatus('available');
          showToast('🔔 New update available: v' + data.version);
        } else {
          setUpdateStatus('uptodate');
          showToast('✓ App is up to date.');
        }
      } else {
        setTimeout(() => {
          setUpdateStatus('uptodate');
          showToast('✓ App is up to date.');
        }, 1200);
      }
    } catch (e) {
      setTimeout(() => {
        setUpdateStatus('uptodate');
        showToast('✓ App is up to date.');
      }, 1000);
    }
  };

  const handleUpdate = () => {
    showToast('🚀 Redirecting to download latest release...');
    setTimeout(() => {
      if (window.kikoElectron && window.kikoElectron.openExternal) {
        window.kikoElectron.openExternal('https://github.com/MoAaqil/kiko/releases');
      } else {
        window.location.reload(true);
      }
    }, 1000);
  };

  const [connections, setConnections] = useState([
    { id: 'yt',      platform: 'YouTube',  account: 'moaaqil',   emoji: '▶️', connected: true  },
    { id: 'gh',      platform: 'GitHub',   account: currentUser?.githubUsername || '', emoji: '🐙', connected: !!currentUser?.githubUsername  },
    { id: 'sp',      platform: 'Spotify',  account: currentUser?.spotifyUsername || '', emoji: '🎵', connected: !!currentUser?.spotifyUsername  },
    { id: 'tw',      platform: 'Twitch',   account: '',          emoji: '🟣', connected: false },
    { id: 'steam',   platform: 'Steam',    account: '',          emoji: '🎮', connected: false },
    { id: 'discord', platform: 'Discord',  account: '',          emoji: '💬', connected: false },
  ]);

  useEffect(() => {
    setConnections(prev => prev.map(c => {
      if (c.id === 'gh') return { ...c, account: currentUser?.githubUsername || '', connected: !!currentUser?.githubUsername };
      if (c.id === 'sp') return { ...c, account: currentUser?.spotifyUsername || '', connected: !!currentUser?.spotifyUsername };
      return c;
    }));
  }, [currentUser]);


  // Real audio device enumeration (Bluetooth support)
  const [audioInputDevices,  setAudioInputDevices]  = useState([]);
  const [audioOutputDevices, setAudioOutputDevices] = useState([]);

  const enumerateDevices = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('[DeviceEnum] navigator.mediaDevices is not available');
        return;
      }
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
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
      }
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
      await updateProfile({ 
        displayName, avatarUrl, bannerColor, bio, customStatus, status, pronouns, 
        favoriteGame, gamesInRotation, avatarDecoration, profileEffect, autoDeleteDuration 
      });
      showToast('✓ Changes saved successfully');
    } catch (e) { showToast('✗ Save failed: ' + (e.message || 'Unknown error')); }
    finally { setSaving(false); }
  };

  const toggleConn = async (id) => {
    if (id !== 'gh' && id !== 'sp') {
      setConnections(prev => prev.map(c => {
        if (c.id !== id) return c;
        if (c.connected) return { ...c, connected: false, account: '' };
        const name = prompt(`Enter your ${c.platform} username:`);
        if (!name) return c;
        showToast(`✓ ${c.platform} connected!`);
        return { ...c, connected: true, account: name };
      }));
      return;
    }

    const target = connections.find(c => c.id === id);
    if (target.connected) {
      try {
        const updatedFields = id === 'gh' ? { githubUsername: '' } : { spotifyUsername: '' };
        await updateProfile(updatedFields);
        showToast(`✓ ${target.platform} disconnected!`);
      } catch (err) {
        showToast(`✗ Disconnect failed: ` + (err.message || 'Unknown error'));
      }
    } else {
      const name = prompt(`Enter your ${target.platform} username:`);
      if (!name) return;
      try {
        const updatedFields = id === 'gh' ? { githubUsername: name } : { spotifyUsername: name };
        await updateProfile(updatedFields);
        showToast(`✓ ${target.platform} connected!`);
      } catch (err) {
        showToast(`✗ Connection failed: ` + (err.message || 'Unknown error'));
      }
    }
  };

  /* ── Sidebar nav structure ──────────────────────────── */
  const sidebarSections = [
    {
      label: 'User Settings',
      items: [
        { id: 'my-account',    label: 'My Account',     tab: 'account',      icon: <User size={14} /> },
        { id: 'profiles',      label: 'Profiles',        tab: 'account',      icon: <Sliders size={14} /> },
        { id: 'connections',   label: 'Connections',     tab: 'connections',  icon: <Link2 size={14} /> },
        { id: 'authorized-apps', label: 'Authorized Apps', tab: 'authorized-apps', icon: <Gamepad2 size={14} /> },
      ],
    },
    {
      label: 'Billing',
      items: [
        { id: 'nitro',         label: 'Aeos',            tab: 'nitro',        icon: <Crown size={14} color="#a78bfa" />, badge: 'FREE' },
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
        { id: 'updates',       label: 'App Updates',     tab: 'updates',      icon: <RefreshCw size={14} /> },
      ],
    },
    {
      label: 'Developer',
      items: [
        { id: 'advanced',      label: 'Advanced',        tab: 'advanced',     icon: <Monitor size={14} /> },
      ],
    },
  ];

  const setSection = (item) => {
    setActiveSubSection(item.id);
    setActiveTab(item.tab);
    if (isMobileView) setMobileMenuOpen(false);
  };

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

  /* ── Section heading helpers ─────── */
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

  const renderAccount = () => (
    <div style={{ width: '100%' }}>
      {activeSubSection === 'my-account' && (
        <>
          <SectionTitle>Account</SectionTitle>
          <SectionDesc>Manage your account settings and credentials.</SectionDesc>

          {/* Account Info Card (Image 5) */}
          <div style={{
            background: '#2b2d31',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.05)',
            marginBottom: '24px',
          }}>
            <h3 style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>Account Info</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Username row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: G.textSub, fontWeight: '700', textTransform: 'uppercase' }}>Username</div>
                  <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '4px' }}>{username}</div>
                </div>
                <button onClick={() => {
                  const val = prompt("Edit Username:", username);
                  if (val) setUsername(val);
                }} style={{ background: '#4e5058', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 16px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                  Edit
                </button>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

              {/* Email row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: G.textSub, fontWeight: '700', textTransform: 'uppercase' }}>Email</div>
                  <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {revealEmail ? email : email.replace(/^([^@]{3})[^@]+/, '$1********')}
                    <span onClick={() => setRevealEmail(!revealEmail)} style={{ color: G.cyan, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                      {revealEmail ? 'Hide' : 'Reveal'}
                    </span>
                  </div>
                </div>
                <button onClick={() => {
                  const val = prompt("Edit Email:", email);
                  if (val) setEmail(val);
                }} style={{ background: '#4e5058', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 16px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                  Edit
                </button>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

              {/* Phone row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: G.textSub, fontWeight: '700', textTransform: 'uppercase' }}>Phone Number</div>
                  <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {revealPhone ? "+1 555-555-2077" : "*********2077"}
                    <span onClick={() => setRevealPhone(!revealPhone)} style={{ color: G.cyan, fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>
                      {revealPhone ? 'Hide' : 'Reveal'}
                    </span>
                  </div>
                </div>
                <button onClick={() => showToast('✏️ Phone number modification is disabled for this test account.')} style={{ background: '#4e5058', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 16px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                  Edit
                </button>
              </div>
            </div>
          </div>

          {/* Password & Security Card (Image 5) */}
          <div style={{
            background: '#2b2d31',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid rgba(255,255,255,0.05)',
            marginBottom: '24px',
          }}>
            <h3 style={{ fontSize: '0.82rem', color: '#fff', fontWeight: '800', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>Password & Security</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Password row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.74rem', color: G.textSub, fontWeight: '700', textTransform: 'uppercase' }}>Password</div>
                  <div style={{ fontSize: '0.9rem', color: '#fff', marginTop: '4px' }}>••••••••••••</div>
                </div>
                <button onClick={() => showToast('🔑 Password change request sent.')} style={{ background: '#4e5058', color: '#fff', border: 'none', borderRadius: '4px', padding: '6px 16px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer' }}>
                  Edit
                </button>
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)' }} />

              {/* MFA row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#fff', fontWeight: '700' }}>Multi-Factor Authentication</div>
                  <div style={{ fontSize: '0.74rem', color: G.textSub, marginTop: '2px' }}>Protect your account with an extra layer of security.</div>
                </div>
                <button onClick={() => showToast('🔐 Opening MFA configuration...')} style={{ background: '#5865f2', color: '#fff', border: 'none', borderRadius: '4px', padding: '8px 16px', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Set up ➔
                </button>
              </div>
            </div>
          </div>
          
          <button onClick={handleSave} disabled={saving} style={{
            width: '100%', padding: '12px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '700',
            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            boxShadow: '0 4px 20px rgba(139,92,246,0.35)', transition: 'all 0.2s',
          }}>
            {saving ? '⏳ Saving…' : '💾 Save Account Details'}
          </button>
        </>
      )}

      {activeSubSection === 'profiles' && (
        <div style={{ display: 'flex', gap: '20px', width: '100%', minHeight: '520px' }}>
          {/* COLUMN 1: CONTROLS (width: 280px) */}
          <div style={{ width: '260px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Dropdown */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: G.textSub, textTransform: 'uppercase', marginBottom: '8px' }}>Main Profile</div>
              <select style={sel}>
                <option>User Profile</option>
                <option>Server Profile</option>
              </select>
            </div>

            {/* Nameplate section */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: G.textSub, textTransform: 'uppercase', marginBottom: '8px' }}>Nameplate</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input style={{ ...inp, flex: 1 }} placeholder="Default style..." value={avatarDecoration ? "Standard decoration" : ""} readOnly />
                <button onClick={() => setAvatarDecoration(avatarDecoration ? '' : 'halo')} style={{ padding: '9px 12px', background: G.bg3, border: `1px solid ${G.border2}`, color: '#fff', borderRadius: '10px', cursor: 'pointer', fontSize: '0.8rem' }}>
                  {avatarDecoration ? 'Clear' : '+'}
                </button>
              </div>
            </div>

            {/* Avatar & Decoration */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: G.textSub, textTransform: 'uppercase', marginBottom: '8px' }}>Avatar & Decoration</div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <div 
                  onClick={() => setAvatarDecoration('halo')} 
                  style={{ width: '42px', height: '42px', borderRadius: '50%', border: avatarDecoration === 'halo' ? `2px solid ${G.accent}` : `1px solid ${G.border}`, background: G.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem' }}
                  title="Halo decoration"
                >
                  😇
                </div>
                <div 
                  onClick={() => setAvatarDecoration('crown')} 
                  style={{ width: '42px', height: '42px', borderRadius: '50%', border: avatarDecoration === 'crown' ? `2px solid ${G.accent}` : `1px solid ${G.border}`, background: G.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem' }}
                  title="Crown decoration"
                >
                  👑
                </div>
                <div 
                  onClick={() => setAvatarDecoration('sparkles-decor')} 
                  style={{ width: '42px', height: '42px', borderRadius: '50%', border: avatarDecoration === 'sparkles-decor' ? `2px solid ${G.accent}` : `1px solid ${G.border}`, background: G.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem' }}
                  title="Sparkles decoration"
                >
                  ✨
                </div>
                <div 
                  onClick={() => setAvatarDecoration('')} 
                  style={{ width: '42px', height: '42px', borderRadius: '50%', border: avatarDecoration === '' ? `2px solid ${G.accent}` : `1px solid ${G.border}`, background: G.bg2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '0.75rem', color: G.textMut }}
                  title="No decoration"
                >
                  None
                </div>
              </div>
              <button onClick={() => {
                const url = prompt("Enter Avatar Image URL:", avatarUrl);
                if (url !== null) setAvatarUrl(url);
              }} style={{ width: '100%', padding: '10px', background: G.bg3, border: `1px solid ${G.border2}`, color: G.text, borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '0.82rem' }}>
                📸 Upload Avatar
              </button>
            </div>

            {/* Banner Color */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: G.textSub, textTransform: 'uppercase', marginBottom: '8px' }}>Banner Color</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="color" value={bannerColor} onChange={e => setBannerColor(e.target.value)} style={{ width: '40px', height: '40px', borderRadius: '10px', border: `1px solid ${G.border2}`, cursor: 'pointer', padding: '2px', background: 'transparent' }} />
                <input style={{ ...inp, flex: 1 }} value={bannerColor} onChange={e => setBannerColor(e.target.value)} />
              </div>
            </div>

            {/* Profile Effect */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: G.textSub, textTransform: 'uppercase', marginBottom: '8px' }}>Profile Effect</div>
              <select style={sel} value={profileEffect} onChange={e => setProfileEffect(e.target.value)}>
                <option value="">No particle effects</option>
                <option value="sakura">🌸 Sakura Blossoms</option>
                <option value="sparkles">✨ Sparkles</option>
                <option value="neon">⚡ Neon Drops</option>
              </select>
            </div>

            {/* Pronouns input */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: '800', color: G.textSub, textTransform: 'uppercase', marginBottom: '8px' }}>Pronouns</div>
              <input style={inp} value={pronouns} onChange={e => setPronouns(e.target.value)} placeholder="e.g. they/them" />
            </div>

            {/* Nitro Badge */}
            <div style={{ background: 'linear-gradient(135deg, #7c3aed, #db2777)', borderRadius: '12px', padding: '12px', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ fontWeight: '700', fontSize: '0.8rem', marginBottom: '4px' }}>Level up your look, only with Nitro</div>
              <button onClick={() => showToast('✓ Trial activated!')} style={{ background: '#fff', color: '#7c3aed', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '0.74rem', fontWeight: '800', cursor: 'pointer' }}>Get Nitro</button>
            </div>

          </div>

          {/* COLUMN 2: LIVE CARD PREVIEW (width: 280px) */}
          <div style={{ width: '280px', flexShrink: 0 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '800', color: G.textSub, textTransform: 'uppercase', marginBottom: '8px' }}>Live Card Preview</div>
            {/* Discord User Card Component */}
            <div style={{
              borderRadius: '16px', overflow: 'hidden', border: `1px solid ${G.border2}`, background: '#111214',
              boxShadow: '0 16px 36px rgba(0,0,0,0.5)', height: '480px', display: 'flex', flexDirection: 'column',
              position: 'relative'
            }}>
              {/* Banner Color */}
              <div style={{ height: '70px', background: bannerColor, position: 'relative' }} />

              {/* Avatar and status moon */}
              <div style={{ padding: '0 16px', marginTop: '-42px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <img src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`} alt="avatar" style={{ width: '74px', height: '74px', borderRadius: '50%', border: '6px solid #111214', background: '#1a1a2e', objectFit: 'cover' }} />
                  <span className={`status-dot ${status}`} style={{ position: 'absolute', bottom: '2px', right: '2px', width: '18px', height: '18px', borderRadius: '50%', border: '3px solid #111214' }} />
                  {avatarDecoration && (
                    <span style={{ position: 'absolute', top: '-10px', left: '-10px', fontSize: '1.8rem', pointerEvents: 'none' }}>
                      {avatarDecoration === 'halo' ? '😇' : avatarDecoration === 'crown' ? '👑' : '✨'}
                    </span>
                  )}
                </div>

                {/* Custom status pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '4px 10px', borderRadius: '16px', fontSize: '0.68rem', color: '#fff', fontWeight: '500', maxWidth: '120px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <span>💭</span>
                  <span>{customStatus || '+ Status'}</span>
                </div>
              </div>

              {/* User Nameplate details */}
              <div style={{ padding: '0 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: '700', fontSize: '1rem', color: '#fff' }}>{displayName || username}</span>
                  <span style={{ background: G.green, color: '#fff', fontSize: '0.58rem', fontWeight: '900', padding: '1px 3px', borderRadius: '3px' }}>#</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: G.textSub }}>@{username}</span>
                {pronouns && <span style={{ fontSize: '0.72rem', color: G.cyan, marginTop: '2px', fontWeight: '600' }}>{pronouns}</span>}
              </div>

              <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 16px 8px 16px' }} />

              {/* Bio / haiku */}
              <div style={{ padding: '0 16px', flex: 1, overflowY: 'auto' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: '800', color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Describe yourself in a haiku</div>
                <p style={{ fontSize: '0.78rem', color: G.textSub, margin: '0 0 12px 0', fontStyle: 'italic', lineHeight: '1.4' }}>
                  {bio || 'Write a short description in your profile edits!'}
                </p>

                <div style={{ fontSize: '0.68rem', fontWeight: '800', color: G.textMut, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Member Since</div>
                <div style={{ fontSize: '0.76rem', color: G.textSub }}>Oct 26, 2022</div>
              </div>
            </div>
          </div>

          {/* COLUMN 3: WIDGETS DASHBOARD */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: `1px solid ${G.border}`, paddingBottom: '6px', gap: '16px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: G.accent, borderBottom: `2px solid ${G.accent}`, paddingBottom: '4px', cursor: 'pointer' }}>Board</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '500', color: G.textSub, cursor: 'pointer' }}>Activity</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '500', color: G.textSub, cursor: 'pointer' }}>Wishlist</span>
            </div>

            {/* Your Widgets section */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: G.textSub, textTransform: 'uppercase' }}>Your Widgets</span>
              <button onClick={() => showToast('➕ Adding Widget...')} style={{ fontSize: '0.72rem', color: G.text, background: G.bg3, border: `1px solid ${G.border2}`, borderRadius: '6px', padding: '3px 8px', cursor: 'pointer', fontWeight: '600' }}>
                + Add Widget
              </button>
            </div>

            {/* Widget 1: Favorite game */}
            <div style={{ background: '#1e1f22', border: `1px solid ${G.border}`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: G.textMut, fontWeight: '700', textTransform: 'uppercase' }}>Favorite game</span>
                <span style={{ fontSize: '0.68rem', color: G.cyan }}>Choose 1 game</span>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '56px', height: '76px', borderRadius: '6px', background: G.bg2, backgroundImage: 'url("https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop&q=60")', backgroundSize: 'cover', backgroundPosition: 'center', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fff' }}>{favoriteGame || "NTE: Neverness to Everness"}</div>
                  <p style={{ fontSize: '0.68rem', color: G.textMut, margin: '4px 0 0 0', lineHeight: '1.3' }}>Let everyone know why this is your favorite game!</p>
                  <input 
                    style={{ ...inp, padding: '4px 8px', fontSize: '0.72rem', marginTop: '6px', height: '24px' }} 
                    value={favoriteGame} 
                    onChange={e => setFavoriteGame(e.target.value)} 
                    placeholder="Update favorite game..." 
                  />
                </div>
              </div>
            </div>

            {/* Widget 2: Games in rotation */}
            <div style={{ background: '#1e1f22', border: `1px solid ${G.border}`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.74rem', color: G.textMut, fontWeight: '700', textTransform: 'uppercase' }}>Games in rotation</span>
                <span style={{ fontSize: '0.68rem', color: G.textSub }}>Add up to 5 games</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '48px', height: '64px', borderRadius: '6px', background: '#ff4655', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: '800', fontSize: '0.6rem', textAlign: 'center', padding: '4px' }}>VALORANT</div>
                <div style={{ width: '48px', height: '64px', borderRadius: '6px', background: G.bg2, border: `1px dashed ${G.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '1.2rem', color: G.textMut }}>+</div>
                <div style={{ flex: 1 }}>
                  <input 
                    style={{ ...inp, padding: '4px 8px', fontSize: '0.72rem', height: '24px' }} 
                    value={gamesInRotation} 
                    onChange={e => setGamesInRotation(e.target.value)} 
                    placeholder="Games list (comma separated)" 
                  />
                </div>
              </div>
            </div>

            {/* Save and Actions */}
            <button onClick={handleSave} disabled={saving} style={{
              marginTop: 'auto', width: '100%', padding: '10px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', color: '#fff',
              fontSize: '0.85rem', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
              boxShadow: '0 4px 16px rgba(139,92,246,0.3)', transition: 'all 0.15s'
            }}>
              {saving ? '⏳ Saving…' : '💾 Save Profile Customizations'}
            </button>

          </div>
        </div>
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
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              {c.id === 'sp' ? (
                <span style={{ color: '#1db954', display: 'flex', alignItems: 'center' }}><SpotifyLogo /></span>
              ) : c.id === 'gh' ? (
                <span style={{ color: '#ffffff', display: 'flex', alignItems: 'center' }}><GitHubLogo /></span>
              ) : (
                c.emoji
              )}
            </div>
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
        {[
          { id: 'light',  label: 'Light',  color: '#ffffff', textColor: '#313338' },
          { id: 'dark',   label: 'Dark',   color: '#2b2d31', textColor: '#f0f2f8' },
          { id: 'amoled', label: 'Darker', color: '#111214', textColor: '#b8bec9' },
          { id: 'sync',   label: 'Sync',   color: 'linear-gradient(135deg, #2b2d31 50%, #ffffff 50%)', textColor: '#8b5cf6' },
        ].map(t => {
          const isActive = theme === t.id;
          return (
            <div key={t.id} onClick={() => { setTheme(t.id); updateProfile({ theme: t.id }); }} className={`theme-select-card ${isActive ? 'active' : ''}`}>
              <div style={{
                height: '40px', borderRadius: '6px', 
                background: t.color, border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <span style={{ fontSize: '1rem', fontWeight: 'bold', color: t.textColor }}>Aa</span>
              </div>
              <div style={{ fontWeight: '700', fontSize: '0.82rem', color: isActive ? G.accent : G.text, textAlign: 'center' }}>{t.label}</div>
            </div>
          );
        })}
      </div>

      <div className="nitro-banner-card">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', fontWeight: '700', color: 'white', fontSize: '1.0rem' }}>
            👑 Make your Kiko look *juuusst* right
          </div>
          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', marginTop: '4px' }}>
            Create your own custom theme to make Kiko uniquely yours. Only with Nitro.
          </div>
        </div>
        <button className="nitro-banner-btn" onClick={() => showToast('✨ Try custom themes in Nitro!')}>Try it out</button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <GroupLabel style={{ margin: 0 }}>Color Themes <span className="nitro-badge">Nitro</span></GroupLabel>
        <button style={{ background: G.bg3, border: `1px solid ${G.border2}`, color: G.text, padding: '4px 12px', borderRadius: '16px', fontSize: '0.74rem', cursor: 'pointer', fontWeight: '700' }} onClick={() => showToast('✨ Unlocking Theme Customization...')}>Unlock with Nitro</button>
      </div>

      <div className="color-palette-grid">
        {[
          '#ff8fab', '#ffb7c5', '#ffe066', '#a78bfa', '#ff73fa', '#ff9068', '#4ade80', '#06b6d4',
          '#3b82f6', '#ec4899', '#f43f5e', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#111827'
        ].map((col, idx) => (
          <div 
            key={idx} 
            className="color-palette-swatch" 
            style={{ backgroundColor: col }}
            onClick={() => showToast(`🎨 Color Theme preview activated! Upgrade to Nitro to save.`)}
          />
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
      <SectionTitle>Aeos</SectionTitle>
      <SectionDesc>Unlock premium features, custom cosmetics, and support ongoing development.</SectionDesc>
      <div style={{ borderRadius: '16px', background: 'linear-gradient(135deg, #7c3aed, #6366f1, #06b6d4)', padding: '32px', textAlign: 'center', marginBottom: '20px', boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
        <Crown size={36} color="#fff" style={{ marginBottom: '10px' }} />
        <h3 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#fff', margin: '0 0 6px' }}>Kiko Aeos</h3>
        <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', margin: 0 }}>Unlock HD streams, 500MB uploads, custom effects.</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
        <div style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: G.text, marginBottom: '6px' }}>Monthly Aeos</div>
          <div style={{ fontSize: '0.78rem', color: G.textMut, marginBottom: '16px' }}>Animated decorations, effects, and profile cosmetics.</div>
          <button onClick={() => showToast('✓ Monthly Aeos trial activated!')} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: 'linear-gradient(90deg, #7c3aed, #4f46e5)', border: 'none', color: '#fff', fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 16px rgba(124,58,237,0.4)' }}>Try 2 Weeks Free</button>
        </div>
        <div style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '14px', padding: '20px' }}>
          <div style={{ fontWeight: '700', fontSize: '0.95rem', color: G.text, marginBottom: '6px' }}>Gift Aeos</div>
          <div style={{ fontSize: '0.78rem', color: G.textMut, marginBottom: '16px' }}>Send Aeos gift cards to friends on your list.</div>
          <button onClick={() => showToast('🎁 Gift Aeos: select a friend…')} style={{ width: '100%', padding: '11px', borderRadius: '10px', background: G.bg3, border: `1px solid ${G.border2}`, color: G.text, fontWeight: '700', fontSize: '0.88rem', cursor: 'pointer' }}>🎁 Gift Aeos</button>
        </div>
      </div>

      <GroupLabel>Aeos Stickers Shop</GroupLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { id: 'cat_wink', name: 'Cat Wink', url: 'https://i.pinimg.com/736x/19/46/76/1946762a5847ee6fa4c97a11b69af242.jpg', type: 'FREE' },
          { id: 'cat_happy', name: 'Cat Happy', url: 'https://i.pinimg.com/736x/76/a0/7c/76a07c962bb96a1790724881305d0194.jpg', type: 'FREE' },
          { id: 'cat_love', name: 'Cat Love', url: 'https://i.pinimg.com/736x/d8/36/af/d836af1443b4572d778b39b73dc40b77.jpg', type: 'Aeos Exclusive' },
          { id: 'cat_surprised', name: 'Cat Surprised', url: 'https://i.pinimg.com/736x/98/5e/80/985e80d0ceda54b014e5891a4c9c7500.jpg', type: 'FREE' },
          { id: 'cat_sleeping', name: 'Cat Sleeping', url: 'https://i.pinimg.com/736x/0b/30/18/0b301887831b5ca9d75f4e89a7867b79.jpg', type: 'Aeos Exclusive' },
          { id: 'cat_crying', name: 'Cat Crying', url: 'https://i.pinimg.com/736x/77/fa/cc/77facc4484241327c75bcdb2a2f5c5ef.jpg', type: 'Aeos Exclusive' }
        ].map(s => (
          <div key={s.id} style={{ background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <img src={s.url} alt={s.name} style={{ width: '56px', height: '56px', borderRadius: '8px', objectFit: 'contain', background: 'rgba(255,255,255,0.03)' }} />
            <div style={{ fontWeight: '700', fontSize: '0.74rem', color: G.text, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{s.name}</div>
            <button 
              onClick={() => showToast(`✓ ${s.name} sticker unlocked & added to chat picker!`)} 
              style={{ 
                width: '100%', 
                padding: '6px', 
                borderRadius: '6px', 
                background: s.type === 'FREE' ? '#248046' : 'linear-gradient(90deg, #7c3aed, #4f46e5)', 
                border: 'none', 
                color: '#fff', 
                fontWeight: '700', 
                fontSize: '0.68rem', 
                cursor: 'pointer' 
              }}
            >
              {s.type === 'FREE' ? 'Claim' : 'Unlock'}
            </button>
          </div>
        ))}
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

  const renderUpdates = () => (
    <div>
      <SectionTitle>App Updates</SectionTitle>
      <SectionDesc>Manage application versions and check for updates.</SectionDesc>
      
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: '#fff' }}>Current Version</div>
            <div style={{ fontSize: '0.85rem', color: G.textSub, marginTop: '4px' }}>v{CURRENT_VERSION}</div>
          </div>
          <div>
            {updateStatus === 'checking' && (
              <span style={{ fontSize: '0.88rem', color: G.accent }}>Checking for updates...</span>
            )}
            {updateStatus === 'idle' && (
              <button 
                onClick={checkForUpdates}
                style={{ padding: '8px 16px', borderRadius: '8px', background: G.bg3, border: `1px solid ${G.border2}`, color: G.text, fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.15s ease' }}
              >
                Check for Updates
              </button>
            )}
            {updateStatus === 'uptodate' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', color: G.green, fontWeight: '600' }}>✓ Up to date</span>
                <button 
                  onClick={checkForUpdates}
                  style={{ padding: '6px 12px', borderRadius: '6px', background: 'transparent', border: `1px solid ${G.border}`, color: G.textSub, fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  Check again
                </button>
              </div>
            )}
            {updateStatus === 'available' && (
              <button 
                onClick={handleUpdate}
                style={{ padding: '8px 16px', borderRadius: '8px', background: 'linear-gradient(90deg, #10b981, #059669)', border: 'none', color: '#fff', fontWeight: '700', fontSize: '0.82rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
              >
                Update Now
              </button>
            )}
          </div>
        </div>
      </GlassCard>

      {updateStatus === 'available' && latestVersionInfo && (
        <div style={{ marginTop: '20px', background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: G.green, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            🎉 Version {latestVersionInfo.version} is available!
          </div>
          <div style={{ fontSize: '0.85rem', color: G.textSub, fontWeight: '600', marginBottom: '6px' }}>Release Notes:</div>
          <div style={{ fontSize: '0.8rem', color: G.textSub, lineHeight: '1.5', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
            {latestVersionInfo.releaseNotes || 'Bug fixes and performance improvements.'}
          </div>
        </div>
      )}
    </div>
  );

  const renderAuthorizedApps = () => (
    <div>
      <SectionTitle>Authorized Apps</SectionTitle>
      <SectionDesc>These are the applications that have access to your Kiko account. You can revoke their access at any time.</SectionDesc>

      <div style={{
        background: '#2b2d31', borderRadius: '8px', padding: '16px', marginBottom: '20px',
        border: '1px solid rgba(255,255,255,0.06)'
      }}>
        <div style={{ fontWeight: '700', fontSize: '0.95rem', color: G.text, marginBottom: '6px' }}>Applications</div>
        <p style={{ fontSize: '0.8rem', color: G.textSub, margin: 0, lineHeight: 1.4 }}>
          Here are all the apps that are doing super cool things to make your Kiko experience super cooler. If it gets too chilly, you can remove them at any time.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {authorizedApps.map(app => (
          <div key={app.id} style={{
            background: G.bg2, border: `1px solid ${G.border}`, borderRadius: '8px', padding: '16px',
            display: 'flex', flexDirection: 'column', gap: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={app.icon} alt={app.name} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} />
                <div>
                  <div style={{ fontWeight: '700', color: G.text, fontSize: '0.88rem' }}>{app.name}</div>
                  <div style={{ fontSize: '0.74rem', color: G.textSub, marginTop: '2px' }}>Authorized on {app.date}</div>
                </div>
              </div>
              <button style={{ background: 'none', border: 'none', color: G.textSub, cursor: 'pointer' }}>•••</button>
            </div>

            <div style={{ borderTop: `1px solid ${G.border}`, paddingTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '6px 0' }}>
                <span style={{ fontSize: '0.8rem', color: G.text, fontWeight: '600' }}>About and Policies</span>
                <span style={{ color: G.textSub }}>&gt;</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '6px 0', borderTop: `1px solid rgba(255,255,255,0.03)` }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: G.text, fontWeight: '600' }}>Permissions</div>
                  <div style={{ fontSize: '0.72rem', color: G.textSub, marginTop: '2px' }}>{app.permissions} Permissions enabled</div>
                </div>
                <span style={{ color: G.textSub }}>&gt;</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button 
                onClick={() => {
                  setAuthorizedApps(prev => prev.filter(a => a.id !== app.id));
                  showToast(`✓ Deauthorized ${app.name}`);
                }}
                style={{
                  padding: '6px 14px', borderRadius: '4px', background: '#ef4444', color: 'white',
                  border: 'none', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer',
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#dc2626'}
                onMouseLeave={e => e.currentTarget.style.background = '#ef4444'}
              >
                Deauthorize
              </button>
            </div>
          </div>
        ))}
        {authorizedApps.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px', color: G.textSub, fontSize: '0.88rem' }}>
            No authorized applications found.
          </div>
        )}
      </div>
    </div>
  );

  const tabRenderers = {
    account: renderAccount, connections: renderConnections, voice: renderVoice,
    chat: renderChatSettings,
    appearance: renderAppearance, nitro: renderNitro, accessibility: renderAccessibility, advanced: renderAdvanced,
    updates: renderUpdates,
    'authorized-apps': renderAuthorizedApps,
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
            width: activeSubSection === 'profiles' ? '1240px' : '1060px', maxWidth: '100%', 
            height: isMobileView ? '100dvh' : '700px', 
            maxHeight: isMobileView ? '100dvh' : '95vh',
            display: 'flex', borderRadius: isMobileView ? '0px' : '20px', overflow: 'hidden',
            background: G.bg0,
            border: isMobileView ? 'none' : `1px solid ${G.border2}`,
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
            animation: 'settingsFadeIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            pointerEvents: 'all',
            flexDirection: isMobileView ? 'column' : 'row'
          }}
        >
          {/* ── Left Sidebar ── */}
          {(!isMobileView || mobileMenuOpen) && (
            <div style={{
              width: isMobileView ? '100%' : '220px', flexShrink: 0,
              background: 'rgba(255,255,255,0.025)',
              borderRight: isMobileView ? 'none' : `1px solid ${G.border}`,
              display: 'flex', flexDirection: 'column',
              padding: '24px 12px 20px',
              overflowY: 'auto',
              height: '100%',
              boxSizing: 'border-box'
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
          )}

          {/* ── Main Content ── */}
          {(!isMobileView || !mobileMenuOpen) && (
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              padding: isMobileView ? '24px 16px 48px' : '32px 36px 48px',
              width: '100%',
              boxSizing: 'border-box'
            }}>
              {isMobileView && (
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: `1px solid ${G.border}`,
                    borderRadius: '8px',
                    color: G.text,
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  ← Back to Menu
                </button>
              )}
              <div style={{ maxWidth: '560px' }}>
                {(tabRenderers[activeTab] || renderAccount)()}
              </div>
            </div>
          )}

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
