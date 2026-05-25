export const SQUARE_VISIBLE = 'visible';
export const SQUARE_DELETED = 'deleted';
export const SQUARE_HIDDEN = 'hidden';

export const SQUARE_POST_KIND = {
  text: 'text',
  orderSpot: 'order_spot',
  orderFutures: 'order_futures',
  poll: 'poll',
} as const;

export type SquarePostKind =
  (typeof SQUARE_POST_KIND)[keyof typeof SQUARE_POST_KIND];

export const SQUARE_REACTIONS = [
  'like',
  'fire',
  'bull',
  'bear',
  'rocket',
  'eyes',
] as const;

export type SquareReactionEmoji = (typeof SQUARE_REACTIONS)[number];

export const SQUARE_FEED_CHANNEL = 'square:feed';

export function squareConvChannel(conversationId: string): string {
  return `square:conv:${conversationId}`;
}

export const MIN_POST_GAP_MS = 2000;
export const MIN_COMMENT_GAP_MS = 2000;
export const DEFAULT_COMMENT_LIMIT = 20;
export const MAX_COMMENT_LIMIT = 50;
export const DEFAULT_FEED_LIMIT = 20;
export const MAX_FEED_LIMIT = 50;
export const MAX_BODY_LEN = 2000;
export const MAX_POST_IMAGES = 4;
export const MAX_POLL_OPTIONS = 4;
export const MIN_POLL_OPTIONS = 2;
