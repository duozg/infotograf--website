import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './LoginPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { AppFooter } from '../../components/AppFooter';

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [username, password, login, navigate]);

  return (
    <div className={styles.page}>
      <div className={styles.layout}>
        {/* Left: marketing panel */}
        <div className={styles.marketing}>
          <div className={styles.wordmark}>
            <img src="/images/brand-i-hero.png" alt="" className={styles.wordmarkI} />
            nfotograf
          </div>
          <p className={styles.tagline}>
            We cut the noise.
          </p>
          <p className={styles.subTagline}>
            No algorithm. No reels. No shopping.<br />
            Just photos, filters, and a chronological feed.
          </p>
          <div className={styles.pills}>
            <span className={styles.pill}>Chronological</span>
            <span className={styles.pill}>No algorithm</span>
            <span className={styles.pill}>Film filters</span>
          </div>
        </div>

        {/* Right: login form */}
        <div className={styles.formSide}>
          <div className={styles.card}>
            <div className={styles.logo}>
              <img src="/images/brand-i-hero.png" alt="" className={styles.logoI} />
              nfotograf
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {error && <div className={styles.error}>{error}</div>}

              <input
                className={styles.input}
                type="text"
                placeholder="Username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                disabled={loading}
              />

              <input
                className={styles.input}
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />

              <button
                className={styles.submitBtn}
                type="submit"
                disabled={loading || !username.trim() || !password}
              >
                {loading ? 'Logging in…' : 'Log In'}
              </button>
            </form>

            <div className={styles.signupLink}>
              Don't have an account?{' '}
              <Link to="/register">Sign up</Link>
            </div>
          </div>

          <div className={styles.appLinks}>
            <span>Get the app</span>
            <a href="https://apps.apple.com/app/infotograf/id6746817898" target="_blank" rel="noopener noreferrer" className={styles.storeBtn}>
              App Store
            </a>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
