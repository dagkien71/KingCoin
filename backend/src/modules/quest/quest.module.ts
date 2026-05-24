import { LedgerModule } from '@modules/ledger/ledger.module';
import { ReferralModule } from '@modules/referral/referral.module';
import { UserRepository } from '@modules/user/user.repository';
import { NotificationModule } from '@modules/notification/notification.module';
import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';

@Module({
  imports: [LedgerModule, ReferralModule, NotificationModule],
  controllers: [QuestController],
  providers: [QuestService, UserRepository],
  exports: [QuestService],
})
export class QuestModule implements OnModuleInit {
  private readonly logger = new Logger(QuestModule.name);

  constructor(private questService: QuestService) {}

  onModuleInit() {
    void this.questService.ensureDefaultQuests().catch((err: unknown) => {
      this.logger.warn(
        'Default quests seed skipped (MongoDB may be unavailable or without replica set)',
        err instanceof Error ? err.message : err,
      );
    });
  }
}
