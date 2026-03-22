import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ChatWidget.module.css';
import { Avatar } from './Avatar';
import { api, parsePaginated } from '../api/client';
import { Message } from '../models';
import { timeAgo } from '../utils/timeAgo';
import { useAuth } from '../context/AuthContext';

interface ChatWidgetProps {
  conversationId: string;
  otherUser: { username: string; avatarUrl?: string };
  onClose: () => void;
}

export function ChatWidget({ conversationId, otherUser, onClose }: ChatWidgetProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch messages
  const fetchMessages = useCallback(async () => {
    try {
      const raw = await api.get<unknown>(`/conversations/${conversationId}/messages`);
      const newMessages = parsePaginated<Message>(raw).items;
      setMessages(prev => {
        const lastId = newMessages[newMessages.length - 1]?.id;
        if (newMessages.length > 0 && lastId !== lastMessageIdRef.current) {
          lastMessageIdRef.current = lastId || null;
          return newMessages;
        }
        return prev;
      });
    } catch {
      // ignore
    }
  }, [conversationId]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    lastMessageIdRef.current = null;
    fetchMessages().finally(() => setLoading(false));
    // Mark read
    api.post(`/conversations/${conversationId}/read`).catch(() => {});
  }, [conversationId, fetchMessages]);

  // Poll every 1.5s
  useEffect(() => {
    pollRef.current = setInterval(() => {
      fetchMessages();
    }, 1500);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!text.trim() || sending) return;
    const body = text.trim();
    setText('');
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId,
      senderId: user?.id,
      body,
      createdAt: new Date().toISOString(),
      sendStatus: 'sending',
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const sent = await api.post<Message>(`/conversations/${conversationId}/messages`, { body });
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, sendStatus: 'sent' } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, sendStatus: 'failed' } : m));
    } finally {
      setSending(false);
    }
  }, [conversationId, text, sending, user?.id]);

  const handleRetry = useCallback(async (failedMsg: Message) => {
    if (!failedMsg.body) return;
    setMessages(prev => prev.map(m => m.id === failedMsg.id ? { ...m, sendStatus: 'sending' } : m));
    try {
      const sent = await api.post<Message>(`/conversations/${conversationId}/messages`, { body: failedMsg.body });
      setMessages(prev => prev.filter(m => m.id !== failedMsg.id).concat({ ...sent, sendStatus: 'sent' }));
    } catch {
      setMessages(prev => prev.map(m => m.id === failedMsg.id ? { ...m, sendStatus: 'failed' } : m));
    }
  }, [conversationId]);

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
    <div className={styles.widget}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={onClose} aria-label="Close chat">
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div
          className={styles.headerInfo}
          onClick={() => navigate(`/profile/${otherUser.username}`)}
        >
          <Avatar src={otherUser.avatarUrl} username={otherUser.username} size="sm" />
          <span className={styles.headerUsername}>{otherUser.username}</span>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.expandBtn}
            onClick={() => navigate('/messages')}
            aria-label="Open full messages"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {loading && <div className={styles.stateMsg}>Loading…</div>}
        {!loading && messages.length === 0 && (
          <div className={styles.stateMsg}>No messages yet. Say hello!</div>
        )}

        {groupedMessages.map(group => (
          <React.Fragment key={group.date}>
            <div className={styles.dateDivider}>
              <span /><em>{group.date}</em><span />
            </div>
            {group.msgs.map(msg => {
              const isMine = msg.senderId === user?.id;
              return (
                <div
                  key={msg.id}
                  className={`${styles.bubbleWrapper} ${isMine ? styles.mine : styles.theirs}`}
                >
                  <div className={`${styles.bubble} ${isMine ? styles.mine : styles.theirs} ${msg.sendStatus === 'sending' ? styles.sending : ''} ${msg.sendStatus === 'failed' ? styles.failed : ''}`}>
                    {msg.body === '[heart]' ? '\u2764\uFE0F' : msg.body}
                  </div>
                  <span className={styles.bubbleTime}>{timeAgo(msg.createdAt)}</span>
                  {msg.sendStatus === 'failed' && (
                    <div
                      className={styles.failedLabel}
                      onClick={() => handleRetry(msg)}
                    >
                      Retry
                    </div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className={styles.inputBar}>
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
  );
}
