import React, { useState, useEffect, useCallback } from 'react';
import styles from './FederationSettingsModal.module.css';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { FediverseIcon } from '../../components/FediverseIcon';
import { FederationStatus, DeliverySummary, DeliveryLogEntry } from '../../models';
import { timeAgo } from '../../utils/timeAgo';

type DeliveryFilter = 'all' | 'delivered' | 'pending' | 'failed';

function extractDomain(inboxUrl: string): string {
  try {
    return new URL(inboxUrl).hostname;
  } catch {
    return inboxUrl;
  }
}

function statusColor(status: DeliveryLogEntry['status']): string {
  switch (status) {
    case 'delivered': return 'var(--success-green)';
    case 'pending': return 'var(--voice-orange, #ffa032)';
    case 'failed': return 'var(--accent-red)';
  }
}

export function FederationSettingsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();

  // Federation status
  const [status, setStatus] = useState<FederationStatus | null>(null);
  const [toggling, setToggling] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // Handle copy
  const [copied, setCopied] = useState(false);

  // Delivery summary
  const [summary, setSummary] = useState<DeliverySummary | null>(null);

  // Delivery log
  const [deliveries, setDeliveries] = useState<DeliveryLogEntry[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);
  const [filter, setFilter] = useState<DeliveryFilter>('all');

  // Clear history
  const [clearing, setClearing] = useState(false);

  // ─── Fetch federation status ────────────────────────────
  useEffect(() => {
    setLoadingStatus(true);
    api.get<FederationStatus>('/federation/status')
      .then(res => setStatus(res))
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, []);

  // ─── Fetch delivery data when federation is enabled ─────
  useEffect(() => {
    if (!status?.federationEnabled) return;

    api.get<DeliverySummary>('/federation/delivery-summary')
      .then(res => setSummary(res))
      .catch(() => {});

    setLoadingDeliveries(true);
    api.get<{ deliveries: DeliveryLogEntry[]; nextCursor: string | null }>('/federation/deliveries')
      .then(res => {
        setDeliveries(res.deliveries || []);
        setNextCursor(res.nextCursor ?? null);
      })
      .catch(() => {})
      .finally(() => setLoadingDeliveries(false));
  }, [status?.federationEnabled]);

  // ─── Toggle federation ──────────────────────────────────
  const handleToggle = useCallback(async () => {
    if (!status || toggling) return;
    const prev = status.federationEnabled;
    setToggling(true);
    setStatus(s => s ? { ...s, federationEnabled: !prev } : s);
    try {
      const res = await api.post<FederationStatus>('/federation/toggle');
      setStatus(res);
    } catch {
      setStatus(s => s ? { ...s, federationEnabled: prev } : s);
    } finally {
      setToggling(false);
    }
  }, [status, toggling]);

  // ─── Copy handle ────────────────────────────────────────
  const handleCopy = useCallback(() => {
    const handle = status?.handle || (user ? `@${user.username}@infotograf.com` : '');
    if (!handle) return;
    navigator.clipboard.writeText(handle).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }, [status, user]);

  // ─── Load more deliveries ──────────────────────────────
  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingDeliveries) return;
    setLoadingDeliveries(true);
    try {
      const res = await api.get<{ deliveries: DeliveryLogEntry[]; nextCursor: string | null }>(
        `/federation/deliveries?cursor=${encodeURIComponent(nextCursor)}`
      );
      setDeliveries(prev => [...prev, ...(res.deliveries || [])]);
      setNextCursor(res.nextCursor ?? null);
    } catch {
      // silently fail
    } finally {
      setLoadingDeliveries(false);
    }
  }, [nextCursor, loadingDeliveries]);

  // ─── Clear delivery history ─────────────────────────────
  const handleClearHistory = useCallback(async () => {
    setClearing(true);
    try {
      await api.delete('/federation/deliveries');
      setDeliveries([]);
      setNextCursor(null);
      setSummary({ total: 0, delivered: 0, pending: 0, failed: 0 });
    } catch {
      // silently fail
    } finally {
      setClearing(false);
    }
  }, []);

  // ─── Filtered deliveries ───────────────────────────────
  const filteredDeliveries = filter === 'all'
    ? deliveries
    : deliveries.filter(d => d.status === filter);

  const federationEnabled = status?.federationEnabled ?? false;
  const handle = status?.handle || (user ? `@${user.username}@infotograf.com` : '');

  // ─── Summary bar percentages ────────────────────────────
  const summaryTotal = summary?.total || 0;
  const deliveredPct = summaryTotal > 0 ? (summary!.delivered / summaryTotal) * 100 : 0;
  const pendingPct = summaryTotal > 0 ? (summary!.pending / summaryTotal) * 100 : 0;
  const failedPct = summaryTotal > 0 ? (summary!.failed / summaryTotal) * 100 : 0;

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* ── Header ─────────────────────────────────────── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FediverseIcon size={20} />
            <span className={styles.title}>Federation Settings</span>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
        </div>

        <div className={styles.content}>
          {/* ── Explanation Card ──────────────────────────── */}
          <div className={styles.explanationCard}>
            <p className={styles.explanationText}>
              Share your posts to the fediverse. People on Mastodon, Pixelfed, and other platforms can find and follow you.
            </p>
          </div>

          {/* ── Toggle ───────────────────────────────────── */}
          <div className={styles.section}>
            <div className={styles.row}>
              <span className={styles.rowLabel}>Share to Fediverse</span>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={federationEnabled}
                  onChange={handleToggle}
                  disabled={toggling || loadingStatus}
                />
                <span className={styles.toggleSlider} />
              </label>
            </div>
          </div>

          {/* ── Handle Display (when enabled) ────────────── */}
          {federationEnabled && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Your Fediverse Handle</div>
              <div className={styles.handleCard}>
                <span className={styles.handleText}>{handle}</span>
                <button className={styles.copyBtn} onClick={handleCopy}>
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}

          {/* ── Delivery History (when enabled) ──────────── */}
          {federationEnabled && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Delivery History</div>

              {/* Summary bar */}
              {summary && summaryTotal > 0 && (
                <div className={styles.summaryContainer}>
                  <div className={styles.summaryBar}>
                    {deliveredPct > 0 && (
                      <div
                        className={styles.summarySegment}
                        style={{ width: `${deliveredPct}%`, background: 'var(--success-green)' }}
                      />
                    )}
                    {pendingPct > 0 && (
                      <div
                        className={styles.summarySegment}
                        style={{ width: `${pendingPct}%`, background: 'var(--voice-orange, #ffa032)' }}
                      />
                    )}
                    {failedPct > 0 && (
                      <div
                        className={styles.summarySegment}
                        style={{ width: `${failedPct}%`, background: 'var(--accent-red)' }}
                      />
                    )}
                  </div>
                  <div className={styles.summaryLabels}>
                    <span className={styles.summaryLabel}>
                      <span className={styles.summaryDot} style={{ background: 'var(--success-green)' }} />
                      {summary.delivered} delivered
                    </span>
                    <span className={styles.summaryLabel}>
                      <span className={styles.summaryDot} style={{ background: 'var(--voice-orange, #ffa032)' }} />
                      {summary.pending} pending
                    </span>
                    <span className={styles.summaryLabel}>
                      <span className={styles.summaryDot} style={{ background: 'var(--accent-red)' }} />
                      {summary.failed} failed
                    </span>
                  </div>
                </div>
              )}

              {/* Filter tabs */}
              <div className={styles.filterTabs}>
                {(['all', 'delivered', 'pending', 'failed'] as DeliveryFilter[]).map(f => (
                  <button
                    key={f}
                    className={`${styles.filterTab} ${filter === f ? styles.filterTabActive : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>

              {/* Delivery log */}
              <div className={styles.deliveryLog}>
                {filteredDeliveries.length === 0 && !loadingDeliveries && (
                  <div className={styles.emptyState}>
                    No {filter === 'all' ? '' : filter} deliveries yet.
                  </div>
                )}
                {filteredDeliveries.map(entry => (
                  <div key={entry.id} className={styles.deliveryRow}>
                    <div className={styles.deliveryInfo}>
                      <span className={styles.activityType}>{entry.activityType}</span>
                      <span className={styles.targetDomain}>{extractDomain(entry.targetInboxUrl)}</span>
                    </div>
                    <div className={styles.deliveryMeta}>
                      <span
                        className={styles.statusBadge}
                        style={{ background: statusColor(entry.status) }}
                      >
                        {entry.status}
                      </span>
                      <span className={styles.timeAgo}>{timeAgo(entry.createdAt)}</span>
                    </div>
                  </div>
                ))}
                {loadingDeliveries && (
                  <div className={styles.emptyState}>Loading...</div>
                )}
                {nextCursor && !loadingDeliveries && (
                  <button className={styles.loadMoreBtn} onClick={loadMore}>
                    Load More
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Clear History ────────────────────────────── */}
          {federationEnabled && deliveries.length > 0 && (
            <div className={styles.section}>
              <button
                className={styles.clearBtn}
                onClick={handleClearHistory}
                disabled={clearing}
              >
                {clearing ? 'Clearing...' : 'Clear History'}
              </button>
            </div>
          )}

          <div style={{ height: 40 }} />
        </div>
      </div>
    </div>
  );
}
