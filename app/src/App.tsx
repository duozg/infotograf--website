import React, { useState, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { ColumnsProvider } from './context/ColumnsContext';
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
import { RssPage } from './features/rss/RssPage';
import { PublicProfilePage } from './features/profile/PublicProfilePage';
import { SettingsModal } from './features/profile/SettingsModal';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { TabBar } from './components/TabBar';
import { AppFooter } from './components/AppFooter';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ColumnsLayout } from './components/columns/ColumnsLayout';
import { useIsMobile } from './hooks/useIsMobile';

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

function AuthenticatedApp() {
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [postModalId, setPostModalId] = useState<string | null>(null);
  const location = useLocation();
  const isMobile = useIsMobile();
  const handleCreatePost = useCallback(() => setShowCreatePost(true), []);
  const handleCloseCreatePost = useCallback(() => setShowCreatePost(false), []);

  const isHome = location.pathname === '/';
  const useMultiColumn = isHome && !isMobile;

  // Open post detail as modal overlay (Instagram-style lightbox)
  const openPostModal = useCallback((postId: string) => {
    setPostModalId(postId);
    window.history.pushState(null, '', `/post/${postId}`);
  }, []);

  const closePostModal = useCallback(() => {
    setPostModalId(null);
    window.history.back();
  }, []);

  React.useEffect(() => {
    const handlePopState = () => {
      if (postModalId) {
        setPostModalId(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [postModalId]);

  return (
    <>
      <TopNav onNewPost={handleCreatePost} />

      <div className="app-layout">
        <Sidebar />

        <div className="app-main">
          {useMultiColumn ? (
            <ColumnsLayout onPostClick={openPostModal} />
          ) : (
            <div className="app-main-inner">
              <div className="app-feed-col">
                <Routes>
                  <Route
                    path="/"
                    element={<ErrorBoundary><FeedPage onCreatePost={handleCreatePost} onPostClick={openPostModal} /></ErrorBoundary>}
                  />
                  <Route path="/explore" element={<ErrorBoundary><ExplorePage /></ErrorBoundary>} />
                  <Route path="/fediverse" element={<ErrorBoundary><FediverseDiscoverPage /></ErrorBoundary>} />
                  <Route path="/activity" element={<ErrorBoundary><NotificationsPage /></ErrorBoundary>} />
                  <Route path="/messages" element={<ErrorBoundary><MessagesPage /></ErrorBoundary>} />
                  <Route path="/rss" element={<ErrorBoundary><RssPage /></ErrorBoundary>} />
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
            </div>
          )}

          {isMobile && <AppFooter />}
        </div>
      </div>

      {postModalId && (
        <PostDetailModal postId={postModalId} onClose={closePostModal} />
      )}

      {showCreatePost && (
        <CreatePostModal
          onClose={handleCloseCreatePost}
          onSuccess={handleCloseCreatePost}
        />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {isMobile && <TabBar onCreatePost={handleCreatePost} />}
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
        element={
          <RequireAuth>
            <ColumnsProvider>
              <AuthenticatedApp />
            </ColumnsProvider>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
