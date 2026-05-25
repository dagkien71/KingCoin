import { Injectable } from '@nestjs/common';
import { Prisma, SquarePost } from '@prisma/client';
import { PrismaService } from '@providers/prisma';

@Injectable()
export class SquareRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPosts(args: Prisma.SquarePostFindManyArgs) {
    return this.prisma.squarePost.findMany(args);
  }

  findPostById(id: string) {
    return this.prisma.squarePost.findUnique({ where: { id } });
  }

  createPost(data: Prisma.SquarePostCreateInput) {
    return this.prisma.squarePost.create({ data });
  }

  updatePost(id: string, data: Prisma.SquarePostUpdateInput) {
    return this.prisma.squarePost.update({ where: { id }, data });
  }

  countPosts(where: Prisma.SquarePostWhereInput) {
    return this.prisma.squarePost.count({ where });
  }

  upsertReaction(postId: string, userId: string, emoji: string) {
    return this.prisma.squareReaction.upsert({
      where: { postId_userId: { postId, userId } },
      create: { postId, userId, emoji },
      update: { emoji },
    });
  }

  deleteReaction(postId: string, userId: string) {
    return this.prisma.squareReaction.deleteMany({
      where: { postId, userId },
    });
  }

  groupReactions(postIds: string[]) {
    if (postIds.length === 0) return Promise.resolve([]);
    return this.prisma.squareReaction.groupBy({
      by: ['postId', 'emoji'],
      where: { postId: { in: postIds } },
      _count: { emoji: true },
    });
  }

  findViewerReactions(postIds: string[], userId: string) {
    if (postIds.length === 0 || !userId) return Promise.resolve([]);
    return this.prisma.squareReaction.findMany({
      where: { postId: { in: postIds }, userId },
      select: { postId: true, emoji: true },
    });
  }

  createPollWithOptions(
    postId: string,
    options: string[],
    multipleChoice: boolean,
  ) {
    return this.prisma.squarePoll.create({
      data: {
        postId,
        multipleChoice,
        options: {
          create: options.map((label, i) => ({ label, sortOrder: i })),
        },
      },
      include: { options: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  findPollByPostId(postId: string) {
    return this.prisma.squarePoll.findUnique({
      where: { postId },
      include: {
        options: { orderBy: { sortOrder: 'asc' } },
        votes: true,
      },
    });
  }

  upsertPollVote(pollId: string, optionId: string, userId: string) {
    return this.prisma.squarePollVote.upsert({
      where: { pollId_userId: { pollId, userId } },
      create: { pollId, optionId, userId },
      update: { optionId },
    });
  }

  findConversationByPair(participantA: string, participantB: string) {
    return this.prisma.squareConversation.findUnique({
      where: {
        participantA_participantB: { participantA, participantB },
      },
    });
  }

  createConversation(participantA: string, participantB: string) {
    return this.prisma.squareConversation.create({
      data: { participantA, participantB },
    });
  }

  findConversationById(id: string) {
    return this.prisma.squareConversation.findUnique({ where: { id } });
  }

  listConversationsForUser(userId: string, take: number) {
    return this.prisma.squareConversation.findMany({
      where: {
        OR: [{ participantA: userId }, { participantB: userId }],
      },
      orderBy: { lastMessageAt: 'desc' },
      take,
    });
  }

  createMessage(
    conversationId: string,
    senderId: string,
    body: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const msg = await tx.squareMessage.create({
        data: { conversationId, senderId, body },
      });
      await tx.squareConversation.update({
        where: { id: conversationId },
        data: { lastMessageAt: msg.createdAt },
      });
      return msg;
    });
  }

  findMessages(
    conversationId: string,
    take: number,
    cursorFilter?: Prisma.SquareMessageWhereInput,
  ) {
    return this.prisma.squareMessage.findMany({
      where: { conversationId, ...(cursorFilter ?? {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
  }

  countUnreadMessages(conversationId: string, userId: string) {
    return this.prisma.squareMessage.count({
      where: {
        conversationId,
        senderId: { not: userId },
        readAt: null,
      },
    });
  }

  markMessagesRead(conversationId: string, readerId: string) {
    return this.prisma.squareMessage.updateMany({
      where: {
        conversationId,
        senderId: { not: readerId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
  }

  isConversationMember(
    conv: { participantA: string; participantB: string },
    userId: string,
  ): boolean {
    return (
      String(conv.participantA) === String(userId) ||
      String(conv.participantB) === String(userId)
    );
  }

  getOtherParticipant(
    conv: { participantA: string; participantB: string },
    userId: string,
  ): string {
    return String(conv.participantA) === String(userId)
      ? conv.participantB
      : conv.participantA;
  }

  sortParticipantPair(a: string, b: string): [string, string] {
    return a < b ? [a, b] : [b, a];
  }

  findComments(args: Prisma.SquareCommentFindManyArgs) {
    return this.prisma.squareComment.findMany(args);
  }

  findCommentById(id: string) {
    return this.prisma.squareComment.findUnique({ where: { id } });
  }

  createComment(data: Prisma.SquareCommentCreateInput) {
    return this.prisma.squareComment.create({ data });
  }

  updateComment(id: string, data: Prisma.SquareCommentUpdateInput) {
    return this.prisma.squareComment.update({ where: { id }, data });
  }

  countCommentsByPostIds(postIds: string[]) {
    if (postIds.length === 0) return Promise.resolve([]);
    return this.prisma.squareComment.groupBy({
      by: ['postId'],
      where: { postId: { in: postIds }, status: 'visible' },
      _count: { _all: true },
    });
  }
}
