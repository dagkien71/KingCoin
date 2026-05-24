import { Injectable } from '@nestjs/common';
import { Prisma, TokenComment } from '@prisma/client';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class CommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.TokenCommentCreateInput): Promise<TokenComment> {
    return this.prisma.tokenComment.create({ data });
  }

  findById(id: string): Promise<TokenComment | null> {
    return this.prisma.tokenComment.findUnique({ where: { id } });
  }

  findMany(args: Prisma.TokenCommentFindManyArgs): Promise<TokenComment[]> {
    return this.prisma.tokenComment.findMany(args);
  }

  update(
    id: string,
    data: Prisma.TokenCommentUpdateInput,
  ): Promise<TokenComment> {
    return this.prisma.tokenComment.update({ where: { id }, data });
  }
}
