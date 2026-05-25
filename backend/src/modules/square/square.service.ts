import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationService } from '@modules/notification/notification.service';
import { OrderRepository } from '@modules/order/order.repository';
import { RealtimeService } from '@modules/realtime/realtime.service';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { UserRepository } from '@modules/user/user.repository';
import { FuturesEngineService } from '@modules/futures/futures-engine.service';
import { unrealizedPnlKc } from '@modules/futures/futures-math.util';
import { MarkPriceService } from '@modules/futures/mark-price.service';
import {
  FuturesPositionStatus,
  FuturesSide,
  NotificationType,
  OrderStatus,
  Prisma,
  Roles,
  User,
} from '@prisma/client';
import { CreateSquareCommentDto } from './dto/create-square-comment.dto';
import { CreateSquarePostDto } from './dto/create-square-post.dto';
import { SendSquareMessageDto } from './dto/send-square-message.dto';
import { SquareRepository } from './square.repository';
import {
  DEFAULT_COMMENT_LIMIT,
  DEFAULT_FEED_LIMIT,
  MAX_BODY_LEN,
  MAX_COMMENT_LIMIT,
  MAX_FEED_LIMIT,
  MAX_POST_IMAGES,
  MAX_POLL_OPTIONS,
  MIN_COMMENT_GAP_MS,
  MIN_POST_GAP_MS,
  MIN_POLL_OPTIONS,
  SQUARE_DELETED,
  SQUARE_FEED_CHANNEL,
  SQUARE_POST_KIND,
  SQUARE_REACTIONS,
  SQUARE_VISIBLE,
  squareConvChannel,
} from './square.constants';
import type {
  SquareAuthorDto,
  SquareCommentItemDto,
  SquareCommentListDto,
  SquareConversationItemDto,
  SquareFeedDto,
  SquareMessageListDto,
  SquarePostItemDto,
  SquarePublicProfileDto,
} from './square.types';

const authorSelect = {
  id: true,
  username: true,
  avatar: true,
} as const;

type PostWithAuthor = Prisma.SquarePostGetPayload<{
  include: { author: { select: typeof authorSelect } };
}>;

type CommentWithUser = Prisma.SquareCommentGetPayload<{
  include: { user: { select: typeof authorSelect } };
}>;

@Injectable()
export class SquareService {
  constructor(
    private readonly repo: SquareRepository,
    private readonly userRepository: UserRepository,
    private readonly orderRepository: OrderRepository,
    private readonly tokenService: TokenCryptoService,
    private readonly futuresEngine: FuturesEngineService,
    private readonly markPrice: MarkPriceService,
    private readonly notificationService: NotificationService,
    private readonly realtime: RealtimeService,
  ) {}

  /** Bổ sung PnL/ROI theo giá hiện tại — embed DB có thể thiếu (bài cũ). */
  private async augmentOrderEmbed(
    kind: string,
    embedRaw: Record<string, unknown> | null,
  ): Promise<Record<string, unknown> | null> {
    if (!embedRaw) return null;
    const embed = { ...embedRaw };

    if (kind === SQUARE_POST_KIND.orderFutures) {
      const tokenId = String(embed.tokenId ?? '');
      const entry = Number(embed.entryPrice);
      const size = Number(embed.size);
      const marginKc = Number(embed.marginKc);
      const side = embed.side as FuturesSide;
      if (
        !tokenId ||
        !Number.isFinite(entry) ||
        !Number.isFinite(size) ||
        !marginKc
      ) {
        return embed;
      }
      const mark = await this.markPrice.getMarkPrice(tokenId);
      const uPnl = unrealizedPnlKc(side, size, entry, mark);
      embed.markPrice = mark;
      embed.unrealizedPnlKc = Number(uPnl.toFixed(8));
      embed.roiPercent =
        marginKc > 0
          ? Number(((uPnl / marginKc) * 100).toFixed(2))
          : 0;
      return embed;
    }

    if (kind === SQUARE_POST_KIND.orderSpot) {
      const tokenId = String(embed.tokenId ?? '');
      const price = Number(embed.price);
      const openQty = Number(
        embed.openQuantity ?? embed.quantity ?? 0,
      );
      const isBuy = String(embed.type).toLowerCase() === 'buy';
      if (!tokenId || !Number.isFinite(price) || openQty <= 0) {
        return embed;
      }
      const token = await this.tokenService.findById(tokenId);
      const mark =
        token?.price && token.price > 0
          ? token.price
          : await this.markPrice.getMarkPrice(tokenId);
      const uPnl = isBuy
        ? (mark - price) * openQty
        : (price - mark) * openQty;
      const costKc = price * openQty;
      embed.markPrice = mark;
      embed.unrealizedPnlKc = Number(uPnl.toFixed(8));
      embed.roiPercent =
        costKc > 0 ? Number(((uPnl / costKc) * 100).toFixed(2)) : 0;
      return embed;
    }

    return embed;
  }

  private sanitizeBody(body: string): string {
    return body.replace(/<[^>]*>/g, '').trim();
  }

  private normalizeImageUrls(urls?: string[]): string[] {
    if (!urls?.length) return [];
    const out: string[] = [];
    for (const raw of urls) {
      const u = raw?.trim();
      if (!u) continue;
      try {
        const parsed = new URL(u);
        if (!['http:', 'https:'].includes(parsed.protocol)) continue;
        out.push(u);
      } catch {
        /* skip invalid */
      }
      if (out.length >= MAX_POST_IMAGES) break;
    }
    return out;
  }

  private toAuthor(user: {
    id: string;
    username: string | null;
    avatar: string | null;
  }): SquareAuthorDto {
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    };
  }

  private buildCursorFilter(
    cursorRaw?: string,
  ): Prisma.SquarePostWhereInput | undefined {
    const cursor = cursorRaw?.trim();
    if (!cursor) return undefined;
    const [iso, id] = cursor.split('|');
    const cursorDate = iso ? new Date(iso) : null;
    if (!cursorDate || Number.isNaN(cursorDate.getTime()) || !id) {
      return undefined;
    }
    return {
      OR: [
        { createdAt: { lt: cursorDate } },
        { createdAt: cursorDate, id: { lt: id } },
      ],
    };
  }

  private async enrichPosts(
    rows: PostWithAuthor[],
    viewer?: User | null,
  ): Promise<SquarePostItemDto[]> {
    const postIds = rows.map((r) => r.id);
    const [grouped, viewerReactions, commentCounts] = await Promise.all([
      this.repo.groupReactions(postIds),
      viewer?.id
        ? this.repo.findViewerReactions(postIds, viewer.id)
        : Promise.resolve([]),
      this.repo.countCommentsByPostIds(postIds),
    ]);

    const commentCountMap = new Map(
      commentCounts.map((c) => [c.postId, c._count._all]),
    );

    const reactionMap = new Map<
      string,
      { emoji: string; count: number }[]
    >();
    for (const g of grouped) {
      const list = reactionMap.get(g.postId) ?? [];
      list.push({ emoji: g.emoji, count: g._count.emoji });
      reactionMap.set(g.postId, list);
    }

    const viewerMap = new Map(
      viewerReactions.map((r) => [r.postId, r.emoji]),
    );

    return Promise.all(
      rows.map(async (row) => {
        let pollDto: SquarePostItemDto['poll'] = null;
        if (row.kind === SQUARE_POST_KIND.poll) {
          const poll = await this.repo.findPollByPostId(row.id);
          if (poll) {
            const voteCounts = new Map<string, number>();
            for (const v of poll.votes) {
              voteCounts.set(
                v.optionId,
                (voteCounts.get(v.optionId) ?? 0) + 1,
              );
            }
            const viewerVote = viewer?.id
              ? poll.votes.find((v) => String(v.userId) === String(viewer.id))
              : undefined;
            pollDto = {
              id: poll.id,
              multipleChoice: poll.multipleChoice,
              endsAt: poll.endsAt?.toISOString() ?? null,
              options: poll.options.map((o) => ({
                id: o.id,
                label: o.label,
                voteCount: voteCounts.get(o.id) ?? 0,
              })),
              totalVotes: poll.votes.length,
              viewerOptionId: viewerVote?.optionId ?? null,
            };
          }
        }

        const isOwner =
          viewer?.id != null && String(row.authorId) === String(viewer.id);
        const isAdmin = viewer?.role === Roles.admin;

        const rawEmbed = (row.embed as Record<string, unknown> | null) ?? null;
        const embed =
          rawEmbed &&
          (row.kind === SQUARE_POST_KIND.orderSpot ||
            row.kind === SQUARE_POST_KIND.orderFutures)
            ? await this.augmentOrderEmbed(row.kind, rawEmbed)
            : rawEmbed;

        return {
          id: row.id,
          body: row.body,
          kind: row.kind,
          embed,
          imageUrls: row.imageUrls ?? [],
          createdAt: row.createdAt.toISOString(),
          author: this.toAuthor(row.author),
          canDelete: isOwner || isAdmin,
          commentCount: commentCountMap.get(row.id) ?? 0,
          poll: pollDto,
          reactions: reactionMap.get(row.id) ?? [],
          viewerReaction: viewerMap.get(row.id) ?? null,
        };
      }),
    );
  }

  private buildCommentCursorFilter(
    cursorRaw?: string,
  ): Prisma.SquareCommentWhereInput | undefined {
    const cursor = cursorRaw?.trim();
    if (!cursor) return undefined;
    const [iso, id] = cursor.split('|');
    const cursorDate = iso ? new Date(iso) : null;
    if (!cursorDate || Number.isNaN(cursorDate.getTime()) || !id) {
      return undefined;
    }
    return {
      OR: [
        { createdAt: { lt: cursorDate } },
        { createdAt: cursorDate, id: { lt: id } },
      ],
    };
  }

  private toCommentItem(
    row: CommentWithUser,
    viewer?: User | null,
  ): SquareCommentItemDto {
    const isOwner =
      viewer?.id != null && String(row.userId) === String(viewer.id);
    const isAdmin = viewer?.role === Roles.admin;
    return {
      id: row.id,
      postId: row.postId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: this.toAuthor(row.user),
      canDelete: isOwner || isAdmin,
    };
  }

  async listComments(
    postId: string,
    options?: { limit?: number; cursor?: string },
    viewer?: User | null,
  ): Promise<SquareCommentListDto> {
    const post = await this.repo.findPostById(postId);
    if (!post || post.status !== SQUARE_VISIBLE) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const limit = Math.min(
      MAX_COMMENT_LIMIT,
      Math.max(1, options?.limit ?? DEFAULT_COMMENT_LIMIT),
    );
    const rows = (await this.repo.findComments({
      where: {
        postId,
        status: SQUARE_VISIBLE,
        ...(this.buildCommentCursorFilter(options?.cursor) ?? {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { user: { select: authorSelect } },
    })) as CommentWithUser[];

    let items = rows;
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      items = rows.slice(0, limit);
      const last = items[items.length - 1];
      nextCursor = `${last.createdAt.toISOString()}|${last.id}`;
    }

    return {
      items: items.map((r) => this.toCommentItem(r, viewer)),
      nextCursor,
    };
  }

  async createComment(
    postId: string,
    userId: string,
    dto: CreateSquareCommentDto,
  ): Promise<SquareCommentItemDto> {
    const body = this.sanitizeBody(dto.body);
    if (!body) {
      throw new BadRequestException('Nội dung bình luận không được để trống');
    }

    const post = await this.repo.findPostById(postId);
    if (!post || post.status !== SQUARE_VISIBLE) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const recent = await this.repo.findComments({
      where: { userId, postId, status: SQUARE_VISIBLE },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    if (recent[0]) {
      const elapsed = Date.now() - recent[0].createdAt.getTime();
      if (elapsed < MIN_COMMENT_GAP_MS) {
        throw new BadRequestException(
          'Vui lòng đợi vài giây trước khi gửi tiếp',
        );
      }
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const created = await this.repo.createComment({
      body,
      post: { connect: { id: postId } },
      user: { connect: { id: userId } },
    });

    const counts = await this.repo.countCommentsByPostIds([postId]);
    const commentCount = counts[0]?._count._all ?? 0;

    const item = this.toCommentItem(
      {
        ...created,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
      } as CommentWithUser,
      user,
    );

    this.realtime.emitSquareFeed('square:comment_created', {
      postId,
      comment: item,
      commentCount,
    });

    return item;
  }

  async removeComment(commentId: string, user: User): Promise<{ ok: true }> {
    if (!user?.id) {
      throw new ForbiddenException('Không có quyền xóa bình luận này');
    }

    const row = await this.repo.findCommentById(commentId);
    if (!row || row.status === SQUARE_DELETED) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }

    const isOwner = String(row.userId) === String(user.id);
    const isAdmin = user.role === Roles.admin;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Không có quyền xóa bình luận này');
    }

    await this.repo.updateComment(commentId, { status: SQUARE_DELETED });

    const counts = await this.repo.countCommentsByPostIds([row.postId]);
    const commentCount = counts[0]?._count._all ?? 0;

    this.realtime.emitSquareFeed('square:comment_deleted', {
      postId: row.postId,
      commentId,
      commentCount,
    });

    return { ok: true };
  }

  async getFeed(
    options: { limit?: number; cursor?: string },
    viewer?: User | null,
  ): Promise<SquareFeedDto> {
    const limit = Math.min(
      MAX_FEED_LIMIT,
      Math.max(1, options.limit ?? DEFAULT_FEED_LIMIT),
    );
    const rows = (await this.repo.findPosts({
      where: {
        status: SQUARE_VISIBLE,
        ...(this.buildCursorFilter(options.cursor) ?? {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { author: { select: authorSelect } },
    })) as PostWithAuthor[];

    let items = rows;
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      items = rows.slice(0, limit);
      const last = items[items.length - 1];
      nextCursor = `${last.createdAt.toISOString()}|${last.id}`;
    }

    return {
      items: await this.enrichPosts(items, viewer),
      nextCursor,
    };
  }

  private async assertRateLimit(userId: string): Promise<void> {
    const recent = await this.repo.findPosts({
      where: { authorId: userId, status: SQUARE_VISIBLE },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    if (recent[0]) {
      const elapsed = Date.now() - recent[0].createdAt.getTime();
      if (elapsed < MIN_POST_GAP_MS) {
        throw new BadRequestException(
          'Vui lòng đợi vài giây trước khi đăng tiếp',
        );
      }
    }
  }

  private async buildSpotEmbed(
    userId: string,
    orderId: string,
  ): Promise<Record<string, unknown>> {
    const order = await this.orderRepository.findById(orderId);
    if (!order || String(order.userId) !== String(userId)) {
      throw new NotFoundException('Không tìm thấy lệnh');
    }
    if (order.status !== OrderStatus.pending) {
      throw new BadRequestException(
        'Chỉ chia sẻ lệnh spot đang chờ khớp (pending)',
      );
    }
    const token = await this.tokenService.findById(order.tokenId);
    if (!token || token.tokenKind === 'stablecoin' || token.symbol === 'KC') {
      throw new BadRequestException('Không chia sẻ lệnh trên KC');
    }
    const openQty = order.quantity - (order.matchedQuantity ?? 0);
    const mark = token.price > 0 ? token.price : 0;
    const isBuy = String(order.type).toLowerCase() === 'buy';
    let unrealizedPnlKc = 0;
    if (mark > 0 && openQty > 0) {
      unrealizedPnlKc = isBuy
        ? (mark - order.price) * openQty
        : (order.price - mark) * openQty;
    }
    const costKc = order.price * openQty;
    const roiPercent =
      costKc > 0
        ? Number(((unrealizedPnlKc / costKc) * 100).toFixed(2))
        : 0;

    return {
      orderId: order.id,
      tokenId: order.tokenId,
      symbol: token.symbol ?? token.name,
      type: order.type,
      price: order.price,
      quantity: order.quantity,
      matchedQuantity: order.matchedQuantity ?? 0,
      openQuantity: openQty,
      pair: order.pair,
      status: order.status,
      markPrice: mark,
      unrealizedPnlKc: Number(unrealizedPnlKc.toFixed(8)),
      roiPercent,
      sharedAt: new Date().toISOString(),
    };
  }

  private async buildFuturesEmbed(
    userId: string,
    positionId: string,
  ): Promise<Record<string, unknown>> {
    const positions = await this.futuresEngine.listOpenPositions(userId);
    const pos = positions.find((p) => String(p.id) === String(positionId));
    if (!pos) {
      throw new NotFoundException('Không tìm thấy vị thế futures đang mở');
    }
    const token = await this.tokenService.findById(pos.tokenId);
    const roiPercent =
      pos.marginKc > 0
        ? Number(((pos.unrealizedPnlKc / pos.marginKc) * 100).toFixed(2))
        : 0;
    return {
      positionId: pos.id,
      tokenId: pos.tokenId,
      symbol: token?.symbol ?? token?.name ?? pos.tokenId,
      side: pos.side,
      size: pos.size,
      entryPrice: pos.entryPrice,
      leverage: pos.leverage,
      marginKc: pos.marginKc,
      markPrice: pos.markPrice,
      unrealizedPnlKc: Number(pos.unrealizedPnlKc.toFixed(8)),
      roiPercent,
      status: FuturesPositionStatus.open,
      sharedAt: new Date().toISOString(),
    };
  }

  async createPost(
    userId: string,
    dto: CreateSquarePostDto,
  ): Promise<SquarePostItemDto> {
    await this.assertRateLimit(userId);

    const kind = dto.kind ?? SQUARE_POST_KIND.text;
    let body = this.sanitizeBody(dto.body ?? '');
    let embed: Record<string, unknown> | null = null;
    const imageUrls =
      kind === SQUARE_POST_KIND.poll
        ? []
        : this.normalizeImageUrls(dto.imageUrls);

    if (kind === SQUARE_POST_KIND.orderSpot) {
      if (!dto.orderId) {
        throw new BadRequestException('Thiếu orderId');
      }
      embed = await this.buildSpotEmbed(userId, dto.orderId);
      if (!body) {
        body = `Chia sẻ lệnh ${embed.symbol} ${embed.type}`;
      }
    } else if (kind === SQUARE_POST_KIND.orderFutures) {
      if (!dto.positionId) {
        throw new BadRequestException('Thiếu positionId');
      }
      embed = await this.buildFuturesEmbed(userId, dto.positionId);
      if (!body) {
        body = `Chia sẻ vị thế ${embed.symbol} ${embed.side}`;
      }
    } else if (kind === SQUARE_POST_KIND.poll) {
      const opts = (dto.pollOptions ?? [])
        .map((o) => this.sanitizeBody(o))
        .filter(Boolean);
      if (opts.length < MIN_POLL_OPTIONS || opts.length > MAX_POLL_OPTIONS) {
        throw new BadRequestException(
          `Poll cần ${MIN_POLL_OPTIONS}–${MAX_POLL_OPTIONS} lựa chọn`,
        );
      }
      if (!body) {
        throw new BadRequestException('Poll cần nội dung câu hỏi');
      }
    } else if (!body && imageUrls.length === 0) {
      throw new BadRequestException(
        'Bài viết cần nội dung chữ hoặc ít nhất một ảnh',
      );
    }

    if (body.length > MAX_BODY_LEN) {
      throw new BadRequestException(`Tối đa ${MAX_BODY_LEN} ký tự`);
    }

    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundException('Không tìm thấy người dùng');

    const created = await this.repo.createPost({
      body,
      kind,
      imageUrls,
      embed: embed ? (embed as Prisma.InputJsonValue) : undefined,
      author: { connect: { id: userId } },
    });

    if (kind === SQUARE_POST_KIND.poll && dto.pollOptions) {
      const opts = dto.pollOptions
        .map((o) => this.sanitizeBody(o))
        .filter(Boolean);
      await this.repo.createPollWithOptions(
        created.id,
        opts,
        Boolean(dto.multipleChoice),
      );
    }

    const row = (await this.repo.findPosts({
      where: { id: created.id },
      take: 1,
      include: { author: { select: authorSelect } },
    })) as PostWithAuthor[];

    const [item] = await this.enrichPosts(row, user);
    this.realtime.emitSquareFeed('square:post_created', { post: item });
    return item;
  }

  async deletePost(postId: string, user: User): Promise<{ ok: true }> {
    const row = await this.repo.findPostById(postId);
    if (!row || row.status === SQUARE_DELETED) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }
    const isOwner = String(row.authorId) === String(user.id);
    const isAdmin = user.role === Roles.admin;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Không có quyền xóa bài viết');
    }
    await this.repo.updatePost(postId, { status: SQUARE_DELETED });
    this.realtime.emitSquareFeed('square:post_deleted', { postId });
    return { ok: true };
  }

  async setReaction(
    postId: string,
    userId: string,
    emojiRaw?: string,
  ): Promise<{ reactions: { emoji: string; count: number }[]; viewerReaction: string | null }> {
    const post = await this.repo.findPostById(postId);
    if (!post || post.status !== SQUARE_VISIBLE) {
      throw new NotFoundException('Không tìm thấy bài viết');
    }

    const emoji = (emojiRaw ?? '').trim();
    if (emoji && !SQUARE_REACTIONS.includes(emoji as (typeof SQUARE_REACTIONS)[number])) {
      throw new BadRequestException('Reaction không hợp lệ');
    }

    if (!emoji) {
      await this.repo.deleteReaction(postId, userId);
    } else {
      await this.repo.upsertReaction(postId, userId, emoji);
      if (String(post.authorId) !== String(userId)) {
        const reactor = await this.userRepository.findById(userId);
        const label = reactor?.username ?? 'Ai đó';
        void this.notificationService.notify({
          userId: post.authorId,
          type: NotificationType.SQUARE_REACTION,
          title: 'Square',
          body: `${label} đã react ${emoji} bài của bạn`,
          payload: { postId, fromUserId: userId, emoji },
          dedupeKey: `square-react:${postId}:${userId}`,
        });
      }
    }

    const grouped = await this.repo.groupReactions([postId]);
    const reactions = grouped.map((g) => ({
      emoji: g.emoji,
      count: g._count.emoji,
    }));
    const viewerRows = await this.repo.findViewerReactions([postId], userId);
    const viewerReaction = viewerRows[0]?.emoji ?? null;

    this.realtime.emitSquareFeed('square:reaction_updated', {
      postId,
      reactions,
    });

    return { reactions, viewerReaction };
  }

  async votePoll(
    postId: string,
    userId: string,
    optionId: string,
  ): Promise<SquarePostItemDto> {
    const post = await this.repo.findPostById(postId);
    if (!post || post.status !== SQUARE_VISIBLE || post.kind !== SQUARE_POST_KIND.poll) {
      throw new NotFoundException('Không tìm thấy poll');
    }
    const poll = await this.repo.findPollByPostId(postId);
    if (!poll) throw new NotFoundException('Không tìm thấy poll');
    const option = poll.options.find((o) => o.id === optionId);
    if (!option) throw new BadRequestException('Lựa chọn không hợp lệ');

    await this.repo.upsertPollVote(poll.id, optionId, userId);

    const rows = (await this.repo.findPosts({
      where: { id: postId },
      take: 1,
      include: { author: { select: authorSelect } },
    })) as PostWithAuthor[];
    const user = await this.userRepository.findById(userId);
    const [item] = await this.enrichPosts(rows, user);
    this.realtime.emitSquareFeed('square:poll_updated', { postId, post: item });
    return item;
  }

  async resolveUserByHandle(handle: string): Promise<User> {
    const trimmed = handle.trim();
    if (!trimmed) throw new NotFoundException('Không tìm thấy user');
    const isObjectId = /^[a-f0-9]{24}$/i.test(trimmed);
    const user = isObjectId
      ? await this.userRepository.findById(trimmed)
      : await this.userRepository.findOne({
          where: { username: trimmed },
        });
    if (!user) throw new NotFoundException('Không tìm thấy user');
    return user;
  }

  async getPublicProfile(handle: string): Promise<SquarePublicProfileDto> {
    const user = await this.resolveUserByHandle(handle);
    const postCount = await this.repo.countPosts({
      authorId: user.id,
      status: SQUARE_VISIBLE,
    });
    return {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      introduction: user.introduction,
      socialLinks: user.socialLinks ?? [],
      postCount,
    };
  }

  async getUserPosts(
    handle: string,
    options: { limit?: number; cursor?: string },
    viewer?: User | null,
  ): Promise<SquareFeedDto> {
    const user = await this.resolveUserByHandle(handle);
    const limit = Math.min(
      MAX_FEED_LIMIT,
      Math.max(1, options.limit ?? DEFAULT_FEED_LIMIT),
    );
    const rows = (await this.repo.findPosts({
      where: {
        authorId: user.id,
        status: SQUARE_VISIBLE,
        ...(this.buildCursorFilter(options.cursor) ?? {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: { author: { select: authorSelect } },
    })) as PostWithAuthor[];

    let items = rows;
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      items = rows.slice(0, limit);
      const last = items[items.length - 1];
      nextCursor = `${last.createdAt.toISOString()}|${last.id}`;
    }
    return {
      items: await this.enrichPosts(items, viewer),
      nextCursor,
    };
  }

  async listConversations(userId: string): Promise<SquareConversationItemDto[]> {
    const convs = await this.repo.listConversationsForUser(userId, 50);
    const result: SquareConversationItemDto[] = [];

    for (const conv of convs) {
      const otherId = this.repo.getOtherParticipant(conv, userId);
      const other = await this.userRepository.findById(otherId);
      if (!other) continue;

      const messages = await this.repo.findMessages(conv.id, 1);
      const preview = messages[0]?.body ?? null;
      const unread = await this.repo.countUnreadMessages(conv.id, userId);

      result.push({
        id: conv.id,
        otherUser: this.toAuthor(other),
        lastMessagePreview: preview,
        lastMessageAt: conv.lastMessageAt.toISOString(),
        unreadCount: unread,
      });
    }
    return result;
  }

  async getOrCreateConversation(
    userId: string,
    targetUserId: string,
  ): Promise<{ id: string }> {
    if (String(userId) === String(targetUserId)) {
      throw new BadRequestException('Không thể nhắn tin với chính mình');
    }
    const target = await this.userRepository.findById(targetUserId);
    if (!target) throw new NotFoundException('Không tìm thấy người nhận');

    const [a, b] = this.repo.sortParticipantPair(userId, targetUserId);
    let conv = await this.repo.findConversationByPair(a, b);
    if (!conv) {
      conv = await this.repo.createConversation(a, b);
    }
    return { id: conv.id };
  }

  async getMessages(
    conversationId: string,
    userId: string,
    options: { limit?: number; cursor?: string },
  ): Promise<SquareMessageListDto> {
    const conv = await this.repo.findConversationById(conversationId);
    if (!conv || !this.repo.isConversationMember(conv, userId)) {
      throw new ForbiddenException('Không có quyền xem hội thoại');
    }

    const limit = Math.min(50, Math.max(1, options.limit ?? 30));
    let cursorFilter: Prisma.SquareMessageWhereInput | undefined;
    const cursorRaw = options.cursor?.trim();
    if (cursorRaw) {
      const [iso, id] = cursorRaw.split('|');
      const cursorDate = iso ? new Date(iso) : null;
      if (cursorDate && !Number.isNaN(cursorDate.getTime()) && id) {
        cursorFilter = {
          OR: [
            { createdAt: { lt: cursorDate } },
            { createdAt: cursorDate, id: { lt: id } },
          ],
        };
      }
    }

    await this.repo.markMessagesRead(conversationId, userId);

    const rows = await this.repo.findMessages(
      conversationId,
      limit + 1,
      cursorFilter,
    );

    let items = rows;
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      items = rows.slice(0, limit);
      const last = items[items.length - 1];
      nextCursor = `${last.createdAt.toISOString()}|${last.id}`;
    }

    return {
      items: items.map((m) => ({
        id: m.id,
        senderId: m.senderId,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        readAt: m.readAt?.toISOString() ?? null,
        isMine: String(m.senderId) === String(userId),
      })),
      nextCursor,
    };
  }

  async sendMessage(
    conversationId: string,
    userId: string,
    dto: SendSquareMessageDto,
  ): Promise<SquareMessageListDto['items'][0]> {
    const conv = await this.repo.findConversationById(conversationId);
    if (!conv || !this.repo.isConversationMember(conv, userId)) {
      throw new ForbiddenException('Không có quyền gửi tin');
    }

    const body = this.sanitizeBody(dto.body);
    if (!body) throw new BadRequestException('Tin nhắn không được để trống');

    const msg = await this.repo.createMessage(conversationId, userId, body);
    const recipientId = this.repo.getOtherParticipant(conv, userId);

    const sender = await this.userRepository.findById(userId);
    const label = sender?.username ?? 'Ai đó';

    void this.notificationService.notify({
      userId: recipientId,
      type: NotificationType.SQUARE_DM,
      title: 'Tin nhắn Square',
      body: `${label}: ${body.slice(0, 80)}`,
      payload: { conversationId, fromUserId: userId, messageId: msg.id },
      dedupeKey: `square-dm:${conversationId}:${msg.id}`,
    });

    const payload = {
      id: msg.id,
      conversationId,
      senderId: userId,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
    };

    this.realtime.emitToChannel(
      squareConvChannel(conversationId),
      'square:message',
      payload,
    );
    this.realtime.emitUserSquareEvent(recipientId, 'square:message', {
      ...payload,
      conversationId,
    });

    return {
      id: msg.id,
      senderId: msg.senderId,
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      readAt: null,
      isMine: true,
    };
  }

  async canJoinConvChannel(
    conversationId: string,
    userId: string | undefined,
  ): Promise<boolean> {
    if (!userId) return false;
    const conv = await this.repo.findConversationById(conversationId);
    if (!conv) return false;
    return this.repo.isConversationMember(conv, userId);
  }
}
