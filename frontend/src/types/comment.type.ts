export type CommentAuthor = {
  id: string;
  username: string | null;
  avatar: string | null;
};

export type ITokenComment = {
  id: string;
  tokenId: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
  canDelete: boolean;
};

export type ITokenCommentList = {
  items: ITokenComment[];
  nextCursor: string | null;
};
