import React, { useState } from 'react';
import { api } from '../api/client';

type ReportTargetType = 'post' | 'user' | 'comment';

interface ReportModalProps {
  targetId: string;
  targetType: ReportTargetType;
  onClose: () => void;
}

const REASONS = [
  "It's spam",
  "Nudity or sexual activity",
  "Hate speech or symbols",
  "Violence or dangerous organizations",
  "Bullying or harassment",
  "Selling illegal or regulated goods",
  "Intellectual property violation",
  "Suicide or self-injury",
  "Eating disorders",
  "Scam or fraud",
  "False information",
  "I just don't like it",
];

export function ReportModal({ targetId, targetType, onClose }: ReportModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      await api.post('/moderation/reports', { targetId, targetType, reason: selected });
      setDone(true);
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: 12, width: 400, maxWidth: '92vw',
        maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px', borderBottom: '1px solid var(--divider-card)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
            Report
          </span>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-secondary)', lineHeight: 1 }}
          >×</button>
        </div>

        {done ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Thanks for your report
            </div>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 24 }}>
              We'll review it and take action if it violates our guidelines.
            </div>
            <button
              onClick={onClose}
              style={{
                padding: '8px 24px', background: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)', borderRadius: 6,
                cursor: 'pointer', fontSize: 14, color: 'var(--text-primary)',
              }}
            >Done</button>
          </div>
        ) : (
          <>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={{ padding: '12px 16px 4px', fontSize: 13, color: 'var(--text-secondary)' }}>
                Why are you reporting this {targetType}?
              </div>
              {REASONS.map(reason => (
                <div
                  key={reason}
                  onClick={() => setSelected(reason)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 16px', cursor: 'pointer',
                    background: selected === reason ? 'var(--bg-elevated)' : 'transparent',
                    borderBottom: '1px solid var(--divider-card)',
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{reason}</span>
                  {selected === reason && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-link)" strokeWidth={2.5} style={{ width: 18, height: 18, flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--divider-card)' }}>
              <button
                onClick={handleSubmit}
                disabled={!selected || sending}
                style={{
                  width: '100%', padding: '10px', borderRadius: 6,
                  background: selected ? 'var(--accent-red)' : 'var(--bg-elevated)',
                  border: 'none', cursor: selected ? 'pointer' : 'not-allowed',
                  color: selected ? '#fff' : 'var(--text-tertiary)',
                  fontSize: 14, fontWeight: 600, transition: 'background 0.15s',
                }}
              >
                {sending ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
