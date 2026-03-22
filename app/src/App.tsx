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
import { FediverseDiscoverPage } from './features/fediverse/FediverseDiscoverPage';
import { PublicProfilePage } from './features/profile/PublicProfilePage';
import { SettingsModal } from './features/profile/SettingsModal';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { RightAside } from './components/RightAside';
import { ErrorBoundary } from './components/ErrorBoundary';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, initialized } = useAuth();
  const location = useLocation();

  if (!initialized) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: 'var(--bg)', color: 'var(--t2)', fontSize: 15,
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

/** Pages where the right aside should be visible */
const ASIDE_PAGES = ['/', '/explore'];

function AuthenticatedApp() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const location = useLocation();

  const handleCreatePost = useCallback(() => setShowCreatePost(true), []);
  const handleCloseCreatePost = useCallback(() => setShowCreatePost(false), []);

  const showAside = ASIDE_PAGES.includes(location.pathname);

  return (
    <>
      <TopNav onNewPost={handleCreatePost} />

      <div className="app-layout">
        <Sidebar />

        <div className="app-main">
          <div className="app-main-inner">
            <div className="app-feed-col">
              <Routes>
                <Route
                  path="/"
                  element={<ErrorBoundary><FeedPage onCreatePost={handleCreatePost} /></ErrorBoundary>}
                />
                <Route path="/explore" element={<ErrorBoundary><ExplorePage /></ErrorBoundary>} />
                <Route path="/fediverse" element={<ErrorBoundary><FediverseDiscoverPage /></ErrorBoundary>} />
                <Route path="/activity" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
                <Route path="/messages" element={<ErrorBoundary><MessagesPage /></ErrorBoundary>} />
                <Route path="/profile" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
                <Route path="/profile/:username" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary><ProfilePage /></ErrorBoundary>} />
                <Route
                  path="/post/:postId"
                  element={<ErrorBoundary><PostDetailModal asPage /></ErrorBoundary>}
                />
                <Route path="/hashtag/:tag" element={<ErrorBoundary><HashtagPage /></ErrorBoundary>} />
                <Route path="/upload" element={<ErrorBoundary><FeedPage onCreatePost={handleCreatePost} /></ErrorBoundary>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>

            {showAside && (
              <div className="app-aside-col">
                <RightAside />
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreatePost && (
        <CreatePostModal
          onClose={handleCloseCreatePost}
          onSuccess={handleCloseCreatePost}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </>
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
