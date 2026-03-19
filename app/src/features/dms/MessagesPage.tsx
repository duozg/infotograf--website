import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MessagesPage.module.css';
import { Avatar } from '../../components/Avatar';
import { api, parsePaginated } from '../../api/client';
import { Conversation, Message } from '../../models';
import { timeAgo } from '../../utils/timeAgo';
import { imageUrl } from '../../utils/imageUrl';
import { useAuth } from '../../context/AuthContext';
import { usePolling } from '../../hooks/usePolling';
import { useAppState } from '../../context/AppStateContext';

export function MessagesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearMessages } = useAppState();

  // Conversation list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Clear unread badge on mount
  useEffect(() => { clearMessages(); }, [clearMessages]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await api.get<{ conversations: Conversation[] }>('/conversations');
      setConversations(res.conversations || []);
    } catch {
      // ignore
    } finally {
      setConvsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  usePolling(fetchConversations, 5000, true);

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!activeConversation) return;
    try {
      const raw = await api.get<unknown>(`/conversations/${activeConversation.id}/messages`);
      const newMessages = parsePaginated<Message>(raw).items;
      setMessages(prev => {
        if (newMessages.length > 0 && newMessages[0]?.id !== lastMessageIdRef.current) {
          lastMessageIdRef.current = newMessages[0]?.id || null;
          return newMessages;
        }
        return prev;
      });
    } catch {
      // ignore
    }
  }, [activeConversation]);

  useEffect(() => {
    if (!activeConversation) return;
    setMsgsLoading(true);
    lastMessageIdRef.current = null;
    setMessages([]);
    fetchMessages().finally(() => setMsgsLoading(false));
    api.post(`/conversations/${activeConversation.id}/read`).catch(() => {});
  }, [activeConversation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  usePolling(fetchMessages, 3000, !!activeConversation);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    if (!activeConversation || !text.trim() || sending) return;
    const body = text.trim();
    setText('');
    const replyToId = replyTo?.id;
    setReplyTo(null);
    setSending(true);

    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user?.id,
      body,
      replyToId,
      createdAt: new Date().toISOString(),
      sendStatus: 'sending',
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const sent = await api.post<Message>(`/conversations/${activeConversation.id}/messages`, { body, replyToId });
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, sendStatus: 'sent' } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, sendStatus: 'failed' } : m));
    } finally {
      setSending(false);
    }
  }, [activeConversation, text, sending, replyTo, user?.id]);

  const handleImageSend = useCallback(async (file: File) => {
    if (!activeConversation) return;
    const tempId = `temp-img-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user?.id,
      imageUrl: URL.createObjectURL(file),
      createdAt: new Date().toISOString(),
      sendStatus: 'sending',
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const form = new FormData();
      form.append('image', file);
      const sent = await api.upload<Message>(`/conversations/${activeConversation.id}/messages/image`, form);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, sendStatus: 'sent' } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, sendStatus: 'failed' } : m));
    }
  }, [activeConversation, user?.id]);

  const getOtherMember = (conv: Conversation) => {
    if (!user) return conv.members[0];
    return conv.members.find(m => m.id !== user.id) || conv.members[0];
  };

  const otherMember = activeConversation ? getOtherMember(activeConversation) : null;

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
    <div className={styles.page}>
      {/* Left panel: conversation list */}
      <div className={styles.convPanel}>
        <div className={styles.convHeader}>
          <span className={styles.convTitle}>
            {user?.username || 'Messages'}
          </span>
        </div>

        <div className={styles.convList}>
          {convsLoading && <div className={styles.stateMsg}>Loading…</div>}
          {!convsLoading && conversations.length === 0 && (
            <div className={styles.stateMsg}>No messages yet.</div>
          )}
          {conversations.map(conv => {
            const other = getOtherMember(conv);
            const unread = conv.unreadCount || 0;
            const preview = conv.lastMessage
              ? (conv.lastMessage.body || (conv.lastMessage.imageUrl ? 'Photo' : conv.lastMessage.audioUrl ? 'Voice message' : ''))
              : '';
            const isActive = activeConversation?.id === conv.id;

            return (
              <div
                key={conv.id}
                className={`${styles.convItem} ${unread > 0 ? styles.unreadItem : ''} ${isActive ? styles.activeItem : ''}`}
                onClick={() => setActiveConversation(conv)}
              >
                <Avatar src={other?.avatarUrl} username={other?.username} size="md" />
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

      {/* Right panel: active chat */}
      <div className={styles.chatPanel}>
        {!activeConversation ? (
          <div className={styles.emptyChat}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ width: 64, height: 64, opacity: 0.2 }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p>Select a conversation</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className={styles.chatHeader}>
              <div
                className={styles.chatHeaderInfo}
                onClick={() => navigate(`/profile/${otherMember?.username}`)}
              >
                <Avatar src={otherMember?.avatarUrl} username={otherMember?.username} size="md" />
                <span className={styles.chatHeaderName}>{otherMember?.username}</span>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messages}>
              {msgsLoading && <div className={styles.stateMsg}>Loading…</div>}
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
                              <img src={imgUrl} alt="" className={styles.bubbleImage} />
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
              <button className={styles.imageBtn} onClick={() => fileInputRef.current?.click()} aria-label="Send image">
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
          </>
        )}
      </div>
    </div>
  );
}
