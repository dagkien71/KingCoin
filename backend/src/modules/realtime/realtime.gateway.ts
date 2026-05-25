import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@providers/prisma';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/realtime',
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (typeof client.handshake.query?.token === 'string'
        ? client.handshake.query.token
        : undefined);
    if (!token) return;

    try {
      const payload = await this.jwtService.verifyAsync<{
        id?: string;
        sub?: string;
      }>(token, {
        secret: this.configService.get<string>('jwt.accessToken'),
      });
      const userId = payload?.id ?? payload?.sub;
      if (!userId) return;
      client.data.userId = userId;
      await client.join(`user:${userId}`);
      this.logger.debug(`User ${userId} joined private channel`);
    } catch {
      /* anonymous market-only connection */
    }
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @MessageBody() payload: { channel?: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const channel = payload?.channel?.trim();
    if (!channel) return;

    if (channel.startsWith('user:')) {
      const targetUserId = channel.slice(5);
      if (client.data.userId !== targetUserId) {
        this.logger.warn(
          `Blocked subscribe to ${channel} for client ${client.id}`,
        );
        return;
      }
    }

    if (channel.startsWith('square:conv:')) {
      const convId = channel.slice('square:conv:'.length);
      const userId = client.data.userId as string | undefined;
      if (!userId || !convId) {
        this.logger.warn(`Blocked subscribe to ${channel} — no auth`);
        return;
      }
      void this.prisma.squareConversation
        .findUnique({ where: { id: convId } })
        .then((conv) => {
          if (!conv) return;
          const member =
            String(conv.participantA) === String(userId) ||
            String(conv.participantB) === String(userId);
          if (!member) {
            this.logger.warn(`Blocked subscribe to ${channel}`);
            return;
          }
          void client.join(channel);
          this.logger.debug(`Client ${client.id} joined ${channel}`);
        });
      return;
    }

    void client.join(channel);
    this.logger.debug(`Client ${client.id} joined ${channel}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @MessageBody() payload: { channel?: string },
    @ConnectedSocket() client: Socket,
  ): void {
    const channel = payload?.channel?.trim();
    if (!channel) return;
    void client.leave(channel);
  }

  emitToChannel(channel: string, event: string, data: unknown): void {
    this.server?.to(channel).emit(event, data);
  }
}
