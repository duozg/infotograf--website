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
      {/* Top bar with brand I + official fediverse logo */}
      <div className={styles.topBar}>
        <a href="/" className={styles.topBrand}>
          <img src="/images/brand-i.png" alt="Infotograf" className={styles.topBrandI} />
          <span className={styles.topPlus}>+</span>
          <svg className={styles.topFedLogo} width="36" height="36" viewBox="0 0 196.52 196.52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill="#a730b8" d="M47.9242 72.7966a18.2278 18.2278 0 0 1-7.7959 7.7597l42.7984 42.9653 10.3182-5.2291zm56.4524 56.6704-10.3182 5.2291 21.686 21.7708a18.2278 18.2278 0 0 1 7.7975-7.7608z"/>
            <path fill="#5496be" d="M129.6645 102.0765l1.7865 11.4272 27.4149-13.8942a18.2278 18.2278 0 0 1-4.9719-9.8124zm-14.0658 7.1282-57.2891 29.0339a18.2278 18.2278 0 0 1 4.9728 9.8133l54.1027-27.4194z"/>
            <path fill="#ce3d1a" d="M69.5312 91.6539l8.1618 8.1933 29.269-57.1387a18.2278 18.2278 0 0 1-9.787-5.0219zm-7.1897 14.0363-14.0022 27.3353a18.2278 18.2278 0 0 1 9.786 5.0214l12.3775-24.1639z"/>
            <path fill="#d0188f" d="M39.8906 80.6763a18.2278 18.2278 0 0 1-10.8655 1.7198l8.1762 52.2981a18.2278 18.2278 0 0 1 10.8645-1.7198z"/>
            <path fill="#5b36e9" d="M63.3259 148.3109a18.2278 18.2278 0 0 1-1.7322 10.8629l52.2893 8.3907a18.2278 18.2278 0 0 1 1.7322-10.8629z"/>
            <path fill="#30b873" d="M134.9148 146.9182a18.2278 18.2278 0 0 1 9.788 5.0224l24.1345-47.117a18.2278 18.2278 0 0 1-9.7875-5.0229z"/>
            <path fill="#ebe305" d="M126.1329 33.1603a18.2278 18.2278 0 0 1-7.7975 7.7608l37.3765 37.5207a18.2278 18.2278 0 0 1 7.7969-7.7608z"/>
            <path fill="#f47601" d="M44.7704 51.6279a18.2278 18.2278 0 0 1 4.9723 9.8123l47.2478-23.9453a18.2278 18.2278 0 0 1-4.9718-9.8113z"/>
            <path fill="#57c115" d="M118.2491 40.9645a18.2278 18.2278 0 0 1-10.8511 1.8123l4.1853 26.8 11.42 1.8324zm-4.2333 44.1927 9.8955 63.3631a18.2278 18.2278 0 0 1 10.88-1.6278l-9.355-59.9035z"/>
            <path fill="#dbb210" d="M49.7763 61.6412a18.2278 18.2278 0 0 1-1.694 10.8686l26.8206 4.3077 5.2715-10.2945zm45.9677 7.382-5.272 10.2955 63.3713 10.1777a18.2278 18.2278 0 0 1 1.7606-10.8593z"/>
            <path fill="#ffca00" d="M93.4385 23.8419a1 1 0 1 0 33.0924 1.8025 1 1 0 1 0-33.0924-1.8025"/>
            <path fill="#64ff00" d="M155.314 85.957a1 1 0 1 0 33.0923 1.8025 1 1 0 1 0-33.0923-1.8025"/>
            <path fill="#00a3ff" d="M115.3466 163.9824a1 1 0 1 0 33.0923 1.8025 1 1 0 1 0-33.0923-1.8025"/>
            <path fill="#9500ff" d="M28.7698 150.0898a1 1 0 1 0 33.0923 1.8025 1 1 0 1 0-33.0923-1.8025"/>
            <path fill="#ff0000" d="M15.2298 63.4781a1 1 0 1 0 33.0923 1.8025 1 1 0 1 0-33.0923-1.8025"/>
          </svg>
        </a>
      </div>

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
            <div className={styles.logo}>
              <img src="/images/brand-i.png" alt="" className={styles.logoI} />
              <span>nfotograf</span>
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
            <a
              href="https://apps.apple.com/app/id6761331537"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.storeBtn}
            >
              App Store
            </a>
            <a
              href="https://play.google.com/apps/testing/com.infotograf.android"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.storeBtn}
            >
              Google Play
            </a>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
