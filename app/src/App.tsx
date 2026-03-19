import React, { useState, useCallback, useEffect } from 'react';
import { Routes, Route, Navigate, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { FeedPage } from './features/feed/FeedPage';
import { ExplorePage } from './features/explore/ExplorePage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { PostDetailModal } from './features/post/PostDetailModal';
import { CreatePostModal } from './features/post/CreatePostModal';
import { InboxModal } from './features/dms/InboxModal';
import { ChatModal } from './features/dms/ChatModal';
import { TabBar } from './components/TabBar';
import { Conversation } from './models';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-app)',
        color: 'var(--text-secondary)',
        fontSize: 15,
      }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

function RequireGuest({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();
  if (!initialized) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AuthenticatedApp() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('inbox') === '1') {
      setShowInbox(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleCreatePost = useCallback(() => setShowCreatePost(true), []);
  const handleCloseCreatePost = useCallback(() => setShowCreatePost(false), []);
  const handleOpenInbox = useCallback(() => setShowInbox(true), []);
  const handleCloseInbox = useCallback(() => setShowInbox(false), []);

  const handleOpenChat = useCallback((conv: Conversation) => {
    setActiveConversation(conv);
    setShowInbox(false);
  }, []);

  const handleCloseChat = useCallback(() => {
    setActiveConversation(null);
    setShowInbox(true);
  }, []);

  return (
    <div className="app-layout">
      <div className="app-main">
        <Routes>
          <Route
            path="/"
            element={<FeedPage onCreatePost={handleCreatePost} onOpenInbox={handleOpenInbox} />}
          />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
          <Route
            path="/post/:postId"
            element={<PostDetailModal asPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <TabBar onCreatePost={handleCreatePost} />

      {showCreatePost && (
        <CreatePostModal
          onClose={handleCloseCreatePost}
          onSuccess={handleCloseCreatePost}
        />
      )}

      {showInbox && !activeConversation && (
        <InboxModal onClose={handleCloseInbox} onOpenChat={handleOpenChat} />
      )}

      {activeConversation && (
        <ChatModal
          conversation={activeConversation}
          onClose={handleCloseChat}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<RequireGuest><LoginPage /></RequireGuest>}
      />
      <Route
        path="/register"
        element={<RequireGuest><RegisterPage /></RequireGuest>}
      />
      <Route
        path="/*"
        element={<RequireAuth><AuthenticatedApp /></RequireAuth>}
      />
    </Routes>
  );
}
