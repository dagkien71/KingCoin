import { LedgerModule } from '@modules/ledger/ledger.module';
import { ReferralModule } from '@modules/referral/referral.module';
import { UserRepository } from '@modules/user/user.repository';
import { NotificationModule } from '@modules/notification/notification.module';
import { Module, OnModuleInit } from '@nestjs/common';
import { QuestController } from './quest.controller';
import { QuestService } from './quest.service';

@Module({
  imports: [LedgerModule, ReferralModule, NotificationModule],
  controllers: [QuestController],
  providers: [QuestService, UserRepository],
  exports: [QuestService],
})
export class QuestModule implements OnModuleInit {
  constructor(private questService: QuestService) {}

  onModuleInit() {
    void this.questService.ensureDefaultQuests();
  }
}
