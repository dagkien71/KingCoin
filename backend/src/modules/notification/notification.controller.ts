import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { PriceAlertService } from '@modules/notification/price-alert.service';
import { NotificationService } from '@modules/notification/notification.service';
import { CreatePriceAlertDto } from '@modules/notification/dto/create-price-alert.dto';
import { PushSubscribeDto } from '@modules/notification/dto/push-subscribe.dto';
import { UpdateNotificationPreferencesDto } from '@modules/notification/dto/update-preferences.dto';
import UserEntity from '@modules/user/entities/user.entity';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { Request } from 'express';

@ApiTags('Notifications')
@ApiBaseResponses()
@Controller()
export class NotificationController {
  constructor(
    private readonly notifications: NotificationService,
    private readonly priceAlerts: PriceAlertService,
  ) {}

  @Get('notifications')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async list(
    @CaslUser() userProxy: UserProxy<User>,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('cursor') cursor?: string,
  ) {
    const user = await userProxy.get();
    return this.notifications.list(user.id, {
      limit: limit ? Number(limit) : undefined,
      unreadOnly: unreadOnly === 'true',
      cursor,
    });
  }

  @Get('notifications/unread-count')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async unreadCount(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    return { count: await this.notifications.unreadCount(user.id) };
  }

  @Patch('notifications/read-all')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, UserEntity)
  async readAll(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    const count = await this.notifications.markAllRead(user.id);
    return { count };
  }

  @Patch('notifications/:id/read')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, UserEntity)
  async readOne(
    @Param('id') id: string,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    return this.notifications.markRead(user.id, id);
  }

  @Get('notifications/preferences')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async getPrefs(@CaslUser() userProxy: UserProxy<User>) {
    const user = await userProxy.get();
    return this.notifications.getPreferences(user.id);
  }

  @Patch('notifications/preferences')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.update, UserEntity)
  async patchPrefs(
    @CaslUser() userProxy: UserProxy<User>,
    @Body() body: UpdateNotificationPreferencesDto,
  ) {
    const user = await userProxy.get();
    return this.notifications.updatePreferences(user.id, body);
  }

  @Post('notifications/push-subscribe')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async pushSubscribe(
    @CaslUser() userProxy: UserProxy<User>,
    @Body() body: PushSubscribeDto,
    @Req() req: Request,
  ) {
    const user = await userProxy.get();
    const ua = body.userAgent ?? req.headers['user-agent'];
    await this.notifications.savePushSubscription(
      user.id,
      { endpoint: body.endpoint, keys: body.keys },
      typeof ua === 'string' ? ua : undefined,
    );
    return { ok: true };
  }

  @Delete('notifications/push-subscribe')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.delete, UserEntity)
  async pushUnsubscribe(
    @CaslUser() userProxy: UserProxy<User>,
    @Body() body: { endpoint: string },
  ) {
    const user = await userProxy.get();
    await this.notifications.removePushSubscription(user.id, body.endpoint);
    return { ok: true };
  }

  @Get('price-alerts')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async listAlerts(
    @CaslUser() userProxy: UserProxy<User>,
    @Query('tokenId') tokenId?: string,
  ) {
    const user = await userProxy.get();
    return this.priceAlerts.listForUser(user.id, tokenId);
  }

  @Post('price-alerts')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.create, UserEntity)
  async createAlert(
    @CaslUser() userProxy: UserProxy<User>,
    @Body() body: CreatePriceAlertDto,
  ) {
    const user = await userProxy.get();
    return this.priceAlerts.create(user.id, body);
  }

  @Delete('price-alerts/:id')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.delete, UserEntity)
  async deleteAlert(
    @Param('id') id: string,
    @CaslUser() userProxy: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    await this.priceAlerts.remove(user.id, id);
    return { ok: true };
  }
}
