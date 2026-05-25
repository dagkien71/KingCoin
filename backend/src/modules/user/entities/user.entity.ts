import { Order, User } from '@prisma/client';
import { Roles } from '@modules/app/app.roles';

export default class UserEntity implements User {
  readonly id!: string;

  readonly phone!: string | null;

  readonly email!: string;

  readonly username!: string | null;

  readonly password!: string;

  readonly walletAddress!: string | null;

  readonly avatar!: string | null;

  readonly balance!: number;

  readonly balanceId!: string;

  readonly birthDate!: Date | null;

  readonly status!: string;

  readonly socialLinks!: string[];

  readonly introduction!: string | null;

  readonly role!: Roles;

  readonly dailyPnL!: number;

  readonly weeklyPnL!: number;

  readonly monthlyPnL!: number;

  readonly yearPnL!: number;

  readonly dailyPnLPercent!: number;

  readonly weeklyPnLPercent!: number;

  readonly navBaselineDayKc!: number | null;

  readonly navBaselineWeekKc!: number | null;

  readonly navBaselineDayAt!: Date | null;

  readonly navBaselineWeekAt!: Date | null;

  readonly monthlyPnLPercent!: number;

  readonly yearPnLPercent!: number;

  readonly emailVerifiedAt!: Date | null;

  readonly createdAt!: Date;

  readonly updatedAt!: Date;

  readonly isVerified!: boolean;

  readonly watchList!: string[];

  readonly completedTours!: string[];

  readonly orders!: Order[];
}
