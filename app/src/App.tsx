import React, { useState, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { FeedPage } from './features/feed/FeedPage';
import { ExplorePage } from './features/explore/ExplorePage';
import { NotificationsPage } from './features/notifications/NotificationsPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { PostDetailModal } from './features/post/PostDetailModal';
import { CreatePostModal } from './features/post/CreatePostModal';
import { MessagesPage } from './features/dms/MessagesPage';
import { HashtagPage } from './features/explore/HashtagPage';
import { NavBar } from './components/NavBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FediverseDiscoverPage } from './features/fediverse/FediverseDiscoverPage';
import { PublicProfilePage } from './features/profile/PublicProfilePage';

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

  const handleCreatePost = useCallback(() => setShowCreatePost(true), []);
  const handleCloseCreatePost = useCallback(() => setShowCreatePost(false), []);

  return (
    <div className="app-layout">
      <NavBar onCreatePost={handleCreatePost} />

      <div className="app-main">
        <Routes>
          <Route
            path="/"
            element={<ErrorBoundary><FeedPage onCreatePost={handleCreatePost} /></ErrorBoundary>}
          />
          <Route path="/explore" element={<ErrorBoundary><ExplorePage /></ErrorBoundary>} />
          <Route path="/fediverse" element={<ErrorBoundary><FediverseDiscoverPage /></ErrorBoundary>} />
          <Route path="/notifications" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
          <Route path="/messages" element={<ErrorBoundary><MessagesPage /></ErrorBoundary>} />
          <Route path="/profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
          <Route path="/profile/:username" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
          <Route
            path="/post/:postId"
            element={<ErrorBoundary><PostDetailModal asPage /></ErrorBoundary>}
          />
          <Route path="/hashtag/:tag" element={<ErrorBoundary><HashtagPage /></ErrorBoundary>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      {showCreatePost && (
        <CreatePostModal
          onClose={handleCloseCreatePost}
          onSuccess={handleCloseCreatePost}
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
        path="/@:username"
        element={<ErrorBoundary><PublicProfilePage /></ErrorBoundary>}
      />
      <Route
        path="/*"
        element={<RequireAuth><AuthenticatedApp /></RequireAuth>}
      />
    </Routes>
  );
}
