import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { AppFooter } from '../../components/AppFooter';

// ─── Country data ──────────────────────────────────────────

const COUNTRY_INFO: Record<string, { flag: string; name: string }> = {
  AU: { flag: '🇦🇺', name: 'Australia' }, US: { flag: '🇺🇸', name: 'United States' },
  GB: { flag: '🇬🇧', name: 'United Kingdom' }, CA: { flag: '🇨🇦', name: 'Canada' },
  NZ: { flag: '🇳🇿', name: 'New Zealand' }, VN: { flag: '🇻🇳', name: 'Vietnam' },
  AT: { flag: '🇦🇹', name: 'Austria' }, BE: { flag: '🇧🇪', name: 'Belgium' },
  BG: { flag: '🇧🇬', name: 'Bulgaria' }, HR: { flag: '🇭🇷', name: 'Croatia' },
  CY: { flag: '🇨🇾', name: 'Cyprus' }, CZ: { flag: '🇨🇿', name: 'Czech Republic' },
  DK: { flag: '🇩🇰', name: 'Denmark' }, EE: { flag: '🇪🇪', name: 'Estonia' },
  FI: { flag: '🇫🇮', name: 'Finland' }, FR: { flag: '🇫🇷', name: 'France' },
  DE: { flag: '🇩🇪', name: 'Germany' }, GR: { flag: '🇬🇷', name: 'Greece' },
  HU: { flag: '🇭🇺', name: 'Hungary' }, IE: { flag: '🇮🇪', name: 'Ireland' },
  IT: { flag: '🇮🇹', name: 'Italy' }, LV: { flag: '🇱🇻', name: 'Latvia' },
  LT: { flag: '🇱🇹', name: 'Lithuania' }, LU: { flag: '🇱🇺', name: 'Luxembourg' },
  MT: { flag: '🇲🇹', name: 'Malta' }, NL: { flag: '🇳🇱', name: 'Netherlands' },
  PL: { flag: '🇵🇱', name: 'Poland' }, PT: { flag: '🇵🇹', name: 'Portugal' },
  RO: { flag: '🇷🇴', name: 'Romania' }, SK: { flag: '🇸🇰', name: 'Slovakia' },
  SI: { flag: '🇸🇮', name: 'Slovenia' }, ES: { flag: '🇪🇸', name: 'Spain' },
  SE: { flag: '🇸🇪', name: 'Sweden' },
};

// ─── Validation ────────────────────────────────────────────

const USERNAME_RE = /^[a-zA-Z0-9._]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validateUsername(v: string) {
  if (!v) return null; // not yet touched
  return USERNAME_RE.test(v);
}
function validateEmail(v: string) {
  if (!v) return null;
  return EMAIL_RE.test(v);
}
function validatePassword(v: string) {
  if (!v) return null;
  return v.length >= 8;
}

// ─── Location status ──────────────────────────────────────

type LocationStatus =
  | { state: 'checking' }
  | { state: 'allowed'; country: string | null }
  | { state: 'vpn'; message: string }
  | { state: 'blocked'; message: string }
  | { state: 'error'; message: string };

// ─── Component ─────────────────────────────────────────────

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Form
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Track if fields have been interacted with
  const [touchedUsername, setTouchedUsername] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  // Location / pre-register check
  const [locationStatus, setLocationStatus] = useState<LocationStatus>({ state: 'checking' });
  const preCheckRan = useRef(false);

  // Run pre-register check on mount
  useEffect(() => {
    if (preCheckRan.current) return;
    preCheckRan.current = true;
    runPreCheck();
  }, []);

  async function runPreCheck() {
    setLocationStatus({ state: 'checking' });
    try {
      const deviceMetadata = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        locale: navigator.language,
        keyboardLanguage: navigator.languages?.[0] || navigator.language,
      };
      const result = await api.post<{ allowed: boolean; country: string | null }>('/auth/pre-register', { deviceMetadata });
      setLocationStatus({ state: 'allowed', country: result.country });
    } catch (err: any) {
      const msg = err?.message || 'Connection failed';
      if (msg.toLowerCase().includes('vpn') || msg.toLowerCase().includes('proxy')) {
        setLocationStatus({ state: 'vpn', message: msg });
      } else if (msg.toLowerCase().includes('region') || msg.toLowerCase().includes('available')) {
        setLocationStatus({ state: 'blocked', message: msg });
      } else {
        setLocationStatus({ state: 'error', message: msg });
      }
    }
  }

  // Validation states
  const usernameValid = touchedUsername ? validateUsername(username) : null;
  const emailValid = touchedEmail ? validateEmail(email) : null;
  const passwordValid = touchedPassword ? validatePassword(password) : null;

  const formValid = USERNAME_RE.test(username) && EMAIL_RE.test(email) && password.length >= 8;
  const locationAllowed = locationStatus.state === 'allowed';
  const canSubmit = formValid && locationAllowed && !loading;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedUsername(true);
    setTouchedEmail(true);
    setTouchedPassword(true);
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [canSubmit, username, email, password, register, navigate]);

  const countryInfo = locationStatus.state === 'allowed' && locationStatus.country
    ? COUNTRY_INFO[locationStatus.country] : null;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>Infotograf</div>
        <p className={styles.subtitle}>Sign up to see photos from your friends.</p>

        {/* ─── Location status banner ──────────────── */}
        <div className={`${styles.statusBanner} ${styles[`status_${locationStatus.state}`]}`}>
          {locationStatus.state === 'checking' && (
            <>
              <span className={styles.statusSpinner} />
              <span>Checking your location...</span>
            </>
          )}
          {locationStatus.state === 'allowed' && (
            <>
              <span className={styles.statusFlag}>{countryInfo?.flag || '🌍'}</span>
              <span>{countryInfo?.name || 'Location verified'}</span>
              <span className={styles.statusCheck}>✓</span>
            </>
          )}
          {locationStatus.state === 'vpn' && (
            <>
              <span className={styles.statusWarn}>⚠</span>
              <span>VPN detected — please disable to continue</span>
            </>
          )}
          {locationStatus.state === 'blocked' && (
            <>
              <span className={styles.statusBlock}>⊘</span>
              <span>{locationStatus.message}</span>
            </>
          )}
          {locationStatus.state === 'error' && (
            <>
              <span className={styles.statusWarn}>⚠</span>
              <span>{locationStatus.message}</span>
              <button className={styles.retryBtn} onClick={runPreCheck}>Retry</button>
            </>
          )}
        </div>

        {/* ─── Form ────────────────────────────────── */}
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          {error && <div className={styles.error}>{error}</div>}

          {/* Username */}
          <div className={styles.fieldWrap}>
            <input
              className={`${styles.input} ${usernameValid === true ? styles.inputValid : ''} ${usernameValid === false ? styles.inputInvalid : ''}`}
              type="text"
              placeholder="Username"
              value={username}
              onChange={e => { setUsername(e.target.value); setTouchedUsername(true); }}
              onBlur={() => setTouchedUsername(true)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={loading || !locationAllowed}
            />
            {usernameValid !== null && (
              <span className={`${styles.fieldIcon} ${usernameValid ? styles.fieldIconPass : styles.fieldIconFail}`}>
                {usernameValid ? '✓' : '✗'}
              </span>
            )}
          </div>
          {usernameValid === false && (
            <div className={styles.fieldHint}>3+ characters, letters/numbers/underscores/dots only</div>
          )}

          {/* Email */}
          <div className={styles.fieldWrap}>
            <input
              className={`${styles.input} ${emailValid === true ? styles.inputValid : ''} ${emailValid === false ? styles.inputInvalid : ''}`}
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => { setEmail(e.target.value); setTouchedEmail(true); }}
              onBlur={() => setTouchedEmail(true)}
              disabled={loading || !locationAllowed}
            />
            {emailValid !== null && (
              <span className={`${styles.fieldIcon} ${emailValid ? styles.fieldIconPass : styles.fieldIconFail}`}>
                {emailValid ? '✓' : '✗'}
              </span>
            )}
          </div>
          {emailValid === false && (
            <div className={styles.fieldHint}>Enter a valid email address</div>
          )}

          {/* Password */}
          <div className={styles.fieldWrap}>
            <input
              className={`${styles.input} ${passwordValid === true ? styles.inputValid : ''} ${passwordValid === false ? styles.inputInvalid : ''}`}
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => { setPassword(e.target.value); setTouchedPassword(true); }}
              onBlur={() => setTouchedPassword(true)}
              disabled={loading || !locationAllowed}
            />
            {passwordValid !== null && (
              <span className={`${styles.fieldIcon} ${passwordValid ? styles.fieldIconPass : styles.fieldIconFail}`}>
                {passwordValid ? '✓' : '✗'}
              </span>
            )}
          </div>
          {passwordValid === false && (
            <div className={styles.fieldHint}>Password must be at least 8 characters</div>
          )}

          <p className={styles.terms}>
            By signing up, you agree to our{' '}
            <a href="https://infotograf.com/terms" target="_blank" rel="noopener noreferrer">Terms</a> and{' '}
            <a href="https://infotograf.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </p>

          <button
            className={styles.submitBtn}
            type="submit"
            disabled={!canSubmit}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login">Log in</Link>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
