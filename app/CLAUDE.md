# Noiscut

Vintage Instagram clone (2012–2015 era). Native iOS app. SwiftUI + UIKit.

We cut the noise. No algorithm, no reels, no shopping. Just photos, filters, and a chronological feed.

## Architecture

- MVVM + Repository pattern
- SwiftUI for views, UIKit wrapped via UIViewRepresentable for camera and Core Image filters
- URLSession + async/await for all networking (NOT Combine)
- Core Image (CIFilter) for photo filters
- URLSessionWebSocketTask for real-time DMs
- Keychain for token storage
- @MainActor ObservableObject ViewModels with @Published properties

## Design language — FOLLOW EXACTLY

This app looks like Instagram from 2012–2014. Skeuomorphic, not flat. Every screen must match these specs:

### Header bar
- Height: 44pt
- Background: LinearGradient from #5c7ea3 to #3b5e8a (blue gradient)
- 1px bottom border: #2a4a6e
- Center: "Noiscut" in Georgia italic, 21pt, white, slight shadow
- Left/right: white SF Symbol icons
- DO NOT use system NavigationBar or NavigationStack appearance

### Tab bar
- Background: LinearGradient from #393939 to #1a1a1a (dark chrome)
- 1px top border: #555555
- 5 tabs with LABELS underneath icons:
  1. Feed (house.fill) — "Feed"
  2. Popular (star.fill) — "Popular"  
  3. Photo (camera.fill) — "Photo"
  4. News (heart.fill) — "News"
  5. Profile (person.fill) — "Profile"
- Inactive: white 50% opacity icons, 45% opacity labels (9pt)
- Active: white 100% opacity icons, 90% opacity labels, subtle white bg highlight (10% opacity, 4pt corner radius)
- DO NOT use system TabView

### Colors
- Background: #efedee (off-white, NOT pure white)
- Post cards: white with 1px #d4d4d4 borders
- Usernames: #3b6994 (blue, bold)
- Body text: #333333
- Secondary text: #999999
- Timestamps: #bbbbbb
- Separators inside cards: #eeeeee
- Like button active: #ed4956 (red)
- Follow button: gradient #5c9dd5 → #3b7dc0, border #2a6aaa
- "Following" button: gradient #f5f5f5 → #e5e5e5, border #cccccc

### Avatars
- SQUARE with 4px cornerRadius — NEVER circles
- 1px #cccccc border
- Sizes: 30pt in feed headers, 34pt in notifications, 44pt in DMs, 72pt on profile

### Post cards
- White background
- 1px #d4d4d4 top and bottom borders
- Header: square avatar + blue username + gray location underneath, 1px #eeeeee bottom border
- Square image (1:1 aspect ratio)
- Action bar: heart, comment, spacer, bookmark. 1px #eeeeee top border
- Like count with small red heart inline
- Caption: blue bold username + regular text
- "View all X comments" in gray
- Timestamp: uppercase, gray, small

### Buttons (vintage style)
- Login/Follow: blue gradient with 1px darker border, white bold text, 3px cornerRadius
- Edit Profile: full width, gradient #ffffff → #f0f0f0, 1px #d4d4d4 border, 4px cornerRadius, dark bold text
- All buttons: 44pt touch target minimum

### Typography
- Logo: Georgia, italic
- Usernames: system font, bold, 12-13pt
- Body: system font, regular, 12pt
- Timestamps: system font, 10pt, uppercase
- Tab labels: system font, 9pt

## Critical rules

- NO system NavigationBar — always custom HeaderBarView
- NO system TabView — always custom TabBarView  
- NO NavigationStack or NavigationView for primary navigation — manual view switching
- NO circle avatars — always RoundedRectangle(cornerRadius: 4)
- NO pure white backgrounds — always #efedee
- NO modern iOS flat design — this is skeuomorphic with gradients on chrome elements
- ALL networking: async/await with URLSession, never Combine
- ALL ViewModels: @MainActor class, ObservableObject, @Published properties
- ALL models: Codable + Identifiable
- Group files by feature in folders: Feed/, Camera/, Profile/, etc.
- Optimistic UI updates for likes and follows (toggle immediately, revert on error)

## Backend

- Base URL: http://localhost:3000/api (dev)
- Auth: JWT with access token (15min) + refresh token (7d)
- Access token sent as: Authorization: Bearer <token>
- On 401: auto-refresh via POST /auth/refresh, retry once
- All lists use cursor-based pagination: ?cursor=<ISO8601date>&limit=20
- Responses: { posts: [...], nextCursor: "..." } or { comments: [...], nextCursor: "..." }
- Image upload: multipart/form-data to POST /posts

### API routes
```
POST   /auth/register         { username, email, password, displayName? }
POST   /auth/login            { login, password }
POST   /auth/refresh          { refreshToken }

GET    /users/:username        
PATCH  /users/me              { displayName?, bio?, website? }
GET    /users/search?q=       

POST   /follows/:userId       
DELETE /follows/:userId       

POST   /posts                  multipart: image + caption + filterName
GET    /posts/:id             
DELETE /posts/:id             
GET    /posts/user/:userId?cursor=&limit=

GET    /feed?cursor=&limit=   
GET    /explore?cursor=&limit=

POST   /posts/:id/like        
DELETE /posts/:id/like        
GET    /posts/:id/comments?cursor=
POST   /posts/:id/comments    { body }
DELETE /comments/:id          

GET    /conversations         
POST   /conversations         { userId }
GET    /conversations/:id/messages?cursor=
POST   /conversations/:id/messages  { body?, imageUrl? }

GET    /notifications         
POST   /notifications/read    

WS     /ws                     (send auth token as first message)
```

## Filter engine — Core Image mapping

| Filter | CIFilter chain |
|---|---|
| Normal | No filter |
| Clarendon | CIColorControls (contrast 1.2) → CIHighlightShadowAdjust |
| Gingham | CISepiaTone (intensity 0.2) → CIColorControls (saturation 0.7) |
| Moon | CIPhotoEffectMono → CIColorControls (contrast 1.1) |
| Lark | CIColorControls (brightness 0.1) → CIHighlightShadowAdjust |
| Reyes | CISepiaTone (0.3) → CIColorControls (contrast 0.85, saturation 0.7) |
| Juno | CIVibrance (amount 0.5) → CIColorControls (contrast 1.1) |
| Slumber | CIPhotoEffectProcess → CIColorControls (saturation 0.6) |
| Ludwig | CIColorControls (saturation 0.85) → CIHighlightShadowAdjust |
| Aden | CIColorControls (saturation 0.7) → CITemperatureAndTint (warm) |

## Key interactions

- Double-tap on photo: toggle like + large white heart animation (scale up + fade out, 0.8s) + haptic (UIImpactFeedbackGenerator medium)
- Pull to refresh on all list screens
- "You're all caught up" divider after loading all feed posts
- Cursor-based infinite scroll on feed, explore, comments, notifications, DMs
- Real-time message delivery via WebSocket in chat

## Build phases

1. Foundation: folder structure, tab bar, header, networking, models, auth
2. Core loop: camera + filters, feed with post cards
3. Social: profiles, follow system, explore, search
4. Engagement: likes, comments, notifications
5. DMs: inbox, chat with WebSocket
6. Polish: loading skeletons, empty states, error handling, haptics, app icon
