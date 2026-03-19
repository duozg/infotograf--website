import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './NotificationsPage.module.css';
import { HeaderBar } from '../../components/HeaderBar';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { AppNotification, PaginatedResponse } from '../../models';
import { timeAgo } from '../../utils/timeAgo';
import { imageUrl } from '../../utils/imageUrl';
import { useAppState } from '../../context/AppStateContext';

type NotifTab = 'you' | 'friends';

function notifText(n: AppNotification): { main: string; action: string } {
  const count = n.coalescedCount && n.coalescedCount > 1 ? n.coalescedCount : null;
  const actor = n.actorUsername || 'Someone';
  const countStr = count ? ` and ${count - 1} other${count - 1 > 1 ? 's' : ''}` : '';

  switch (n.type) {
    case 'like':
      return { main: `${actor}${countStr}`, action: ' liked your photo.' };
    case 'comment':
      return { main: `${actor}${countStr}`, action: ` commented: "${n.commentBody?.slice(0, 50) || ''}"` };
    case 'follow':
      return { main: `${actor}${countStr}`, action: ' started following you.' };
    case 'mention':
      return { main: `${actor}`, action: ` mentioned you in a comment: "${n.commentBody?.slice(0, 50) || ''}"` };
    case 'commentReply':
      return { main: `${actor}`, action: ` replied: "${n.commentBody?.slice(0, 50) || ''}"` };
    case 'commentLike':
      return { main: `${actor}${countStr}`, action: ' liked your comment.' };
    default:
      return { main: actor, action: ' interacted with you.' };
  }
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const { clearNotifications } = useAppState();
  const [tab, setTab] = useState<NotifTab>('you');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStates, setFollowingStates] = useState<Record<string, boolean>>({});

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<PaginatedResponse<AppNotification>>('/notifications');
      setNotifications(res.items || []);
      // Build initial follow states
      const states: Record<string, boolean> = {};
      (res.items || []).forEach(n => {
        if (n.actorId) states[n.actorId] = n.isFollowingActor || false;
      });
      setFollowingStates(states);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Mark read after 1.5s
    const timer = setTimeout(() => {
      api.post('/notifications/mark-all-read').catch(() => {});
      clearNotifications();
    }, 1500);
    return () => clearTimeout(timer);
  }, [fetchNotifications, clearNotifications]);

  const handleFollow = useCallback(async (actorId: string, actorUsername: string) => {
    const isFollowing = followingStates[actorId];
    setFollowingStates(prev => ({ ...prev, [actorId]: !isFollowing }));
    try {
      if (isFollowing) {
        await api.delete(`/users/${actorUsername}/follow`);
      } else {
        await api.post(`/users/${actorUsername}/follow`);
      }
    } catch {
      setFollowingStates(prev => ({ ...prev, [actorId]: isFollowing }));
    }
  }, [followingStates]);

  // Group by time period
  const groupNotifications = (items: AppNotification[]) => {
    const now = Date.now();
    const groups: { title: string; items: AppNotification[] }[] = [
      { title: 'Today', items: [] },
      { title: 'This Week', items: [] },
      { title: 'Earlier', items: [] },
    ];
    items.forEach(n => {
      const ts = new Date(n.createdAt).getTime();
      const diff = now - ts;
      if (diff < 86400000) groups[0].items.push(n);
      else if (diff < 604800000) groups[1].items.push(n);
      else groups[2].items.push(n);
    });
    return groups.filter(g => g.items.length > 0);
  };

  // Filter by tab
  const filteredNotifs = tab === 'you'
    ? notifications.filter(n => ['like', 'comment', 'mention', 'commentReply', 'commentLike', 'follow'].includes(n.type))
    : notifications.filter(n => n.type === 'follow' && n.isFollowingActor === false);

  const groups = groupNotifications(filteredNotifs);

  return (
    <div className={styles.page}>
      <HeaderBar title="Activity" />

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'you' ? styles.active : ''}`}
          onClick={() => setTab('you')}
        >
          You
        </button>
        <button
          className={`${styles.tab} ${tab === 'friends' ? styles.active : ''}`}
          onClick={() => setTab('friends')}
        >
          Friends
        </button>
      </div>

      {loading && <div className={styles.loadingState}>Loading…</div>}

      {!loading && filteredNotifs.length === 0 && (
        <div className={styles.emptyState}>No notifications yet.</div>
      )}

      {!loading && groups.map(group => (
        <div key={group.title} className={styles.section}>
          <div className={styles.sectionTitle}>{group.title}</div>
          {group.items.map(notif => {
            const { main, action } = notifText(notif);
            const thumbUrl = imageUrl(notif.postThumbnailUrl || notif.postImageUrl);

            return (
              <div
                key={notif.id}
                className={`${styles.notifItem} ${!notif.read ? styles.unread : ''}`}
                onClick={() => {
                  if (notif.postId) navigate(`/post/${notif.postId}`);
                  else if (notif.actorUsername) navigate(`/profile/${notif.actorUsername}`);
                }}
              >
                <div className={styles.avatarStack}>
                  <Avatar src={notif.actorAvatarUrl} username={notif.actorUsername} size="lg" />
                </div>

                <div className={styles.notifContent}>
                  <div className={styles.notifText}>
                    <strong>{main}</strong>{action}
                  </div>
                  <div className={styles.notifTime}>{timeAgo(notif.createdAt)}</div>
                </div>

                {/* Post thumbnail */}
                {thumbUrl && notif.postId && (
                  <img src={thumbUrl} alt="" className={styles.postThumb} />
                )}

                {/* Follow back button */}
                {notif.type === 'follow' && notif.actorId && notif.actorUsername && (
                  <button
                    className={`${styles.followBtn} ${followingStates[notif.actorId] ? styles.following : ''}`}
                    onClick={e => {
                      e.stopPropagation();
                      handleFollow(notif.actorId!, notif.actorUsername!);
                    }}
                  >
                    {followingStates[notif.actorId] ? 'Following' : 'Follow'}
                  </button>
                )}

                {!notif.read && <div className={styles.unreadDot} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
