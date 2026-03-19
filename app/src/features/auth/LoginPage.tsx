import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './LoginPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { AppFooter } from '../../components/AppFooter';

// Warm-toned decorative photo mosaic — evokes a chronological photo feed
const TILE_COLORS = [
  '#3a2e2a','#2e3a38','#3a3020','#2a3430','#382822',
  '#304038','#3a2e34','#283840','#382e28','#2e3838',
  '#3a3428','#283040','#382634','#2e3c2e','#3a2e20',
  '#28303e','#362830','#2a3a34','#342820','#283436',
];

function PhotoGrid() {
  return (
    <div className={styles.photoGrid}>
      {TILE_COLORS.map((color, i) => (
        <div key={i} className={styles.photoTile} style={{ background: color }} />
      ))}
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
        {/* Left: marketing panel */}
        <div className={styles.marketing}>
          <PhotoGrid />
          <div className={styles.marketingText}>
            <div className={styles.wordmark}>Infotograf</div>
            <p className={styles.tagline}>We cut the noise.</p>
            <p className={styles.subTagline}>
              No algorithm. No reels. No shopping.<br />
              Just photos, filters, and a chronological feed.
            </p>
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
