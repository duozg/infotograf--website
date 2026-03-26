import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';
import { AppFooter } from '../../components/AppFooter';

// ─── Allowed countries with dialing codes ──────────────────

const COUNTRIES = [
  { code: 'AU', flag: '🇦🇺', name: 'Australia', dial: '+61' },
  { code: 'US', flag: '🇺🇸', name: 'United States', dial: '+1' },
  { code: 'GB', flag: '🇬🇧', name: 'United Kingdom', dial: '+44' },
  { code: 'CA', flag: '🇨🇦', name: 'Canada', dial: '+1' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand', dial: '+64' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam', dial: '+84' },
  { code: 'AT', flag: '🇦🇹', name: 'Austria', dial: '+43' },
  { code: 'BE', flag: '🇧🇪', name: 'Belgium', dial: '+32' },
  { code: 'BG', flag: '🇧🇬', name: 'Bulgaria', dial: '+359' },
  { code: 'HR', flag: '🇭🇷', name: 'Croatia', dial: '+385' },
  { code: 'CY', flag: '🇨🇾', name: 'Cyprus', dial: '+357' },
  { code: 'CZ', flag: '🇨🇿', name: 'Czech Republic', dial: '+420' },
  { code: 'DK', flag: '🇩🇰', name: 'Denmark', dial: '+45' },
  { code: 'EE', flag: '🇪🇪', name: 'Estonia', dial: '+372' },
  { code: 'FI', flag: '🇫🇮', name: 'Finland', dial: '+358' },
  { code: 'FR', flag: '🇫🇷', name: 'France', dial: '+33' },
  { code: 'DE', flag: '🇩🇪', name: 'Germany', dial: '+49' },
  { code: 'GR', flag: '🇬🇷', name: 'Greece', dial: '+30' },
  { code: 'HU', flag: '🇭🇺', name: 'Hungary', dial: '+36' },
  { code: 'IE', flag: '🇮🇪', name: 'Ireland', dial: '+353' },
  { code: 'IT', flag: '🇮🇹', name: 'Italy', dial: '+39' },
  { code: 'LV', flag: '🇱🇻', name: 'Latvia', dial: '+371' },
  { code: 'LT', flag: '🇱🇹', name: 'Lithuania', dial: '+370' },
  { code: 'LU', flag: '🇱🇺', name: 'Luxembourg', dial: '+352' },
  { code: 'MT', flag: '🇲🇹', name: 'Malta', dial: '+356' },
  { code: 'NL', flag: '🇳🇱', name: 'Netherlands', dial: '+31' },
  { code: 'PL', flag: '🇵🇱', name: 'Poland', dial: '+48' },
  { code: 'PT', flag: '🇵🇹', name: 'Portugal', dial: '+351' },
  { code: 'RO', flag: '🇷🇴', name: 'Romania', dial: '+40' },
  { code: 'SK', flag: '🇸🇰', name: 'Slovakia', dial: '+421' },
  { code: 'SI', flag: '🇸🇮', name: 'Slovenia', dial: '+386' },
  { code: 'ES', flag: '🇪🇸', name: 'Spain', dial: '+34' },
  { code: 'SE', flag: '🇸🇪', name: 'Sweden', dial: '+46' },
];

// ─── Validation ────────────────────────────────────────────

const USERNAME_RE = /^[a-zA-Z0-9._]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// ─── Steps ─────────────────────────────────────────────────

type Step = 'form' | 'phone' | 'code';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();

  // Step
  const [step, setStep] = useState<Step>('form');

  // Form fields
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touchedU, setTouchedU] = useState(false);
  const [touchedE, setTouchedE] = useState(false);
  const [touchedP, setTouchedP] = useState(false);

  // Phone
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneToken, setPhoneToken] = useState('');

  // Code
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const countdownRef = useRef<ReturnType<typeof setInterval>>();

  // Availability checks
  const [usernameTaken, setUsernameTaken] = useState<boolean | null>(null);
  const [emailTaken, setEmailTaken] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const usernameTimer = useRef<ReturnType<typeof setTimeout>>();
  const emailTimer = useRef<ReturnType<typeof setTimeout>>();

  // General
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Debounced username availability check
  useEffect(() => {
    if (!USERNAME_RE.test(username)) { setUsernameTaken(null); return; }
    setCheckingUsername(true);
    clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await api.get<{ available: boolean }>(`/users/check-username/${username.trim()}`);
        setUsernameTaken(!res.available);
      } catch { setUsernameTaken(null); }
      setCheckingUsername(false);
    }, 500);
    return () => clearTimeout(usernameTimer.current);
  }, [username]);

  // Debounced email availability check
  useEffect(() => {
    if (!EMAIL_RE.test(email)) { setEmailTaken(null); return; }
    setCheckingEmail(true);
    clearTimeout(emailTimer.current);
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await api.get<{ available: boolean }>(`/users/check-email/${email.trim()}`);
        setEmailTaken(!res.available);
      } catch { setEmailTaken(null); }
      setCheckingEmail(false);
    }, 500);
    return () => clearTimeout(emailTimer.current);
  }, [email]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) { clearInterval(countdownRef.current); return 0; }
          return c - 1;
        });
      }, 1000);
      return () => clearInterval(countdownRef.current);
    }
  }, [countdown]);

  // Validation: format check + availability check
  const uFormatOk = USERNAME_RE.test(username);
  const eFormatOk = EMAIL_RE.test(email);
  const pValid = touchedP ? password.length >= 8 : null;

  // Combined: format valid AND not taken
  const uValid = touchedU ? (uFormatOk ? (usernameTaken === false ? true : usernameTaken === true ? false : null) : false) : null;
  const eValid = touchedE ? (eFormatOk ? (emailTaken === false ? true : emailTaken === true ? false : null) : false) : null;

  const formValid = uFormatOk && usernameTaken === false && eFormatOk && emailTaken === false && password.length >= 8;

  const fullPhone = selectedCountry.dial + phoneNumber.replace(/^0+/, '');

  // ─── Step 1: Form → Phone ───────────────────────────

  const handleFormNext = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setTouchedU(true); setTouchedE(true); setTouchedP(true);
    if (!formValid) return;
    setError('');
    setStep('phone');
  }, [formValid]);

  // ─── Step 2: Send SMS ───────────────────────────────

  const handleSendCode = useCallback(async () => {
    if (!phoneNumber.trim()) { setError('Please enter your phone number.'); return; }
    setError('');
    setLoading(true);
    try {
      const result = await api.post<{ phoneToken: string }>('/auth/send-phone-code', { phone: fullPhone });
      setPhoneToken(result.phoneToken);
      setStep('code');
      setCountdown(30);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to send code.');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber, fullPhone]);

  // ─── Step 3: Verify code + Register ─────────────────

  const handleVerifyAndRegister = useCallback(async () => {
    if (code.length !== 6) { setError('Please enter the 6-digit code.'); return; }
    setError('');
    setLoading(true);
    try {
      // Verify code
      await api.post('/auth/verify-phone-code', { phone: fullPhone, code, phoneToken });
      // Register
      await register({ username: username.trim(), email: email.trim(), password, phone: fullPhone, phoneToken });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Verification failed.');
    } finally {
      setLoading(false);
    }
  }, [code, fullPhone, phoneToken, username, email, password, register, navigate]);

  // ─── Resend ─────────────────────────────────────────

  const handleResend = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const result = await api.post<{ phoneToken: string }>('/auth/send-phone-code', { phone: fullPhone });
      setPhoneToken(result.phoneToken);
      setCountdown(30);
      setCode('');
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to resend.');
    } finally {
      setLoading(false);
    }
  }, [fullPhone]);

  // ─── Render ─────────────────────────────────────────

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>Infotograf</div>
        <p className={styles.subtitle}>Sign up to see photos from your friends.</p>

        {error && <div className={styles.error}>{error}</div>}

        {/* ─── Step 1: Form fields ──────────────── */}
        {step === 'form' && (
          <form className={styles.form} onSubmit={handleFormNext} noValidate>
            <div className={styles.fieldWrap}>
              <input className={`${styles.input} ${uValid === true ? styles.inputValid : ''} ${uValid === false ? styles.inputInvalid : ''}`}
                type="text" placeholder="Username" value={username}
                onChange={e => { setUsername(e.target.value); setTouchedU(true); }}
                onBlur={() => setTouchedU(true)}
                autoCapitalize="none" autoCorrect="off" spellCheck={false} disabled={loading} />
              {checkingUsername && <span className={styles.fieldSpinner} />}
              {!checkingUsername && uValid !== null && <span className={`${styles.fieldIcon} ${uValid ? styles.pass : styles.fail}`}>{uValid ? '✓' : '✗'}</span>}
            </div>
            {touchedU && !uFormatOk && username.length > 0 && <div className={styles.hint}>3+ characters, letters/numbers/underscores/dots only</div>}
            {usernameTaken === true && <div className={styles.hint}>Username is already taken</div>}

            <div className={styles.fieldWrap}>
              <input className={`${styles.input} ${eValid === true ? styles.inputValid : ''} ${eValid === false ? styles.inputInvalid : ''}`}
                type="email" placeholder="Email" value={email}
                onChange={e => { setEmail(e.target.value); setTouchedE(true); }}
                onBlur={() => setTouchedE(true)} disabled={loading} />
              {checkingEmail && <span className={styles.fieldSpinner} />}
              {!checkingEmail && eValid !== null && <span className={`${styles.fieldIcon} ${eValid ? styles.pass : styles.fail}`}>{eValid ? '✓' : '✗'}</span>}
            </div>
            {touchedE && !eFormatOk && email.length > 0 && <div className={styles.hint}>Enter a valid email address</div>}
            {emailTaken === true && <div className={styles.hint}>Email is already registered</div>}

            <div className={styles.fieldWrap}>
              <input className={`${styles.input} ${pValid === true ? styles.inputValid : ''} ${pValid === false ? styles.inputInvalid : ''}`}
                type="password" placeholder="Password" value={password}
                onChange={e => { setPassword(e.target.value); setTouchedP(true); }}
                onBlur={() => setTouchedP(true)} disabled={loading} />
              {pValid !== null && <span className={`${styles.fieldIcon} ${pValid ? styles.pass : styles.fail}`}>{pValid ? '✓' : '✗'}</span>}
            </div>
            {pValid === false && <div className={styles.hint}>Password must be at least 8 characters</div>}

            <button className={styles.submitBtn} type="submit" disabled={!formValid}>Next</button>
          </form>
        )}

        {/* ─── Step 2: Phone number ─────────────── */}
        {step === 'phone' && (
          <div className={styles.form}>
            <div className={styles.sectionTitle}>Phone Verification</div>
            <p className={styles.sectionHint}>We'll send a code to verify your number. Only numbers from supported countries are accepted.</p>

            <div className={styles.phoneRow}>
              <select className={styles.countrySelect} value={selectedCountry.code}
                onChange={e => setSelectedCountry(COUNTRIES.find(c => c.code === e.target.value) || COUNTRIES[0])}
                disabled={loading}>
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.dial}</option>
                ))}
              </select>
              <input className={styles.input} type="tel" placeholder="Phone number"
                value={phoneNumber} onChange={e => setPhoneNumber(e.target.value.replace(/[^\d]/g, ''))}
                disabled={loading} />
            </div>
            <p className={styles.sectionHint}>e.g. {selectedCountry.dial} followed by your number</p>

            <button className={styles.submitBtn} onClick={handleSendCode}
              disabled={loading || !phoneNumber.trim()}>
              {loading ? 'Sending...' : 'Send Code'}
            </button>
            <button className={styles.linkBtn} onClick={() => { setStep('form'); setError(''); }}>Back</button>
          </div>
        )}

        {/* ─── Step 3: SMS code ─────────────────── */}
        {step === 'code' && (
          <div className={styles.form}>
            <div className={styles.sectionTitle}>Enter verification code</div>
            <p className={styles.sectionHint}>Enter the 6-digit code sent to {fullPhone}</p>

            <input className={styles.codeInput} type="text" inputMode="numeric" maxLength={6}
              placeholder="000000" value={code}
              onChange={e => setCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
              autoFocus disabled={loading} />

            <button className={styles.submitBtn} onClick={handleVerifyAndRegister}
              disabled={loading || code.length !== 6}>
              {loading ? 'Verifying...' : 'Create Account'}
            </button>

            <div className={styles.resendRow}>
              {countdown > 0 ? (
                <span className={styles.resendWait}>Resend in {countdown}s</span>
              ) : (
                <button className={styles.linkBtn} onClick={handleResend} disabled={loading}>Resend Code</button>
              )}
              <button className={styles.linkBtn} onClick={() => { setStep('phone'); setCode(''); setError(''); }}>Change Number</button>
            </div>
          </div>
        )}

        <p className={styles.terms}>
          By signing up, you agree to our{' '}
          <a href="https://infotograf.com/terms" target="_blank" rel="noopener noreferrer">Terms</a> and{' '}
          <a href="https://infotograf.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>

        <div className={styles.footer}>
          Already have an account?{' '}
          <Link to="/login">Log in</Link>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
