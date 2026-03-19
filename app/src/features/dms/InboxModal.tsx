import React, { useState, useEffect, useCallback } from 'react';
import styles from './InboxModal.module.css';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { Conversation } from '../../models';
import { timeAgo } from '../../utils/timeAgo';
import { useAuth } from '../../context/AuthContext';
import { usePolling } from '../../hooks/usePolling';

interface InboxModalProps {
  onClose: () => void;
  onOpenChat: (conversation: Conversation) => void;
}

export function InboxModal({ onClose, onOpenChat }: InboxModalProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<{ conversations: Conversation[] }>('/conversations');
      setConversations(res.conversations || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  usePolling(fetchConversations, 5000, true);

  const getOtherMember = (conv: Conversation) => {
    if (!user) return conv.members[0];
    return conv.members.find(m => m.id !== user.id) || conv.members[0];
  };

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
          <span className={styles.title}>Messages</span>
          <div style={{ width: 30 }} />
        </div>

        <div className={styles.list}>
          {loading && <div className={styles.loadingState}>Loading…</div>}
          {!loading && conversations.length === 0 && (
            <div className={styles.emptyState}>No messages yet.</div>
          )}
          {conversations.map(conv => {
            const other = getOtherMember(conv);
            const unread = conv.unreadCount || 0;
            const preview = conv.lastMessage
              ? (conv.lastMessage.body || (conv.lastMessage.imageUrl ? 'Photo' : conv.lastMessage.audioUrl ? 'Voice message' : ''))
              : '';

            return (
              <div
                key={conv.id}
                className={`${styles.convItem} ${unread > 0 ? styles.unread : ''}`}
                onClick={() => onOpenChat(conv)}
              >
                <Avatar src={other?.avatarUrl} username={other?.username} size="lg" />
                <div className={styles.convInfo}>
                  <div className={styles.convName}>{other?.username || 'Unknown'}</div>
                  {preview && <div className={styles.convPreview}>{preview}</div>}
                </div>
                <div className={styles.convMeta}>
                  {conv.lastMessage && (
                    <span className={styles.convTime}>{timeAgo(conv.lastMessage.createdAt)}</span>
                  )}
                  {unread > 0 && (
                    <span className={styles.unreadBadge}>{unread > 9 ? '9+' : unread}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
