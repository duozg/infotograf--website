import React, { useState, useEffect, useCallback } from 'react';
import styles from './RemoteActorModal.module.css';
import { api } from '../../api/client';
import { Avatar } from '../../components/Avatar';
import { FediverseIcon } from '../../components/FediverseIcon';
import { RemoteActorProfile } from '../../models';

interface RemoteActorModalProps {
  remoteActorId: string;
  onClose: () => void;
}

export function RemoteActorModal({ remoteActorId, onClose }: RemoteActorModalProps) {
  const [actor, setActor] = useState<RemoteActorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    api.get<RemoteActorProfile>(`/users/remote/${remoteActorId}`)
      .then(data => {
        if (!cancelled) setActor(data);
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [remoteActorId]);

  const handleFollow = useCallback(async () => {
    if (!actor || followLoading) return;
    setFollowLoading(true);

    try {
      if (actor.isFollowing || actor.followPending) {
        await api.delete(`/follows/remote/${remoteActorId}`);
        setActor(prev => prev ? { ...prev, isFollowing: false, followPending: false } : prev);
      } else {
        await api.post(`/follows/remote/${remoteActorId}`);
        setActor(prev => prev ? { ...prev, followPending: true } : prev);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setFollowLoading(false);
    }
  }, [actor, followLoading, remoteActorId]);

  const bioText = actor?.summary?.replace(/<[^>]+>/g, '') || '';

  const followLabel = actor?.followPending
    ? 'Pending\u2026'
    : actor?.isFollowing
      ? 'Following'
      : 'Follow';

  const followClass = actor?.followPending
    ? styles.pending
    : actor?.isFollowing
      ? styles.following
      : '';

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>

        {loading && (
          <div className={styles.loadingState}>Loading…</div>
        )}

        {error && !loading && (
          <div className={styles.errorState}>{error}</div>
        )}

        {actor && !loading && (
          <div className={styles.content}>
            <div className={styles.avatarSection}>
              <Avatar
                src={actor.avatarUrl}
                username={actor.username}
                size="xl"
                isRemote
              />
            </div>

            <div className={styles.displayName}>
              {actor.displayName || actor.username}
            </div>

            <div className={styles.handle}>
              @{actor.username}@{actor.domain}
            </div>

            <div className={styles.instanceBadge}>
              <FediverseIcon size={14} />
              <span className={styles.instanceDomain}>{actor.domain}</span>
            </div>

            {bioText && (
              <div className={styles.bio}>{bioText}</div>
            )}

            <button
              className={`${styles.followBtn} ${followClass}`}
              onClick={handleFollow}
              disabled={followLoading || actor.followPending}
            >
              {followLoading ? 'Loading\u2026' : followLabel}
            </button>

            <a
              className={styles.viewOnInstance}
              href={actor.actorUri}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on instance
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
