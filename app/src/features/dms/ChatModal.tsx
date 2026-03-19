import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ChatModal.module.css';
import { Avatar } from '../../components/Avatar';
import { api } from '../../api/client';
import { Conversation, Message, PaginatedResponse } from '../../models';
import { timeAgo } from '../../utils/timeAgo';
import { imageUrl } from '../../utils/imageUrl';
import { useAuth } from '../../context/AuthContext';
import { usePolling } from '../../hooks/usePolling';

interface ChatModalProps {
  conversation: Conversation;
  onClose: () => void;
}

export function ChatModal({ conversation, onClose }: ChatModalProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  const otherMember = conversation.members.find(m => m.id !== user?.id) || conversation.members[0];

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get<PaginatedResponse<Message>>(
        `/conversations/${conversation.id}/messages`
      );
      const newMessages = res.items || [];
      setMessages(prev => {
        // Only update if there are new messages
        if (newMessages.length > 0 && newMessages[0]?.id !== lastMessageIdRef.current) {
          lastMessageIdRef.current = newMessages[0]?.id || null;
          return newMessages;
        }
        return prev;
      });
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [conversation.id]);

  useEffect(() => {
    fetchMessages();
    // Mark as read
    api.post(`/conversations/${conversation.id}/read`).catch(() => {});
  }, [fetchMessages, conversation.id]);

  usePolling(fetchMessages, 3000, true);

  // Scroll to bottom when new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;
    const body = text.trim();
    setText('');
    const replyToId = replyTo?.id;
    setReplyTo(null);
    setSending(true);

    // Optimistic message
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: conversation.id,
      senderId: user?.id,
      body,
      replyToId,
      createdAt: new Date().toISOString(),
      sendStatus: 'sending',
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const sent = await api.post<Message>(`/conversations/${conversation.id}/messages`, {
        body,
        replyToId,
      });
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, sendStatus: 'sent' } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, sendStatus: 'failed' } : m));
    } finally {
      setSending(false);
    }
  }, [text, sending, replyTo, conversation.id, user?.id]);

  const handleImageSend = useCallback(async (file: File) => {
    const tempId = `temp-img-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: conversation.id,
      senderId: user?.id,
      imageUrl: URL.createObjectURL(file),
      createdAt: new Date().toISOString(),
      sendStatus: 'sending',
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const form = new FormData();
      form.append('image', file);
      const sent = await api.upload<Message>(`/conversations/${conversation.id}/messages/image`, form);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, sendStatus: 'sent' } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, sendStatus: 'failed' } : m));
    }
  }, [conversation.id, user?.id]);

  // Group messages by date
  const groupedMessages = messages.reduce<{ date: string; msgs: Message[] }[]>((groups, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const last = groups[groups.length - 1];
    if (!last || last.date !== date) {
      groups.push({ date, msgs: [msg] });
    } else {
      last.msgs.push(msg);
    }
    return groups;
  }, []);

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <button className={styles.backBtn} onClick={onClose}>‹</button>
          <div
            className={styles.headerInfo}
            onClick={() => navigate(`/profile/${otherMember?.username}`)}
          >
            <Avatar src={otherMember?.avatarUrl} username={otherMember?.username} size="md" />
          </div>
          <div style={{ flex: 1 }}>
            <div className={styles.headerName}>{otherMember?.username}</div>
          </div>
        </div>

        {/* Messages */}
        <div className={styles.messages}>
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, padding: 20 }}>
              Loading…
            </div>
          )}
          {groupedMessages.map(group => (
            <React.Fragment key={group.date}>
              <div className={styles.dateDivider}>
                <span /><em>{group.date}</em><span />
              </div>
              {group.msgs.map(msg => {
                const isMine = msg.senderId === user?.id;
                const imgUrl = imageUrl(msg.imageUrl);

                return (
                  <div
                    key={msg.id}
                    className={`${styles.bubbleWrapper} ${isMine ? styles.mine : styles.theirs}`}
                    onDoubleClick={() => setReplyTo(msg)}
                  >
                    {!isMine && (
                      <Avatar src={otherMember?.avatarUrl} username={otherMember?.username} size="sm" />
                    )}
                    <div>
                      {msg.replyTo && (
                        <div className={styles.replyPreview}>
                          {msg.replyTo.body || 'Photo'}
                        </div>
                      )}
                      <div className={`${styles.bubble} ${isMine ? styles.mine : styles.theirs} ${msg.sendStatus === 'sending' ? styles.sending : ''} ${msg.sendStatus === 'failed' ? styles.failed : ''}`}>
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt=""
                            className={styles.bubbleImage}
                          />
                        ) : (
                          msg.body
                        )}
                      </div>
                      {msg.sendStatus === 'failed' && (
                        <div className={styles.failedLabel}>Failed to send</div>
                      )}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={styles.reactions}>
                          {msg.reactions.map((r, i) => (
                            <span key={i} className={styles.reaction}>{r.emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className={styles.bubbleTime}>{timeAgo(msg.createdAt)}</span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply bar */}
        {replyTo && (
          <div className={styles.replyingBar}>
            <span className={styles.replyingText}>
              Replying to: {replyTo.body || 'Photo'}
            </span>
            <button className={styles.cancelReply} onClick={() => setReplyTo(null)}>×</button>
          </div>
        )}

        {/* Input */}
        <div className={styles.inputBar}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleImageSend(file);
              e.target.value = '';
            }}
          />
          <button
            className={styles.imageBtn}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Send image"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>
          <textarea
            className={styles.textInput}
            placeholder="Message…"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            className={styles.sendBtn}
            onClick={handleSend}
            disabled={!text.trim() || sending}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
