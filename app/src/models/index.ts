export interface User {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  website?: string;
  isPrivate: boolean;
  createdAt: string;
  postCount: number | string | null;
  followerCount: number | string | null;
  followingCount: number | string | null;
  usernameChangesLeft?: number;
  isFollowing: boolean;
  isBlocked: boolean;
  isMuted: boolean;
}

export interface PostImage {
  imageUrl: string;
  thumbnailUrl?: string;
  filterName?: string;
}

export interface Post {
  id: string;
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  imageUrls?: PostImage[];
  filterName?: string;
  caption?: string;
  locationName?: string;
  likeCount: number | string | null;
  commentCount: number | string | null;
  isLiked?: boolean;
  isBookmarked?: boolean;
  audioUrl?: string;
  audioType?: string;
  audioDuration?: number;
  commentsDisabled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Comment {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  parentId?: string;
  body: string;
  createdAt: string;
  likeCount: number | string | null;
  isLiked?: boolean;
}

export interface MessageReaction {
  userId: string;
  emoji: string;
}

export interface ReplyPreview {
  id: string;
  senderId?: string;
  body?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface Message {
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
  sendStatus?: 'sending' | 'sent' | 'failed';
}

export interface LastMessage {
  id: string;
  senderId?: string;
  body?: string;
  imageUrl?: string;
  audioUrl?: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  members: User[];
  lastMessage?: LastMessage;
  unreadCount?: number;
  updatedAt: string;
}

export interface CoalescedActor {
  actorId?: string;
  actorUsername?: string;
  actorAvatarUrl?: string;
}

export interface AppNotification {
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
  coalescedActors?: CoalescedActor[];
  coalescedCount?: number;
  targetUsername?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface HashtagSuggestion {
  name: string;
  postCount: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
}
