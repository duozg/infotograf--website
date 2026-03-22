import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styles from './MessagesPage.module.css';
import { Avatar } from '../../components/Avatar';
import { api, parsePaginated } from '../../api/client';
import { Conversation, Message, User } from '../../models';
import { timeAgo } from '../../utils/timeAgo';
import { imageUrl } from '../../utils/imageUrl';
import { useAuth } from '../../context/AuthContext';
import { usePolling } from '../../hooks/usePolling';
import { useAppState } from '../../context/AppStateContext';
import { SharedPostBubble, parseSharedPostId } from '../../components/SharedPostBubble';

function previewBody(body: string | undefined, imageUrl?: string, audioUrl?: string): string {
  if (!body) return imageUrl ? 'Photo' : audioUrl ? 'Voice message' : '';
  if (body === '[heart]') return '❤️';
  if (parseSharedPostId(body)) return 'Shared a post';
  return body;
}

function VoiceBubble({ audioUrl }: { audioUrl: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play(); setPlaying(true); }
  };

  return (
    <div className={styles.voiceBubble} onClick={e => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onTimeUpdate={e => {
          const a = e.currentTarget;
          if (a.duration) setProgress(a.currentTime / a.duration);
        }}
      />
      <button className={styles.voicePlayBtn} onClick={toggle}>
        {playing ? '⏸' : '▶'}
      </button>
      <div className={styles.voiceBarWrap}>
        <div className={styles.voiceBarFill} style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}

export function MessagesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clearMessages } = useAppState();

  // Conversation list
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null);

  // Messages
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
  const [isOtherUserOnline, setIsOtherUserOnline] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);
  const lastTypingRef = useRef<number>(0);

  // Reactions
  const [reactingToMsgId, setReactingToMsgId] = useState<string | null>(null);

  // Voice recording
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Compose
  const [showCompose, setShowCompose] = useState(false);
  const [composeQuery, setComposeQuery] = useState('');
  const [composeResults, setComposeResults] = useState<User[]>([]);
  const composeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear unread badge on mount
  useEffect(() => { clearMessages(); }, [clearMessages]);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const { items } = await api.getPaginated<Conversation>('/conversations');
      setConversations(items);
    } catch {
      // ignore
    } finally {
      setConvsLoading(false);
    }
  }, []);

  useEffect(() => { fetchConversations(); }, [fetchConversations]);
  usePolling(fetchConversations, 2000, true);

  // Auto-open conversation from ?with=userId URL param
  useEffect(() => {
    const withUserId = searchParams.get('with');
    if (!withUserId) return;
    api.post<Conversation>(`/conversations/with/${withUserId}`)
      .then(conv => {
        setConversations(prev => {
          const exists = prev.find(c => c.id === conv.id);
          return exists ? prev : [conv, ...prev];
        });
        setActiveConversation(conv);
      })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch messages for active conversation
  const fetchMessages = useCallback(async () => {
    if (!activeConversation) return;
    try {
      const raw = await api.get<unknown>(`/conversations/${activeConversation.id}/messages`);
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
  }, [activeConversation]);

  useEffect(() => {
    if (!activeConversation) return;
    setMsgsLoading(true);
    lastMessageIdRef.current = null;
    setMessages([]);
    setIsOtherUserTyping(false);
    fetchMessages().finally(() => setMsgsLoading(false));
    api.post(`/conversations/${activeConversation.id}/read`).catch(() => {});
  }, [activeConversation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll at 1.5s (matching iOS) to avoid overloading the backend
  usePolling(fetchMessages, 1500, !!activeConversation);

  // Mark messages as read periodically while chat is open
  useEffect(() => {
    if (!activeConversation) return;
    const readInterval = setInterval(() => {
      api.post(`/conversations/${activeConversation.id}/read`).catch(() => {});
    }, 3000);
    return () => clearInterval(readInterval);
  }, [activeConversation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Heartbeat + presence cleanup + typing indicator
  useEffect(() => {
    if (!activeConversation) return;
    const convId = activeConversation.id;
    const hb = setInterval(async () => {
      try {
        const res = await api.post<{ isTyping?: boolean; otherUserPresent?: boolean }>(`/conversations/${convId}/heartbeat`);
        setIsOtherUserTyping(res.isTyping ?? false);
        setIsOtherUserOnline(res.otherUserPresent ?? false);
      } catch {}
    }, 1500);
    return () => {
      clearInterval(hb);
      api.delete(`/conversations/${convId}/presence`).catch(() => {});
    };
  }, [activeConversation?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom on new messages or typing indicator change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isOtherUserTyping]);

  // Compose search (debounced)
  useEffect(() => {
    if (!showCompose) {
      setComposeQuery('');
      setComposeResults([]);
      return;
    }
  }, [showCompose]);

  useEffect(() => {
    if (!composeQuery.trim()) { setComposeResults([]); return; }
    if (composeDebounceRef.current) clearTimeout(composeDebounceRef.current);
    composeDebounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get<User[]>(`/users/search?q=${encodeURIComponent(composeQuery.trim())}`);
        setComposeResults(Array.isArray(res) ? res : []);
      } catch {}
    }, 300);
  }, [composeQuery]);

  const handleStartConversation = useCallback(async (target: User) => {
    setShowCompose(false);
    try {
      const conv = await api.post<Conversation>(`/conversations/with/${target.id}`);
      setConversations(prev => {
        const exists = prev.find(c => c.id === conv.id);
        return exists ? prev : [conv, ...prev];
      });
      setActiveConversation(conv);
    } catch {}
  }, []);

  const handleDeleteConversation = useCallback(async (convId: string) => {
    setConversations(prev => prev.filter(c => c.id !== convId));
    if (activeConversation?.id === convId) setActiveConversation(null);
    try {
      await api.delete(`/conversations/${convId}`);
    } catch {
      // ignore
    }
  }, [activeConversation]);

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

  const handleRetry = useCallback(async (failedMsg: Message) => {
    if (!activeConversation || !failedMsg.body) return;
    setMessages(prev => prev.map(m => m.id === failedMsg.id ? { ...m, sendStatus: 'sending' } : m));
    try {
      const sent = await api.post<Message>(`/conversations/${activeConversation.id}/messages`, {
        body: failedMsg.body,
        replyToId: failedMsg.replyToId,
      });
      setMessages(prev => prev.filter(m => m.id !== failedMsg.id).concat({ ...sent, sendStatus: 'sent' }));
    } catch {
      setMessages(prev => prev.map(m => m.id === failedMsg.id ? { ...m, sendStatus: 'failed' } : m));
    }
  }, [activeConversation]);

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

  const handleDeleteMessage = useCallback(async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    try {
      await api.delete(`/conversations/${activeConversation!.id}/messages/${msgId}`);
    } catch {}
  }, [activeConversation]);

  const handleReact = useCallback(async (msgId: string, emoji: string) => {
    setReactingToMsgId(null);
    try {
      await api.post(`/conversations/${activeConversation!.id}/messages/${msgId}/react`, { emoji });
      // Optimistically add reaction
      setMessages(prev => prev.map(m => {
        if (m.id !== msgId) return m;
        const reactions = [...(m.reactions || [])];
        const existing = reactions.findIndex(r => r.emoji === emoji && r.userId === undefined);
        if (existing >= 0) return m; // already has it
        return { ...m, reactions: [...reactions, { emoji, userId: '' }] };
      }));
    } catch {}
  }, [activeConversation]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      audioChunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
    } catch {}
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const sendVoiceMessage = useCallback(async () => {
    if (!activeConversation || !audioBlob) return;
    const blob = audioBlob;
    setAudioBlob(null);
    const form = new FormData();
    form.append('audio', blob, 'voice.webm');
    const tempId = `temp-voice-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user?.id,
      audioUrl: URL.createObjectURL(blob),
      createdAt: new Date().toISOString(),
      sendStatus: 'sending',
    };
    setMessages(prev => [...prev, tempMsg]);
    try {
      const sent = await api.upload<Message>(`/conversations/${activeConversation.id}/messages/voice`, form);
      setMessages(prev => prev.map(m => m.id === tempId ? { ...sent, sendStatus: 'sent' } : m));
    } catch {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, sendStatus: 'failed' } : m));
    }
  }, [activeConversation, audioBlob, user?.id]);

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
          <button
            className={styles.composeBtn}
            onClick={() => setShowCompose(true)}
            aria-label="New message"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        </div>

        <div className={styles.convList}>
          {convsLoading && <div className={styles.stateMsg}>Loading…</div>}
          {!convsLoading && conversations.length === 0 && (
            <div className={styles.stateMsg}>
              <p>No messages yet.</p>
              <button className={styles.newMessageBtn} onClick={() => setShowCompose(true)}>
                Send a message
              </button>
            </div>
          )}
          {conversations.map(conv => {
            const other = getOtherMember(conv);
            const unread = conv.unreadCount || 0;
            const lastMsg = conv.lastMessage;
            let preview = '';
            if (lastMsg) {
              const isMyMessage = lastMsg.senderId === user?.id;
              const bodyText = previewBody(lastMsg.body, lastMsg.imageUrl, lastMsg.audioUrl);
              preview = isMyMessage ? `You: ${bodyText}` : bodyText;
            }
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
                  <button
                    className={styles.deleteConvBtn}
                    onClick={e => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                    aria-label="Delete conversation"
                    title="Delete"
                  >×</button>
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
            <button className={styles.newMessageBtn} onClick={() => setShowCompose(true)}>
              New message
            </button>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className={`${styles.chatHeader} ${isOtherUserOnline ? styles.chatHeaderPresent : ''}`}>
              <div
                className={styles.chatHeaderInfo}
                onClick={() => navigate(`/profile/${otherMember?.username}`)}
              >
                <Avatar src={otherMember?.avatarUrl} username={otherMember?.username} size="md" />
                <div>
                  <div className={styles.chatHeaderName}>{otherMember?.username}</div>
                  {isOtherUserTyping && (
                    <div className={styles.typingStatus}>typing…</div>
                  )}
                  {isOtherUserOnline && !isOtherUserTyping && (
                    <div className={styles.presenceStatus}>Active now</div>
                  )}
                </div>
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
                    const imgSrc = imageUrl(msg.imageUrl);
                    const sharedPostId = parseSharedPostId(msg.body);
                    const hasAudio = !msg.body && !msg.imageUrl && msg.audioUrl;

                    return (
                      <div
                        key={msg.id}
                        className={`${styles.bubbleWrapper} ${isMine ? styles.mine : styles.theirs}`}
                        onDoubleClick={() => setReplyTo(msg)}
                        onMouseLeave={() => setReactingToMsgId(null)}
                      >
                        {!isMine && (
                          <Avatar src={otherMember?.avatarUrl} username={otherMember?.username} size="sm" />
                        )}
                        <div className={`${styles.bubbleCol} ${isMine ? styles.mine : styles.theirs}`}>
                          {msg.replyTo && (
                            <div className={styles.replyPreview}>
                              {msg.replyTo.body === '[heart]' ? '❤️' : parseSharedPostId(msg.replyTo.body) ? 'Shared a post' : (msg.replyTo.body || 'Photo')}
                            </div>
                          )}
                          {sharedPostId ? (
                            <div style={{ opacity: msg.sendStatus === 'sending' ? 0.6 : 1 }}>
                              <SharedPostBubble postId={sharedPostId} />
                            </div>
                          ) : (
                          <div className={`${styles.bubble} ${isMine ? styles.mine : styles.theirs} ${msg.sendStatus === 'sending' ? styles.sending : ''} ${msg.sendStatus === 'failed' ? styles.failed : ''}`}>
                            {imgSrc ? (
                              <img src={imgSrc} alt="" className={styles.bubbleImage} />
                            ) : hasAudio ? (
                              <VoiceBubble audioUrl={msg.audioUrl!} />
                            ) : msg.body === '[heart]' ? '❤️' : msg.body}
                          </div>
                          )}
                          {msg.sendStatus === 'failed' && (
                            <div
                              className={styles.failedLabel}
                              onClick={() => handleRetry(msg)}
                              style={{ cursor: 'pointer' }}
                            >
                              Failed · Tap to retry
                            </div>
                          )}
                          {isMine && (
                            <button
                              className={styles.deleteMsgBtn}
                              onClick={e => { e.stopPropagation(); handleDeleteMessage(msg.id); }}
                              aria-label="Delete message"
                            >✕</button>
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
                        {!sharedPostId && (
                          <div style={{ position: 'relative' }}>
                            <button
                              className={styles.reactBtn}
                              onClick={e => { e.stopPropagation(); setReactingToMsgId(prev => prev === msg.id ? null : msg.id); }}
                              aria-label="Add reaction"
                            >☺</button>
                            {reactingToMsgId === msg.id && (
                              <div className={`${styles.emojiPicker} ${isMine ? styles.emojiPickerLeft : styles.emojiPickerRight}`}>
                                {['❤️','😂','😮','😢','😡','👍','👎','🔥'].map(emoji => (
                                  <button
                                    key={emoji}
                                    className={styles.emojiOption}
                                    onClick={e => { e.stopPropagation(); handleReact(msg.id, emoji); }}
                                  >{emoji}</button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ))}

              {/* Seen / Sent indicator */}
              {(() => {
                const lastMsg = messages[messages.length - 1];
                if (lastMsg && lastMsg.senderId === user?.id && lastMsg.sendStatus !== 'failed') {
                  return (
                    <div className={styles.seenSentIndicator}>
                      {lastMsg.readAt
                        ? <span className={styles.seenText}>Seen</span>
                        : <span className={styles.sentText}>Sent</span>
                      }
                    </div>
                  );
                }
                return null;
              })()}

              {/* Typing indicator bubble */}
              {isOtherUserTyping && (
                <div className={`${styles.bubbleWrapper} ${styles.theirs}`}>
                  <Avatar src={otherMember?.avatarUrl} username={otherMember?.username} size="sm" />
                  <div className={`${styles.bubble} ${styles.theirs} ${styles.typingBubble}`}>
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                    <span className={styles.typingDot} />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Reply bar */}
            {replyTo && (
              <div className={styles.replyingBar}>
                <span className={styles.replyingText}>
                  Replying to: {replyTo.body === '[heart]' ? '❤️' : (replyTo.body || 'Photo')}
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
              {/* Mic / voice recording */}
              {!audioBlob ? (
                <button
                  className={`${styles.imageBtn} ${recording ? styles.recordingBtn : ''}`}
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  aria-label={recording ? 'Recording…' : 'Hold to record voice'}
                  title="Hold to record"
                >
                  <svg viewBox="0 0 24 24" fill={recording ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="23"/>
                    <line x1="8" y1="23" x2="16" y2="23"/>
                  </svg>
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Voice ready</span>
                  <button
                    className={styles.sendBtn}
                    onClick={sendVoiceMessage}
                  >Send</button>
                  <button
                    className={styles.sendBtn}
                    style={{ color: 'var(--text-tertiary)' }}
                    onClick={() => setAudioBlob(null)}
                  >✕</button>
                </div>
              )}
              <textarea
                className={styles.textInput}
                placeholder="Message…"
                value={text}
                onChange={e => {
                  setText(e.target.value);
                  if (activeConversation && e.target.value.trim()) {
                    const now = Date.now();
                    if (now - lastTypingRef.current > 2000) {
                      lastTypingRef.current = now;
                      api.post(`/conversations/${activeConversation.id}/typing`).catch(() => {});
                    }
                  }
                }}
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

      {/* Compose overlay */}
      {showCompose && (
        <div
          className={styles.composeOverlay}
          onClick={e => { if (e.target === e.currentTarget) setShowCompose(false); }}
        >
          <div className={styles.composeSheet}>
            <div className={styles.composeHeader}>
              <span className={styles.composeTitle}>New Message</span>
              <button className={styles.cancelReply} onClick={() => setShowCompose(false)}>×</button>
            </div>
            <input
              className={styles.composeInput}
              placeholder="Search users…"
              autoFocus
              value={composeQuery}
              onChange={e => setComposeQuery(e.target.value)}
            />
            <div className={styles.composeResults}>
              {composeResults.map(u => (
                <div
                  key={u.id}
                  className={styles.composeUserItem}
                  onClick={() => handleStartConversation(u)}
                >
                  <Avatar src={u.avatarUrl} username={u.username} size="md" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{u.username}</div>
                    {u.displayName && (
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{u.displayName}</div>
                    )}
                  </div>
                </div>
              ))}
              {composeQuery.trim() && composeResults.length === 0 && (
                <div className={styles.stateMsg}>No users found.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
