export type SquareAuthorDto = {
  id: string;
  username: string | null;
  avatar: string | null;
};

export type SquareEmbedDto = Record<string, unknown>;

export type SquarePollOptionDto = {
  id: string;
  label: string;
  voteCount: number;
};

export type SquarePollDto = {
  id: string;
  multipleChoice: boolean;
  endsAt: string | null;
  options: SquarePollOptionDto[];
  totalVotes: number;
  viewerOptionId: string | null;
};

export type SquareReactionSummaryDto = {
  emoji: string;
  count: number;
};

export type SquareCommentItemDto = {
  id: string;
  postId: string;
  body: string;
  createdAt: string;
  author: SquareAuthorDto;
  canDelete: boolean;
};

export type SquareCommentListDto = {
  items: SquareCommentItemDto[];
  nextCursor: string | null;
};

export type SquarePostItemDto = {
  id: string;
  body: string;
  kind: string;
  embed: SquareEmbedDto | null;
  imageUrls: string[];
  createdAt: string;
  author: SquareAuthorDto;
  canDelete: boolean;
  commentCount: number;
  poll: SquarePollDto | null;
  reactions: SquareReactionSummaryDto[];
  viewerReaction: string | null;
};

export type SquareFeedDto = {
  items: SquarePostItemDto[];
  nextCursor: string | null;
};

export type SquarePublicProfileDto = {
  id: string;
  username: string | null;
  avatar: string | null;
  introduction: string | null;
  socialLinks: string[];
  postCount: number;
};

export type SquareConversationItemDto = {
  id: string;
  otherUser: SquareAuthorDto;
  lastMessagePreview: string | null;
  lastMessageAt: string;
  unreadCount: number;
};

export type SquareMessageItemDto = {
  id: string;
  senderId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  isMine: boolean;
};

export type SquareMessageListDto = {
  items: SquareMessageItemDto[];
  nextCursor: string | null;
};
