# Infotograf Web App — Complete Architecture Spec

> This document describes the **entire iOS app architecture** of Infotograf so that a web developer (or Claude Code) can build a pixel-equivalent web app. Every API endpoint, data model, UI screen, interaction pattern, and design token is documented here.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack Recommendation](#tech-stack-recommendation)
3. [API Layer](#api-layer)
4. [Data Models](#data-models)
5. [Authentication](#authentication)
6. [Design System](#design-system)
7. [App Structure & Navigation](#app-structure--navigation)
8. [Screens & Features](#screens--features)
9. [Real-Time Patterns](#real-time-patterns)
10. [Image Handling](#image-handling)
11. [Audio Features](#audio-features)
12. [Text Parsing](#text-parsing)
13. [Key Behavioral Rules](#key-behavioral-rules)

---

## Overview

Infotograf is a photo-sharing social media app modeled after 2012-era Instagram. The core philosophy: **no algorithm, no reels, no shopping — just photos, filters, and a chronological feed.**

### Core Features
- Chronological photo feed (no algorithm)
- Photo posting with 9 classic filters + multi-image carousels
- Explore grid (popular posts) with search (users + hashtags)
- Comments with single-level threading + @mention + #hashtag support
- Likes, bookmarks, shares (to DMs)
- Direct messages (text, photos, voice messages, reactions, reply-to, typing/presence indicators)
- Notifications (You + Friends activity tabs, grouped by time period)
- User profiles with follow/unfollow, block, mute, report
- Edit profile (avatar, bio, website, username changes)
- Settings (theme toggle, notification preferences, blocked users, legal links, account deletion)
- Ambient audio and voice clips on posts

### Backend
- **API Base URL**: `https://noiscut-api-production.up.railway.app/api`
- **Stack**: Fastify + Drizzle ORM + PostgreSQL (hosted on Railway)
- **Auth**: JWT (access token + refresh token)
- **File storage**: Managed by backend (returns URLs for images/audio)

---

## Tech Stack Recommendation

Build as a **React SPA** (Single Page Application):

```
Framework:     React 18+ with React Router
State:         React Context + useReducer (or Zustand for simplicity)
Styling:       CSS Modules or Tailwind (map to design tokens below)
HTTP:          fetch wrapper (matching APIClient.swift behavior)
Build:         Vite
Deployment:    Same Vercel project as the marketing site
```

The web app should live under `/app` on the same domain, with the marketing site at `/`. Use Vercel rewrites to route `/app/*` to the SPA.

---

## API Layer

### Base Configuration

```
Base URL: https://noiscut-api-production.up.railway.app/api
Auth: Bearer token in Authorization header
Content-Type: application/json (except file uploads which use multipart/form-data)
```

### Token Management

- Store `accessToken` and `refreshToken` in localStorage (or httpOnly cookies for security)
- On **401 response**: automatically call `POST /auth/refresh` with `{ refreshToken }` to get new tokens
- If refresh fails → log out user, redirect to login
- ISO 8601 date format with fractional seconds: `2025-01-15T10:30:00.000Z`

### Complete Endpoint Map

#### Auth
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/auth/register` | `{ username, email, password, displayName? }` | `AuthResponse` | |
| POST | `/auth/login` | `{ login, password }` | `AuthResponse` | login field accepts username or email |
| POST | `/auth/refresh` | `{ refreshToken }` | `AuthResponse` | |
| POST | `/auth/apple` | `{ identityToken, fullName? }` | `AuthResponse` | Sign in with Apple |

#### Users
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| GET | `/users/:username` | — | `User` | Profile data |
| PATCH | `/users/me` | `{ displayName?, bio?, website? }` | `User` | |
| POST | `/users/me/avatar` | multipart `file` | `User` | Image upload (field name is "file") |
| GET | `/users/search?q=:query` | — | `User[]` | |
| GET | `/users/check-username/:username` | — | `{ available, reason? }` | |
| PATCH | `/users/me/username` | `{ username }` | `{ success, username?, usernameChangesLeft? }` | Limited changes (2 total) |

#### Follows
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/follows/:userId` | `{}` | — | Empty body but needs Content-Type: application/json |
| DELETE | `/follows/:userId` | — | — | Unfollow |
| GET | `/follows/:userId/followers` | — | `User[]` | Paginated |
| GET | `/follows/:userId/following` | — | `User[]` | Paginated |

#### Posts
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/posts` | multipart (images[], caption?, locationName?, audioType?, audioDuration?, audio?) | `Post` | Multi-image carousel support |
| GET | `/posts/:postId` | — | `Post` | |
| PATCH | `/posts/:postId` | `{ caption?, commentsDisabled? }` | `Post` | |
| DELETE | `/posts/:postId` | — | — | |
| GET | `/posts/user/:userId` | — | `PaginatedResponse<Post>` | Cursor pagination |

#### Feed & Explore
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| GET | `/feed` | — | `PaginatedResponse<Post>` | Chronological, authenticated |
| GET | `/explore` | — | `PaginatedResponse<Post>` | Popular/discover posts |
| GET | `/explore/hashtag/:tag` | — | `{ posts, nextCursor?, hashtagPostCount? }` | |
| GET | `/explore/hashtags/search?q=:query` | — | `HashtagSuggestion[]` | `{ name, postCount }` |

#### Likes
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/posts/:postId/like` | — | — | |
| DELETE | `/posts/:postId/like` | — | — | Same path as like, just DELETE method |
| GET | `/posts/:postId/liked-by` | — | `User[]` | Who liked this post |
| POST | `/posts/:postId/comments/:commentId/like` | — | — | |
| DELETE | `/posts/:postId/comments/:commentId/like` | — | — | Same path, DELETE method|

#### Comments
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| GET | `/posts/:postId/comments` | — | `PaginatedResponse<Comment>` | |
| POST | `/posts/:postId/comments` | `{ body, parentId? }` | `Comment` | parentId for replies |
| DELETE | `/posts/:postId/comments/:commentId` | — | — | |

#### Bookmarks
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/posts/:postId/bookmark` | — | — | |
| DELETE | `/posts/:postId/bookmark` | — | — | Same path, DELETE method |
| GET | `/posts/bookmarks` | — | `{ posts, nextCursor? }` | User's saved posts |

#### Conversations & Messages
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| GET | `/conversations` | — | `Conversation[]` | |
| POST | `/conversations/with/:userId` | — | `Conversation` | Get or create |
| DELETE | `/conversations/:id` | — | `{ success }` | |
| GET | `/conversations/:id/messages` | — | `PaginatedResponse<Message>` | |
| POST | `/conversations/:id/messages` | `{ body, replyToId?, postId? }` | `Message` | postId for shared posts |
| POST | `/conversations/:id/messages/image` | multipart `image` | `Message` | |
| POST | `/conversations/:id/messages/voice` | multipart `audio` + `duration` field | `Message` | |
| DELETE | `/conversations/:id/messages/:messageId` | — | `{ success }` | Unsend |
| POST | `/conversations/:id/messages/:messageId/react` | `{ emoji }` | `{ success, removed? }` | Empty emoji = remove |
| POST | `/conversations/:id/read` | — | — | Mark all as read |
| POST | `/conversations/:id/typing` | — | `{ success }` | |
| POST | `/conversations/:id/heartbeat` | — | `{ isTyping, typingUsers[], otherUserPresent, presentUserIds[] }` | Combined presence |
| DELETE | `/conversations/:id/presence` | — | `{ success }` | Leave presence |

#### Notifications
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| GET | `/notifications` | — | `PaginatedResponse<AppNotification>` | |
| GET | `/notifications/friends` | — | `PaginatedResponse<AppNotification>` | Friends activity |
| POST | `/notifications/read` | — | — | Mark all read |
| GET | `/notifications/unread-count` | — | `{ count }` | |

#### Device Token (skip for web — web push is separate)
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/users/device-token` | `{ token, platform }` | — | APNs only |

#### Moderation
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| POST | `/moderation/blocks/:userId` | `{}` | — | Block user |
| DELETE | `/moderation/blocks/:userId` | — | — | Unblock user |
| POST | `/moderation/mutes/:userId` | `{}` | — | Mute user |
| DELETE | `/moderation/mutes/:userId` | — | — | Unmute user |
| POST | `/moderation/reports` | `{ targetType, targetId, reason, details? }` | — | targetType: "post", "comment", "user" |
| GET | `/moderation/blocks` | — | `User[]` | List blocked users |

#### Account
| Method | Endpoint | Body | Response | Notes |
|--------|----------|------|----------|-------|
| DELETE | `/users/me` | — | — | Delete account |
| GET | `/notifications/unread-count` | — | `{ count }` | Notification unread count |
| GET | `/conversations/unread-count` | — | `{ count }` | Message unread count (separate endpoint) |

### Pagination Pattern

All paginated endpoints use **cursor-based pagination**:
- Response uses a **dynamic key** for the items array — NOT a fixed "items" key
- The key depends on the endpoint:
  - Feed/Explore/User posts/Bookmarks: `{ "posts": [...], "nextCursor": "..." }`
  - Comments: `{ "comments": [...], "nextCursor": "..." }`
  - Notifications: `{ "notifications": [...], "nextCursor": "..." }`
  - Conversations: `{ "conversations": [...], "nextCursor": "..." }`
  - Messages: `{ "messages": [...], "nextCursor": "..." }`
  - Users (followers/following): `{ "users": [...], "nextCursor": "..." }`
- **Parser must check all keys**: try `posts`, `comments`, `notifications`, `conversations`, `messages`, `users` — use whichever exists
- Next page: append `?cursor=<nextCursor>` to the endpoint
- Example parser:
```typescript
function parsePaginated<T>(data: any): { items: T[], nextCursor: string | null } {
  const keys = ['posts', 'comments', 'notifications', 'conversations', 'messages', 'users'];
  const items = keys.reduce((found, key) => found ?? data[key], null) ?? [];
  return { items, nextCursor: data.nextCursor ?? null };
}
```

### Important API Quirks

1. **Counts come as strings**: The backend (PostgreSQL aggregate functions) sometimes returns counts as strings. The iOS app uses a `FlexibleInt` type to decode both `Int` and `String` into `Int`. Your web code should handle: `typeof count === 'string' ? parseInt(count, 10) : count`

2. **Empty body POSTs**: Some POST endpoints (follow, block, mute) need `Content-Type: application/json` even with an empty body `{}`, otherwise they may fail.

3. **Image URLs**: Image URLs returned by the API may be relative paths. Construct full URLs: if the URL doesn't start with "http", prepend the API base URL.

---

## Data Models

### User
```typescript
interface User {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  website?: string;
  isPrivate: boolean;
  createdAt: string; // ISO 8601
  postCount: number; // may come as string
  followerCount: number; // may come as string
  followingCount: number; // may come as string
  usernameChangesLeft?: number;
  isFollowing: boolean;
  isBlocked: boolean;
  isMuted: boolean;
}
```

### Post
```typescript
interface PostImage {
  imageUrl: string;
  thumbnailUrl?: string;
  filterName?: string;
}

interface Post {
  id: string;
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  imageUrls?: PostImage[]; // carousel images
  filterName?: string;
  caption?: string;
  locationName?: string;
  likeCount: number; // may come as string
  commentCount: number; // may come as string
  isLiked?: boolean;
  isBookmarked?: boolean;
  audioUrl?: string;
  audioType?: string; // "ambient" | "voice"
  audioDuration?: number;
  commentsDisabled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// Computed properties:
// isCarousel: (imageUrls?.length ?? 0) > 1
// allImages: imageUrls if present, else [{ imageUrl, thumbnailUrl, filterName }]
```

### Comment
```typescript
interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  parentId?: string; // for replies (single-level threading)
  body: string;
  createdAt: string;
  likeCount: number; // may come as string
  isLiked?: boolean;
}
```

### Message
```typescript
interface MessageReaction {
  userId: string;
  emoji: string;
}

interface ReplyPreview {
  id: string;
  senderId?: string;
  body?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
}

interface Message {
  id: string;
  conversationId: string;
  senderId?: string;
  body?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  replyToId?: string;
  readAt?: string;
  createdAt: string;
  reactions?: MessageReaction[];
  replyTo?: ReplyPreview;
  // Client-only fields:
  sendStatus?: 'sending' | 'sent' | 'failed';
}
```

### Conversation
```typescript
interface LastMessage {
  id: string;
  senderId?: string;
  body?: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  members: User[];
  lastMessage?: LastMessage;
  unreadCount?: number;
  updatedAt: string;
}
```

### AppNotification
```typescript
interface CoalescedActor {
  actorId?: string;
  actorUsername?: string;
  actorAvatarUrl?: string;
}

interface AppNotification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'mention' | 'commentReply' | 'commentLike';
  actorId?: string;
  actorUsername?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string;
  postId?: string;
  postImageUrl?: string;
  postThumbnailUrl?: string;
  commentBody?: string;
  isFollowingActor?: boolean;
  read: boolean;
  createdAt: string;
  // Coalesced (grouped) notifications:
  coalescedActors?: CoalescedActor[];
  coalescedCount?: number;
  // Friends activity:
  targetUsername?: string;
}
```

### AuthResponse
```typescript
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}
```

### HashtagSuggestion
```typescript
interface HashtagSuggestion {
  name: string;
  postCount: number;
}
```

---

## Authentication

### Login Flow
1. User enters username (or email) + password
2. POST `/auth/login` → `AuthResponse`
3. Store `accessToken` and `refreshToken` in localStorage
4. Store `user` object in app state
5. Redirect to feed

### Register Flow
1. User enters username, email, password, optional display name
2. POST `/auth/register` → `AuthResponse`
3. Same token storage and redirect as login

### Sign in with Apple (skip for web v1)
The iOS app supports Sign in with Apple. For web, you can implement this later with Apple JS SDK.

### Token Refresh
- On any 401 response, intercept and call `POST /auth/refresh`
- If refresh succeeds, retry the original request with new token
- If refresh fails (e.g., refresh token expired), clear tokens and redirect to login

### Session Check on Launch
On app load:
1. Check if `accessToken` exists in localStorage
2. If yes, try `GET /notifications/unread-count` to verify token validity
3. If 401 → try refresh → if fails → logged out state

---

## Design System

### Color Tokens

The app supports **dark mode** (default) and **light mode**. All colors are defined in the iOS `AppTheme.swift`.

#### Dark Mode (default)
```css
--bg-app: #1c1a1b;
--bg-card: #2c2a2b;
--bg-input: #353334;
--bg-elevated: #363435;
--bg-notif-section: #242223;
--bg-unread-notif: #32302f;
--bg-search-bar: #2a2829;
--text-primary: #e8e6e7;
--text-secondary: #8a8889;
--text-tertiary: #666565;
--text-quaternary: #888787;
--text-link: #6a9fd4;
--text-inactive: #555454;
--border-primary: #484647;
--border-secondary: #4e4c4d;
--divider-card: #3a3839;
--divider-notification: #333132;
--header-gradient-top: #3a5270;
--header-gradient-bottom: #263d5c;
--header-border: #1e344e;
--placeholder: #3a3839;
```

#### Light Mode
```css
--bg-app: #efedee;
--bg-card: #ffffff;
--bg-input: #f5f5f5;
--bg-elevated: #f5f5f5;
--bg-notif-section: #f0eef0;
--bg-unread-notif: #f5f2f8;
--bg-search-bar: #ececec;
--text-primary: #333333;
--text-secondary: #999999;
--text-tertiary: #bbbbbb;
--text-quaternary: #888888;
--text-link: #3b6994;
--text-inactive: #c0c0c0;
--border-primary: #d4d4d4;
--border-secondary: #cccccc;
--divider-card: #e8e8e8;
--divider-notification: #e0e0e0;
--header-gradient-top: #3a5270;
--header-gradient-bottom: #263d5c;
--header-border: #1e344e;
--placeholder: #e0dee0;
```

#### Invariant Colors (same in both themes)
```css
/* Tab bar gradient (always dark) */
--tab-gradient-top: #393939;
--tab-gradient-bottom: #1a1a1a;
--tab-border: #555555;

/* CTA buttons */
--cta-gradient-top: #4a82b5;
--cta-gradient-bottom: #2f6499;
--cta-border: #245a8e;

/* Secondary buttons (follow back, edit profile) */
--secondary-btn-top-dark: #3a3839;
--secondary-btn-bottom-dark: #2e2d2e;
--secondary-btn-top-light: #f0f0f0;
--secondary-btn-bottom-light: #e0e0e0;

/* Accents */
--accent-red: #ed4956;
--heart-color: #ed4956;
--success-green: #4caf50;
--presence-green: #4caf50;

/* Chat */
--chat-bubble-mine-dark: #2d4a6b;
--chat-bubble-mine-light: #3b6994;
--chat-bubble-theirs-dark: #3a3839;
--chat-bubble-theirs-light: #e8e8e8;
--chat-heart: #ed4956;

/* Presence header (purple glow when other user is in chat) */
--presence-header-left: #3a4570;
--presence-header-right: #4a3570;

/* Audio */
--ambient-green: #4caf50;
--voice-blue: #5b9bd5;
--voice-orange: #e67e22;

/* Neon glow (for unread notification badge on heart icon) */
--neon-glow-dark: #b24dff;
--neon-glow-light: #9333ea;
```

### Typography

```css
--font-logo: 'Georgia', 'Times New Roman', serif; /* italic */
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
```

| Element | Size | Weight | Notes |
|---------|------|--------|-------|
| Logo (nav bar) | 21px | italic | Georgia |
| Logo (login/register) | 42px | italic | Georgia, with brand "I" image |
| Section headings | 17px | bold | |
| Post username | 13px | bold | link color |
| Post caption | 13px | normal | |
| Post timestamp | 10px | normal | tertiary color |
| Comment body | 13px | normal | |
| Button text (CTA) | 14px | bold/600 | |
| Tab bar icons | 26px | — | SF Symbols → use equivalent icon set |
| Action bar icons | 26px (heart/comment), 24px (share/bookmark) | — | |

### Corner Radii
```css
--radius-button: 3px;   /* CTA buttons, follow buttons */
--radius-card: 4px;     /* Cards, inputs, avatars */
--radius-pill: 20px;    /* Chat message input, capsule badges */
```

### Shadows & Effects
- **Neon glow**: Purple pulsing glow on the heart icon in the tab bar when there are unread notifications. CSS: `box-shadow: 0 0 8px 2px var(--neon-glow); animation: pulse 2s ease-in-out infinite;`
- **Presence glow**: Purple gradient glow on chat header + input border when the other user is present in the chat
- **Heart animation**: Large heart overlay on double-tap (scale up + fade out)
- **Skeleton loading**: Shimmer effect on placeholder cards while loading (linear gradient animation)

---

## App Structure & Navigation

### Layout (authenticated)
```
┌──────────────────────────┐
│     Header Bar (44px)    │  ← Gradient background, sticky
├──────────────────────────┤
│                          │
│     Tab Content Area     │  ← Scrollable, full height
│                          │
├──────────────────────────┤
│     Tab Bar (50px)       │  ← Dark gradient, sticky bottom
└──────────────────────────┘
```

### Tabs
| Tab | Icon | Label | Screen |
|-----|------|-------|--------|
| Feed | house (filled) | Home | FeedView — chronological feed |
| Popular | star (filled) | Explore | ExploreView — grid of popular posts + search |
| Photo | camera (filled) | Camera | Opens file picker / camera (modal, not a tab page) |
| News | heart | Activity | NotificationsView — notifications |
| Profile | person (filled) | Profile | ProfileView — current user's profile |

### Header Bar
The header bar changes based on the active tab:

- **Feed tab**: Left = camera icon, Center = "Infotograf" (Georgia Italic 21px with brand I image), Right = paper plane icon (inbox) with neon glow badge if unread messages
- **Profile tab**: Left = empty, Center = username, Right = hamburger menu (settings)
- **Other tabs**: Center = tab title, no left/right icons

### Navigation Patterns
- **Profile sheet**: Tapping a username anywhere opens their profile in a modal/sheet
- **Post detail**: Tapping "View all X comments" or the comment icon opens PostDetailView in a sheet
- **Inbox**: Tapping the paper plane icon opens InboxView in a sheet
- **Settings**: Tapping the hamburger on profile tab opens SettingsView in a sheet
- **Explore post**: Tapping a grid thumbnail opens the full post card in a sheet

For web: Use React Router with nested routes. Modals can be overlay routes or portals.

---

## Screens & Features

### 1. Login Screen

**Layout**: Dark background, centered content
- Brand logo: Image "I" + "nfotograf" in Georgia Italic 42px
- Username/email field
- Password field
- "Log In" CTA button (gradient)
- "Don't have an account? Register" link
- "Sign in with Apple" button (skip for web v1)

**Behavior**:
- POST `/auth/login` on submit
- Show inline error if login fails
- On success → store tokens → redirect to feed

### 2. Register Screen

**Layout**: Same as login but with more fields
- Brand logo (same as login)
- Username field (3-30 chars, letters/numbers/./_ only)
- Email field
- Password field (min 6 chars)
- Display name field (optional)
- "Register" CTA button
- "Already have an account? Log In" link

**Validation**: Client-side validation before submit. Show errors inline.

### 3. Feed (Home Tab)

**Layout**: Vertical scrolling list of PostCards
- Pull-to-refresh at top
- Infinite scroll (load more when reaching last post)
- "Where you left off" divider showing count of new posts
- "You're all caught up" message when no more posts
- Empty state: "Welcome to Infotograf — Follow people to see their photos here" + "Find People" button

**PostCard anatomy** (top to bottom):
1. **Header** (48px): Avatar (30px) + username (bold, link color) + location (small, secondary) + "..." menu
2. **Divider**
3. **Image**: Square aspect ratio, full width. Carousel indicator if multi-image. Double-tap to like (heart animation). Single-tap plays audio if audio attached.
4. **Divider**
5. **Action bar**: Heart (toggle like) | Comment bubble | Paper plane (share) | ... Spacer ... | Bookmark (toggle)
6. **Like count**: "X likes" (bold, tappable → shows who liked) or "Be the first to like this"
7. **Caption**: `username caption text...` with @mention and #hashtag highlighting. Truncated at 3 lines with "more" button.
8. **Comment preview**: "View all X comments" link
9. **Timestamp**: Relative time ("2h", "3d") + "(edited)" if post was updated

**"..." menu**:
- Own post: Edit Caption, Toggle Comments, Delete (with confirmation)
- Other's post: Report, Copy Link, Share

**Optimistic updates**: Like/unlike and bookmark immediately update UI, revert on API error.

### 4. Explore (Popular Tab)

**Layout**: Search bar at top + 3-column photo grid below

**Search bar**: Magnifying glass icon + text field + clear button
- Typing a username → searches users (debounced 300ms)
- Typing `#hashtag` → searches hashtag suggestions (debounced 200ms)
- Also searches hashtags in parallel with user search

**Search results** (when search text is non-empty):
- Hashtag suggestions: Circle with "#" + tag name + post count
- User results: Avatar + username + display name

**Hashtag view** (when a hashtag is selected):
- Header: `#tagname` + "X posts"
- 3-column grid of matching posts
- Infinite scroll

**Explore grid** (default, no search):
- 3-column grid of popular posts (square thumbnails)
- Each cell shows like count overlay (bottom-left) and carousel icon (top-right) if applicable
- Tapping a cell opens the full post in a sheet
- Infinite scroll + pull-to-refresh

### 5. Post Detail (Comments)

**Layout**: Header + PostCard + Comments list + Comment input bar

**Header**: Gradient background, "Comments" title, back chevron

**Comments**:
- Single-level threading: top-level comments + indented replies
- Each comment: Avatar + username (bold) + body + timestamp + "Reply" button + like count + heart button
- Replies are indented (52px left padding), smaller avatar (26px vs 34px)
- OP badge: "[OP]" badge next to username if commenter is the post author
- @mention and #hashtag highlighting in comment bodies
- Context menu: Reply, Copy Text, Delete (own), Report (others)
- Comment likes: Small heart icon, toggleable

**Comment input bar**:
- Reply indicator (when replying to someone): "Replying to username" + X close
- Text field + "Post" button
- @mention autocomplete dropdown while typing

**Behavior**:
- POST `/posts/:postId/comments` with `{ body, parentId? }`
- Optimistic add to list, revert on error
- Update comment count in parent PostCard via event

### 6. Notifications (Activity Tab)

**Layout**: Two-tab toggle (You / Friends) + notification list

**"You" tab**:
- Grouped by time: Today, Yesterday, This Week, This Month, Earlier
- Section headers: Bold text, sticky
- Each row: Avatar(s) + inline attributed text + timestamp + right content (thumbnail or follow button)
- Coalesced likes: "user1 and user2 liked your photo" with stacked avatars
- Notification types:
  - **like**: "[username] liked your photo." + post thumbnail
  - **comment**: "[username] commented: [body preview]" + post thumbnail
  - **commentReply**: "[username] replied to your comment: [body]" + post thumbnail
  - **commentLike**: "[username] liked your comment: [body]" + post thumbnail
  - **mention**: "[username] mentioned you in a comment: [body]" + post thumbnail
  - **follow**: "[username] started following you." + Follow/Following button
- Unread notifications have a different background color
- Auto-mark all as read after 1.5s on the screen

**"Friends" tab**:
- Same layout but shows what people you follow are doing
- "[username] liked [target]'s photo." etc.

**Polling**: 3-second interval while on this screen

### 7. Profile

**Layout**: Scrollable page with header + tab strip + photo grid

**Profile header**:
- Avatar (72px) + stats row (posts | followers | following)
- Display name (bold)
- Bio (regular)
- Website (link color, tappable)
- Action buttons:
  - **Own profile**: "Edit Profile" button
  - **Other profile**: "Follow"/"Following" button + "Message" button + "..." menu (Block/Mute/Report)

**Tab strip**: Grid icon | Bookmark icon (own profile only)
- Active tab has a colored underline indicator

**Photo grid**: 3-column grid, 3:4 aspect ratio thumbnails
- Grid tab: User's posts (paginated)
- Saved tab: Bookmarked posts (own profile only)
- Carousel indicator on multi-image posts
- Tapping opens post detail

**Follow/Unfollow**: Optimistic UI update. Unfollow requires confirmation dialog.

**Block**: Confirmation alert → removes posts from feed → shows blocked state on profile

### 8. Edit Profile

**Layout**: Modal with header (Cancel / Edit Profile / Done)

**Fields**:
- Avatar with camera badge overlay → photo picker
- Username field with availability check (debounced 500ms, green checkmark / red X)
- Username changes remaining warning
- Name field
- Bio field
- Website field

**Username change**: Requires confirmation alert ("You have X changes remaining").

### 9. Direct Messages (Inbox)

**Layout**: Header ("Direct" in Georgia Italic) + conversation list

**Conversation row**:
- Blue unread dot (if unread) + Avatar (44px) + username + last message preview + timestamp
- Last message types: text, "Sent a photo", heart icon, "Voice message", "Shared a post"
- Swipe to delete conversation

**New message**: Search for users → create/open conversation

### 10. Chat View

**Layout**: Header + message list + input bar

**Header**:
- Username + "typing..." indicator or "here now" (green dot) presence
- Header gradient changes to purple tones when other user is present
- Purple glow shadow effect when present

**Messages**:
- Bubbles: Right-aligned (mine, blue gradient) and left-aligned (theirs, gray)
- Grouped by time (timestamp dividers when >5min gap)
- Tails on last message in sender group
- Message types: Text, Image (tappable to view full), Voice message (playable), Heart (big red heart icon), Shared post (thumbnail card)
- Reply-to preview above the replied message
- Reactions below bubbles (emoji badges)
- "Seen" / "Sent" indicator below last sent message
- Typing indicator: Three bouncing dots in a bubble

**Input bar**:
- Photo picker button (left)
- Text field (center) with presence glow border when other user is present
- When empty: Mic button (hold to record voice) + Heart button (send quick heart)
- When text entered: Send button (paper plane)

**Voice messages**: Hold mic button → slide left to cancel → release to send. Recording bar shows duration, wave animation, "Slide to cancel" hint.

**Reactions**: Long-press a message → emoji picker bar (8 quick emojis + "+" for full picker). Tapping same emoji removes reaction.

**Reply-to**: Swipe right on a message to reply → shows reply bar above input

**Polling**: Messages every 0.8s, Heartbeat (presence + typing) every 1.5s

### 11. Settings

**Sections**:
- **Appearance**: System / Light / Dark theme toggle
- **Notifications**: Push notification preferences
- **Blocked Accounts**: List of blocked users with unblock button
- **Legal**: Links to Terms, Privacy, Guidelines on infotograf.com
- **Account**: Delete account (with confirmation)
- Log Out button

### 12. Post Creation (Camera/Upload)

For web, this becomes a **file upload flow** (no native camera):

1. **Photo picker**: Click camera tab → opens file input or drag-and-drop. Support multiple images for carousel.
2. **Filter selection**: Show 9 filter thumbnails below the image. Tapping a filter applies it to the preview. Filters: Normal, Clarendon, Gingham, Moon, Lark, Reyes, Juno, Slumber, Ludwig, Aden
3. **Share screen**: Image preview + caption field (2200 char limit with counter ring) + location field + @mention autocomplete
4. POST as multipart form data → redirect to feed

**Filter implementations** (CSS or Canvas equivalents):
- **Clarendon**: Contrast +20%, shadow reduction
- **Gingham**: Sepia 20%, saturation 70%
- **Moon**: Grayscale + contrast +10%
- **Lark**: Brightness +8%, highlight boost
- **Reyes**: Sepia 30%, contrast 85%, saturation 70%
- **Juno**: Vibrance +50%, contrast +10%
- **Slumber**: Process effect, saturation 60%
- **Ludwig**: Saturation 85%, shadow reduction
- **Aden**: Saturation 70%, warm temperature shift

---

## Real-Time Patterns

The app uses **polling** (not WebSockets) for all real-time features:

### Unread Counts (Global)
- Poll TWO separate endpoints every 3 seconds while authenticated:
  - `GET /notifications/unread-count` → `{ count }` (notification badge)
  - `GET /conversations/unread-count` → `{ count }` (message badge)
- Drive badge counts on tab bar icons

### Feed
- No auto-polling. Pull-to-refresh only.
- "Where you left off" marker: Save the ID of the top post when leaving the feed. On return, show a "X new posts" divider above the last-seen post.

### Notifications
- Poll `GET /notifications` every 3 seconds while on the notifications screen
- Only update state if data actually changed (compare first item ID and count)

### Chat Messages
- Poll `GET /conversations/:id/messages` every 0.8 seconds while in a chat
- Smart diff: only update if messages changed (count, last ID, readAt, reactions)
- Preserve optimistic/failed messages during merge

### Chat Heartbeat
- POST `/conversations/:id/heartbeat` every 1.5 seconds while in a chat
- This simultaneously: registers your presence, and returns typing/presence status of the other user
- On leaving chat: DELETE `/conversations/:id/presence`

### Inbox
- Poll `GET /conversations` every 2 seconds while on inbox screen
- Deep comparison before updating (check IDs, unread counts, last messages)

---

## Image Handling

### Constructing Image URLs
The API returns image URLs that may be relative. Helper:
```javascript
function imageURL(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `https://noiscut-api-production.up.railway.app${path}`;
}
```

### Thumbnails
Posts may have a `thumbnailUrl` for grid views. Use `thumbnailUrl ?? imageUrl` for explore/profile grids.

### Avatar Fallback
When `avatarUrl` is null, show a default avatar (gray rounded rectangle with person icon).

### Image Upload
Use `multipart/form-data`:
- Avatar: field name `file`, single JPEG
- Post images: field name `images`, multiple JPEGs (max ~1080px dimension, 80% quality)
- Chat images: field name `image`, single JPEG
- Include text fields alongside file fields in the same form data

### Carousel
Posts with `imageUrls.length > 1` are carousels. Show:
- Swipeable image gallery with page indicator dots
- Carousel icon (stacked squares) in grid view overlay

---

## Audio Features

### Post Audio
Posts can have attached audio (ambient sounds or voice clips):
- `audioUrl`: URL to the audio file
- `audioType`: "ambient" or "voice"
- `audioDuration`: seconds (integer)

**Playback**:
- Single-tap on post image toggles audio playback
- While playing: glow border around image, badge with wave animation + countdown timer, progress bar at bottom
- Color coding:
  - Ambient: green (`#4caf50`)
  - Voice ≤15s: blue (`#5b9bd5`)
  - Voice >15s: orange (`#e67e22`)

### Voice Messages (DMs)
- Hold mic button to record (max 60s)
- Slide left to cancel
- Minimum 1 second to send
- Upload as `audio/mp4` (m4a file)
- Playback: Play/pause button + wave animation + duration badge

For web: Use the MediaRecorder API for recording and HTML5 Audio for playback.

---

## Text Parsing

Captions and comments support **@mentions** and **#hashtags**.

### Parser Rules
1. Scan text for `@` or `#` trigger characters
2. After `@`: consume `[a-zA-Z0-9_.]` chars → `@username` (tappable, navigates to profile)
3. After `#`: consume `[a-zA-Z0-9_]` chars → `#hashtag` (tappable, navigates to hashtag search in Explore)
4. Bare `@` or `#` with no valid chars after = plain text

### Rendering
- Username prefix: Bold, link color, tappable (navigates to profile)
- @mentions in body: Bold, link color, tappable
- #hashtags in body: Bold, link color, tappable
- Regular text: Normal weight, primary text color

### Caption Display
- Prepend username in bold before caption text
- Truncate at 3 lines with "more" button if >120 chars

---

## Key Behavioral Rules

### Optimistic Updates
All mutating actions use optimistic UI updates:
1. **Immediately** update local state (like/unlike, follow/unfollow, bookmark, comment, message send)
2. **Fire** the API request
3. **On error**: revert the local state change

This makes the app feel instant. Failed messages show "Failed · Tap to retry".

### Double-Tap Like
- Double-tapping a post image **only likes** (never unlikes). This matches Instagram behavior.
- Shows a large heart animation overlay (scale spring + fade out after 0.8s)
- Tapping the heart button in the action bar **toggles** like/unlike

### Feed "Where You Left Off"
- When leaving the feed, save the ID of the top visible post to localStorage
- On next feed load, if the saved ID exists in the loaded posts, show a "X new posts" divider above it
- Interacting with any post clears the marker

### Notification Coalescing
Multiple likes on the same post are coalesced: "user1 and 3 others liked your photo" with stacked avatars.

### Comment Threading
- Single level only: comments can have `parentId` pointing to a top-level comment
- Replies to replies still attach under the same root parent
- Replies are indented below their parent

### Heart Messages (DMs)
- Tapping the heart button in chat sends `[heart]` as the message body
- Display as a large red heart icon instead of text bubble
- Also detect legacy heart emoji characters (❤️ etc.)

### Shared Posts (DMs)
- Message body format: `[shared_post:postId]`
- Render as a thumbnail card linking to the post
- In inbox preview: "Shared a post"

### Block Behavior
- Blocked user's posts disappear from feed immediately
- Their profile shows a blocked state message
- They can't see your posts or profile
- Unblocking refreshes the feed

### Time Display
Use relative time strings:
- <60s: "Xs" (e.g., "3s")
- <60min: "Xm" (e.g., "15m")
- <24h: "Xh" (e.g., "2h")
- <7d: "Xd" (e.g., "3d")
- ≥7d: "Xw" (e.g., "2w")

For inbox: <60s shows as "now"

### Theme Management
- Three modes: System, Light, Dark
- Persist choice in localStorage
- System mode follows `prefers-color-scheme` media query
- iOS app defaults to dark mode; web should too

### Character Limits
- Caption: 2200 characters (show counter ring when >80% full)
- Username: 3-30 characters, only `[a-zA-Z0-9_.]`
- Bio: No explicit limit mentioned
- Password: Minimum 6 characters

---

## File Structure Suggestion

```
infotograf-website/
├── index.html              # Marketing landing page
├── privacy.html            # Privacy policy
├── support.html            # Support + FAQ
├── terms.html              # Terms of service
├── guidelines.html         # Community guidelines
├── css/style.css           # Marketing site styles
├── app/                    # Web app (React SPA)
│   ├── index.html          # SPA entry point
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   ├── client.ts       # API client (fetch wrapper + auth)
│   │   │   └── endpoints.ts    # Endpoint constants
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Post.ts
│   │   │   ├── Comment.ts
│   │   │   ├── Message.ts
│   │   │   ├── Conversation.ts
│   │   │   └── Notification.ts
│   │   ├── context/
│   │   │   ├── AuthContext.tsx
│   │   │   ├── AppStateContext.tsx
│   │   │   └── ThemeContext.tsx
│   │   ├── hooks/
│   │   │   ├── usePolling.ts
│   │   │   ├── usePagination.ts
│   │   │   └── useOptimistic.ts
│   │   ├── components/
│   │   │   ├── Avatar.tsx
│   │   │   ├── PostCard.tsx
│   │   │   ├── ImageCarousel.tsx
│   │   │   ├── HeaderBar.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── TimeAgo.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── TextEntityRenderer.tsx
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   ├── feed/
│   │   │   │   ├── FeedPage.tsx
│   │   │   │   └── FeedViewModel.ts
│   │   │   ├── explore/
│   │   │   │   ├── ExplorePage.tsx
│   │   │   │   └── ExploreViewModel.ts
│   │   │   ├── post/
│   │   │   │   ├── PostDetailModal.tsx
│   │   │   │   ├── CreatePostModal.tsx
│   │   │   │   └── FilterEngine.ts
│   │   │   ├── notifications/
│   │   │   │   ├── NotificationsPage.tsx
│   │   │   │   └── NotificationsViewModel.ts
│   │   │   ├── profile/
│   │   │   │   ├── ProfilePage.tsx
│   │   │   │   ├── EditProfileModal.tsx
│   │   │   │   └── SettingsModal.tsx
│   │   │   └── dms/
│   │   │       ├── InboxModal.tsx
│   │   │       ├── ChatModal.tsx
│   │   │       └── ChatViewModel.ts
│   │   └── styles/
│   │       ├── tokens.css      # Design tokens
│   │       ├── global.css      # Reset + base styles
│   │       └── components/     # Component CSS modules
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── vercel.json
└── WEBAPP-SPEC.md          # This file
```

### Vercel Configuration

Update `vercel.json` to serve both the marketing site and the web app:

```json
{
  "cleanUrls": true,
  "rewrites": [
    { "source": "/app/(.*)", "destination": "/app/index.html" }
  ],
  "headers": [
    {
      "source": "/app/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache" }
      ]
    }
  ]
}
```

---

## Summary

This spec covers every screen, API endpoint, data model, interaction pattern, design token, and behavioral rule in the Infotograf iOS app. The web app should replicate this experience as closely as possible, with these adaptations:

1. **Camera** → File upload picker (no native camera needed)
2. **Haptic feedback** → Skip (web has no equivalent)
3. **Push notifications** → Skip for v1 (can add web push later)
4. **Sign in with Apple** → Skip for v1
5. **Sheets/modals** → Use overlay routes or modal portals
6. **Pull-to-refresh** → Standard scroll + refresh button or pull-to-refresh library
7. **Swipe actions** → Right-click context menu or hover actions
8. **Voice recording** → MediaRecorder API
9. **Audio playback** → HTML5 Audio element

The goal is a fully functional web experience that feels like the same app — same visual identity, same features, same API, same data.
