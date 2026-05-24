import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Roles, User } from '@prisma/client';
import { TokenCryptoService } from '@modules/token-crypto/token.service';
import { UserRepository } from '@modules/user/user.repository';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CommentRepository } from './comment.repository';

const VISIBLE = 'visible';
const DELETED = 'deleted';
const MIN_GAP_MS = 2000;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export type CommentAuthorDto = {
  id: string;
  username: string | null;
  avatar: string | null;
};

export type CommentItemDto = {
  id: string;
  tokenId: string;
  body: string;
  createdAt: string;
  author: CommentAuthorDto;
  canDelete: boolean;
};

export type CommentListDto = {
  items: CommentItemDto[];
  nextCursor: string | null;
};

type CommentWithUser = Prisma.TokenCommentGetPayload<{
  include: { user: { select: { id: true; username: true; avatar: true } } };
}>;

@Injectable()
export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly tokenService: TokenCryptoService,
    private readonly userRepository: UserRepository,
  ) {}

  private isStablecoinToken(token: {
    tokenKind?: string | null;
    symbol?: string | null;
  }): boolean {
    return token.tokenKind === 'stablecoin' || token.symbol === 'KC';
  }

  private sanitizeBody(body: string): string {
    return body.replace(/<[^>]*>/g, '').trim();
  }

  private toItem(
    row: CommentWithUser,
    viewerId?: string | null,
    viewerRole?: string | null,
  ): CommentItemDto {
    const isOwner =
      viewerId != null &&
      viewerId.length > 0 &&
      String(row.userId) === String(viewerId);
    const isAdmin = viewerRole === Roles.admin;
    return {
      id: row.id,
      tokenId: row.tokenId,
      body: row.body,
      createdAt: row.createdAt.toISOString(),
      author: {
        id: row.user.id,
        username: row.user.username,
        avatar: row.user.avatar,
      },
      canDelete: isOwner || isAdmin,
    };
  }

  async listByToken(
    tokenId: string,
    options?: { limit?: number; cursor?: string },
    viewer?: User | null,
  ): Promise<CommentListDto> {
    const token = await this.tokenService.findById(tokenId);
    if (!token) {
      throw new NotFoundException('Không tìm thấy token');
    }

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, options?.limit ?? DEFAULT_LIMIT),
    );
    const cursorRaw = options?.cursor?.trim();
    let cursorFilter: Prisma.TokenCommentWhereInput | undefined;
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

    const rows = (await this.commentRepository.findMany({
      where: {
        tokenId: token.id,
        status: VISIBLE,
        ...(cursorFilter ?? {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    })) as CommentWithUser[];

    let items = rows;
    let nextCursor: string | null = null;
    if (rows.length > limit) {
      items = rows.slice(0, limit);
      const last = items[items.length - 1];
      nextCursor = `${last.createdAt.toISOString()}|${last.id}`;
    }

    return {
      items: items.map((r) => this.toItem(r, viewer?.id, viewer?.role)),
      nextCursor,
    };
  }

  async create(
    tokenId: string,
    userId: string,
    dto: CreateCommentDto,
  ): Promise<CommentItemDto> {
    const body = this.sanitizeBody(dto.body);
    if (!body) {
      throw new BadRequestException('Nội dung bình luận không được để trống');
    }

    const token = await this.tokenService.findById(tokenId);
    if (!token) {
      throw new NotFoundException('Không tìm thấy token');
    }
    if (this.isStablecoinToken(token)) {
      throw new BadRequestException(
        'Không bình luận trên token stablecoin (KC)',
      );
    }

    const recent = await this.commentRepository.findMany({
      where: { userId, tokenId: token.id, status: VISIBLE },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });
    if (recent[0]) {
      const elapsed = Date.now() - recent[0].createdAt.getTime();
      if (elapsed < MIN_GAP_MS) {
        throw new BadRequestException('Vui lòng đợi vài giây trước khi gửi tiếp');
      }
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    const created = await this.commentRepository.create({
      body,
      tokenId: token.id,
      user: { connect: { id: userId } },
    });

    return this.toItem(
      {
        ...created,
        user: {
          id: user.id,
          username: user.username,
          avatar: user.avatar,
        },
      } as CommentWithUser,
      userId,
      user.role,
    );
  }

  async remove(commentId: string, user: User): Promise<{ ok: true }> {
    if (!user?.id) {
      throw new ForbiddenException('Không có quyền xóa bình luận này');
    }

    const row = await this.commentRepository.findById(commentId);
    if (!row || row.status === DELETED) {
      throw new NotFoundException('Không tìm thấy bình luận');
    }

    const isOwner = String(row.userId) === String(user.id);
    const isAdmin = user.role === Roles.admin;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Không có quyền xóa bình luận này');
    }

    await this.commentRepository.update(commentId, { status: DELETED });
    return { ok: true };
  }
}
