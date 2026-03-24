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
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = useCallback(async (actor: RemoteActorSummary) => {
    const state = followStates[actor.id];
    if (!state) return;

    if (state.following || state.pending) {
      setFollowStates(prev => ({ ...prev, [actor.id]: { following: false, pending: false } }));
      try { await api.delete(`/federation/following/${actor.id}`); } catch {
        setFollowStates(prev => ({ ...prev, [actor.id]: state }));
      }
    } else {
      setFollowStates(prev => ({ ...prev, [actor.id]: { following: false, pending: true } }));
      try { await api.post(`/federation/follow/${actor.id}`); } catch {
        setFollowStates(prev => ({ ...prev, [actor.id]: state }));
      }
    }
  }, [followStates]);

  return (
    <div style={{ padding: 16 }}>
      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>
          Loading…
        </div>
      )}

      {!loading && suggested.length === 0 && (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--t2)', fontSize: 14 }}>
          No suggested accounts yet
        </div>
      )}

      {suggested.map(actor => {
        const state = followStates[actor.id] || { following: false, pending: false };
        const btnLabel = state.following ? 'Following' : state.pending ? 'Requested' : 'Follow';
        const btnClass = state.following || state.pending ? 'btn-grey' : 'btn-follow';
        return (
          <div key={actor.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 0', borderBottom: '1px solid var(--border)',
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
            <button className={btnClass} onClick={() => handleFollow(actor)} style={{ fontSize: 11, padding: '5px 12px' }}>
              {btnLabel}
            </button>
          </div>
        );
      })}
    </div>
  );
}
