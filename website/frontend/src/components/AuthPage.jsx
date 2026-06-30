import React, { useState } from 'react';
import { useApp } from '../context/AppContext.jsx';

export const KikoLogo = ({ size = 80 }) => (
  <div style={{ 
    position: 'relative', 
    width: size, 
    height: size, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    borderRadius: '50%',
    overflow: 'hidden',
    background: '#ffffff',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 0 15px rgba(0, 210, 255, 0.3)'
  }}>
    <img 
      src="/logo.jpg" 
      alt="Kiko Logo" 
      style={{ 
        width: '100%', 
        height: '100%', 
        objectFit: 'contain'
      }} 
    />
  </div>
);

export default function AuthPage() {
  const { login, register, resetPassword, loginWithGoogle } = useApp();
  const [mode, setMode] = useState('login'); // 'login' | 'register' | 'reset'

  // Input states
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showMockGoogleModal, setShowMockGoogleModal] = useState(false);

  const handleGoogleSignIn = async () => {
    setError('');
    setMessage('');
    try {
      await loginWithGoogle(); // Will either sync Firebase or throw MOCK_SIMULATION_REQUIRED
    } catch (err) {
      if (err.message === 'MOCK_SIMULATION_REQUIRED') {
        setShowMockGoogleModal(true);
      } else {
        setError(err.message || 'Google Sign-In failed');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (mode === 'login') {
        // Use emailOrUsername field (combined single field for login)
        await login(username, password);
      } else if (mode === 'register') {
        if (!email || !username || !password) {
          throw new Error('Email, username, and password are required.');
        }
        await register(email, username, password, displayName);
      } else if (mode === 'reset') {
        const msg = await resetPassword(email, password);
        setMessage(msg + ' You can now sign in.');
        setMode('login');
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Background Animated Orbs */}
      <div style={styles.orb1}></div>
      <div style={styles.orb2}></div>

      {/* Auth Container */}
      <div className="glass-panel" style={styles.card}>
        <div style={styles.header}>
          <KikoLogo size={90} />
          <h2 style={styles.title}>Kiko</h2>
          <p style={styles.subtitle}>Private, Real-Time Communication Platform</p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}
        {message && <div style={styles.messageBanner}>{message}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'register' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Display Name</label>
              <input
                type="text"
                className="input-field"
                placeholder="How friends see you"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}

          {/* Single combined field for login */}
          {mode === 'login' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email or Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="yourname@email.com or username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          {/* Separate Email field only for register/reset */}
          {(mode === 'register' || mode === 'reset') && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                className="input-field"
                placeholder="yourname@domain.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {/* Username only for register */}
          {mode === 'register' && (
            <div style={styles.inputGroup}>
              <label style={styles.label}>Username</label>
              <input
                type="text"
                className="input-field"
                placeholder="Unique username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>
              {mode === 'reset' ? 'New Password' : 'Password'}
            </label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === 'login' && (
            <div style={styles.forgotLinkContainer}>
              <span
                style={styles.textLink}
                onClick={() => {
                  setError('');
                  setMessage('');
                  setMode('reset');
                }}
              >
                Forgot your password?
              </span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={styles.submitBtn}
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : mode === 'register' ? 'Sign Up' : 'Update Password'}
          </button>

          {(mode === 'login' || mode === 'register') && (
            <>
              {/* Divider */}
              <div style={{ display: 'flex', alignItems: 'center', margin: '6px 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                <span style={{ padding: '0 10px' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              </div>

              {/* Google Sign In Button */}
              <button
                type="button"
                className="btn"
                style={{
                  width: '100%',
                  height: '46px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  backgroundColor: '#ffffff',
                  color: '#1a1f29',
                  border: 'none',
                  borderRadius: '23px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  boxShadow: '0 4px 15px rgba(255,255,255,0.1)',
                  transition: 'background 0.2s',
                }}
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.71-1.57 2.69-3.88 2.69-6.6z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26a5.41 5.41 0 0 1-8.09-2.85h-3v2.3A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.96 10.69a5.38 5.38 0 0 1 0-3.38v-2.3h-3a9 9 0 0 0 0 8.01l3-2.33z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A9 9 0 0 0 1 5.8l3 2.33a5.41 5.41 0 0 1 5-4.55z"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </form>

        <div style={styles.footer}>
          {mode === 'login' ? (
            <p>
              Need an account?{' '}
              <span style={styles.textLinkAccent} onClick={() => { setError(''); setMode('register'); }}>
                Register
              </span>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <span style={styles.textLinkAccent} onClick={() => { setError(''); setMode('login'); }}>
                Sign In
              </span>
            </p>
          )}
        </div>
      </div>

      {/* Mock Google Account Chooser Modal */}
      {showMockGoogleModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div className="glass-panel animate-fade-in-up" style={{
            width: '380px',
            padding: '32px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.08)',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            <svg width="36" height="36" viewBox="0 0 18 18" style={{ marginBottom: '16px' }}>
              <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.71-1.57 2.69-3.88 2.69-6.6z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26a5.41 5.41 0 0 1-8.09-2.85h-3v2.3A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.96 10.69a5.38 5.38 0 0 1 0-3.38v-2.3h-3a9 9 0 0 0 0 8.01l3-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.4A9 9 0 0 0 1 5.8l3 2.33a5.41 5.41 0 0 1 5-4.55z"/>
            </svg>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '4px', color: '#fff' }}>Choose an account</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '24px' }}>to continue to <strong style={{ color: 'var(--accent-cyan)' }}>Kiko</strong></p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[
                { email: 'aaqilezio@gmail.com', name: 'Aaqilezio', picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=aaqilezio' },
                { email: 'hafsahsajid@gmail.com', name: 'Hafsah Sajid', picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=hafsahsajid' },
                { email: 'moaaqil@gmail.com', name: 'Mo Aaqil', picture: 'https://api.dicebear.com/7.x/bottts/svg?seed=moaaqil' }
              ].map(acc => (
                <button
                  key={acc.email}
                  type="button"
                  className="btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 16px',
                    width: '100%',
                    justifyContent: 'flex-start',
                    textAlign: 'left',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    cursor: 'pointer',
                  }}
                  onClick={async () => {
                    setShowMockGoogleModal(false);
                    setLoading(true);
                    try {
                      await loginWithGoogle(acc);
                    } catch (e) {
                      setError(e.message || 'Google Auth simulation failed');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <img src={acc.picture} alt={acc.name} style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#111' }} />
                  <div>
                    <div style={{ fontWeight: '600', color: '#fff', fontSize: '0.9rem' }}>{acc.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{acc.email}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  placeholder="Or use custom Gmail address"
                  className="input-field"
                  id="customGoogleEmail"
                  style={{ flex: 1, height: '36px', fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: '0 14px', height: '36px', fontSize: '0.85rem' }}
                  onClick={async () => {
                    const emailInput = document.getElementById('customGoogleEmail')?.value;
                    if (!emailInput || !emailInput.includes('@')) {
                      alert('Please enter a valid Gmail address.');
                      return;
                    }
                    const name = emailInput.split('@')[0];
                    setShowMockGoogleModal(false);
                    setLoading(true);
                    try {
                      await loginWithGoogle({
                        email: emailInput,
                        name: name.charAt(0).toUpperCase() + name.slice(1),
                        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${name}`,
                      });
                    } catch (e) {
                      setError(e.message || 'Google Auth simulation failed');
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  Sign In
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn"
              style={{ width: '100%', borderRadius: '8px' }}
              onClick={() => setShowMockGoogleModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'hidden',
  },
  orb1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    background: 'radial-gradient(circle, var(--glow-cyan) 0%, transparent 70%)',
    top: '10%',
    left: '15%',
    filter: 'blur(40px)',
    animation: 'pulseGlow 8s infinite alternate',
    pointerEvents: 'none',
  },
  orb2: {
    position: 'absolute',
    width: '500px',
    height: '500px',
    background: 'radial-gradient(circle, var(--glow-purple) 0%, transparent 70%)',
    bottom: '10%',
    right: '15%',
    filter: 'blur(50px)',
    animation: 'pulseGlow 10s infinite alternate-reverse',
    pointerEvents: 'none',
  },
  card: {
    width: '420px',
    padding: '40px',
    zIndex: 10,
    animation: 'slideInUp 0.4s ease-out',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '28px',
  },
  title: {
    fontSize: '2.2rem',
    fontWeight: '800',
    marginTop: '10px',
    letterSpacing: '1px',
    background: 'var(--accent-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    fontSize: '0.85rem',
    color: 'var(--text-secondary)',
    textAlign: 'center',
    marginTop: '6px',
    lineHeight: '1.4',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: '600',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  forgotLinkContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: '-6px',
  },
  textLink: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'var(--transition-fast)',
  },
  textLinkAccent: {
    color: 'var(--accent-cyan)',
    cursor: 'pointer',
    fontWeight: '600',
    marginLeft: '4px',
  },
  submitBtn: {
    width: '100%',
    height: '46px',
    justifyContent: 'center',
    fontSize: '1rem',
    marginTop: '10px',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
    fontSize: '0.9rem',
    color: 'var(--text-secondary)',
  },
  errorBanner: {
    background: 'rgba(242, 63, 67, 0.15)',
    border: '1px solid var(--dnd)',
    borderRadius: '8px',
    color: '#ff6b6b',
    padding: '10px 14px',
    fontSize: '0.85rem',
    marginBottom: '18px',
    textAlign: 'center',
  },
  messageBanner: {
    background: 'rgba(35, 165, 90, 0.15)',
    border: '1px solid var(--online)',
    borderRadius: '8px',
    color: '#51cf66',
    padding: '10px 14px',
    fontSize: '0.85rem',
    marginBottom: '18px',
    textAlign: 'center',
  },
};
