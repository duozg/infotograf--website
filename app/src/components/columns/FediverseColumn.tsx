import React, { useEffect, useState, useCallback, RefObject } from 'react';
import { api } from '../../api/client';
import { Avatar } from '../Avatar';
import { RemoteActorSummary } from '../../models';

interface FediverseColumnProps {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export function FediverseColumn({ scrollContainerRef: _scrollContainerRef }: FediverseColumnProps) {
  const [suggested, setSuggested] = useState<RemoteActorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [followStates, setFollowStates] = useState<Record<string, { following: boolean; pending: boolean }>>({});

  useEffect(() => {
    setLoading(true);
    api
      .get<RemoteActorSummary[]>('/federation/suggested')
      .then((data) => {
        const items = Array.isArray(data) ? data : [];
        setSuggested(items);
        const states: Record<string, { following: boolean; pending: boolean }> = {};
        items.forEach((a) => {
          states[a.id] = { following: a.isFollowing ?? false, pending: a.followPending ?? false };
        });
        setFollowStates(states);
      })
      .catch(() => setError('Failed to load suggestions'))
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = useCallback(async (actor: RemoteActorSummary) => {
    setFollowStates(prev => {
      const state = prev[actor.id];
      if (!state) return prev;

      if (state.following || state.pending) {
        // Unfollow optimistically
        const next = { ...prev, [actor.id]: { following: false, pending: false } };
        api.delete(`/federation/following/${actor.id}`).catch(() => {
          setFollowStates(p => ({ ...p, [actor.id]: state }));
        });
        return next;
      } else {
        // Follow optimistically
        const next = { ...prev, [actor.id]: { following: false, pending: true } };
        api.post(`/federation/follow/${actor.id}`).catch(() => {
          setFollowStates(p => ({ ...p, [actor.id]: state }));
        });
        return next;
      }
    });
  }, []);

  return (
    <div style={{ padding: 0 }}>
      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>Loading…</div>
      )}

      {!loading && error && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>{error}</div>
      )}

      {!loading && !error && suggested.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>
          No suggested accounts yet
        </div>
      )}

      {suggested.map(actor => {
        const state = followStates[actor.id] || { following: false, pending: false };
        const isActive = state.following || state.pending;
        const btnLabel = state.following ? 'Following' : state.pending ? 'Requested' : 'Follow';

        return (
          <div key={actor.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderBottom: '1px solid var(--border)',
          }}>
            <Avatar src={actor.avatarUrl} username={actor.username} size="md" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>
                {actor.displayName || actor.username}
              </div>
              <div style={{ fontSize: 12, color: 'var(--purple)' }}>
                @{actor.username}@{actor.domain}
              </div>
            </div>
            <button
              onClick={() => handleFollow(actor)}
              style={{
                padding: '5px 14px',
                fontSize: 11,
                fontWeight: 700,
                borderRadius: 3,
                cursor: 'pointer',
                border: isActive ? '1px solid var(--border)' : '1px solid var(--cta-bdr)',
                background: isActive
                  ? 'linear-gradient(to bottom, #f5f5f5, #e5e5e5)'
                  : 'linear-gradient(to bottom, var(--cta-top), var(--cta-bot))',
                color: isActive ? 'var(--t1)' : '#fff',
              }}
            >
              {btnLabel}
            </button>
          </div>
        );
      })}
    </div>
  );
}
