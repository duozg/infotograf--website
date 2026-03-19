import React from 'react';
import styles from './AppFooter.module.css';

export function AppFooter() {
  return (
    <footer className={styles.footer}>
      <nav className={styles.links}>
        <a href="/about" className={styles.link}>About</a>
        <span className={styles.dot}>·</span>
        <a href="/privacy" className={styles.link}>Privacy</a>
        <span className={styles.dot}>·</span>
        <a href="/terms" className={styles.link}>Terms</a>
        <span className={styles.dot}>·</span>
        <a href="/support" className={styles.link}>Support</a>
        <span className={styles.dot}>·</span>
        <a href="/guidelines" className={styles.link}>Guidelines</a>
      </nav>
      <p className={styles.copy}>© {new Date().getFullYear()} Infotograf</p>
    </footer>
  );
}
