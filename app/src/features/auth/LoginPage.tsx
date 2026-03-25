import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './LoginPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { AppFooter } from '../../components/AppFooter';

function PhoneShowcase() {
  return (
    <div className={styles.showcase}>
      {/* Back phone — tilted left */}
      <div className={`${styles.phone} ${styles.phoneBack} ${styles.phoneLeft}`}>
        <img src="/images/about-fedi-feed.png" alt="Fediverse feed with posts from Mastodon and local users" />
      </div>
      {/* Back phone — tilted right */}
      <div className={`${styles.phone} ${styles.phoneBack} ${styles.phoneRight}`}>
        <img src="/images/about-dm.png" alt="Direct messaging with emoji reactions" />
      </div>
      {/* Front phone — center */}
      <div className={`${styles.phone} ${styles.phoneFront}`}>
        <img src="/images/about-feed.png" alt="Chronological photo feed" />
      </div>
    </div>
  );
}

function FeaturePills() {
  return (
    <div className={styles.pills}>
      <span className={styles.pill}>Chronological Feed</span>
      <span className={styles.pill}>Classic Filters</span>
      <span className={styles.pill}>Fediverse</span>
      <span className={styles.pill}>No Ads</span>
      <span className={styles.pill}>No Algorithm</span>
    </div>
  );
}

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
        {/* Left: phone showcase */}
        <div className={styles.marketing}>
          <PhoneShowcase />
          <div className={styles.marketingText}>
            <div className={styles.wordmark}>Infotograf</div>
            <p className={styles.tagline}>See photos from your friends.</p>
            <p className={styles.subTagline}>
              No algorithm. No reels. No shopping.<br />
              Just photos, filters, and a chronological feed.
            </p>
            <FeaturePills />
          </div>
        </div>

        {/* Right: login form */}
        <div className={styles.formSide}>
          <div className={styles.card}>
            <div className={styles.logo}>Infotograf</div>

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
            <a
              href="https://apps.apple.com/app/infotograf/id6746817898"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.storeBtn}
            >
              App Store
            </a>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
