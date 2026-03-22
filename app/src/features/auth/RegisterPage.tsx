import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './RegisterPage.module.css';
import { useAuth } from '../../context/AuthContext';
import { AppFooter } from '../../components/AppFooter';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password) return;
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
  }, [username, email, password, register, navigate]);

  const isValid = username.trim().length >= 2 && email.trim().includes('@') && password.length >= 6;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>Infotograf</div>
        <p className={styles.subtitle}>Photos, filters, and a chronological feed.</p>

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
            type="email"
            placeholder="Email address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={loading}
          />

          <input
            className={styles.input}
            type="password"
            placeholder="Password (min 6 characters)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            disabled={loading}
          />

          <p className={styles.terms}>
            By signing up, you agree to our{' '}
            <a href="https://infotograf.com/terms" target="_blank" rel="noopener noreferrer">Terms</a> and{' '}
            <a href="https://infotograf.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
          </p>

          <button
            className={styles.submitBtn}
            type="submit"
            disabled={loading || !isValid}
          >
            {loading ? 'Creating account…' : 'Sign Up'}
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
