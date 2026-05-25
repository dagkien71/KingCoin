export type SquareAuthor = {
  id: string;
  username: string | null;
  avatar: string | null;
};

export type SquareReactionSummary = {
  emoji: string;
  count: number;
};

export type SquarePollOption = {
  id: string;
  label: string;
  voteCount: number;
};

export type SquarePoll = {
  id: string;
  multipleChoice: boolean;
  endsAt: string | null;
  options: SquarePollOption[];
  totalVotes: number;
  viewerOptionId: string | null;
};

export type SquarePostEmbed = {
  orderId?: string;
  positionId?: string;
  tokenId?: string;
  symbol?: string;
  type?: string;
  side?: string;
  price?: number;
  quantity?: number;
  matchedQuantity?: number;
  openQuantity?: number;
  pair?: string;
  status?: string;
  size?: number;
  entryPrice?: number;
  leverage?: number;
  marginKc?: number;
  markPrice?: number;
  unrealizedPnlKc?: number;
  roiPercent?: number;
  sharedAt?: string;
};

export type SquareComment = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  author: SquareAuthor;
  canDelete: boolean;
};

export type SquareCommentList = {
  items: SquareComment[];
  nextCursor: string | null;
};

export type SquarePost = {
  id: string;
  body: string;
  kind: string;
  embed: SquarePostEmbed | null;
  imageUrls: string[];
  createdAt: string;
  author: SquareAuthor;
  canDelete: boolean;
  commentCount: number;
  poll: SquarePoll | null;
  reactions: SquareReactionSummary[];
  viewerReaction: string | null;
};

export type SquareFeed = {
  items: SquarePost[];
  nextCursor: string | null;
};

export type SquarePublicProfile = {
  id: string;
  username: string | null;
  avatar: string | null;
  introduction: string | null;
  socialLinks: string[];
  postCount: number;
};

export type SquareConversationItem = {
  id: string;
  otherUser: SquareAuthor;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

export type SquareMessage = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  isMine: boolean;
};

export type SquareMessageList = {
  items: SquareMessage[];
  nextCursor: string | null;
};

export const SQUARE_REACTIONS = [
  { emoji: "like", label: "Thích" },
  { emoji: "fire", label: "🔥" },
  { emoji: "bull", label: "Bull" },
  { emoji: "bear", label: "Bear" },
  { emoji: "rocket", label: "🚀" },
  { emoji: "eyes", label: "👀" },
] as const;
