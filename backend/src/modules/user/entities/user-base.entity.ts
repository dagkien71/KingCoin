import { Exclude, Expose } from 'class-transformer';
import { ApiProperty, PartialType } from '@nestjs/swagger';
import UserEntity from '@modules/user/entities/user.entity';
import { Roles } from '@modules/app/app.roles';
import { Order } from '@prisma/client';
import { IsOptional } from 'class-validator';

@Exclude()
export default class UserBaseEntity extends PartialType(UserEntity) {
  @ApiProperty({ type: String })
  @Expose()
  declare readonly id: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  declare readonly phone: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  declare readonly email: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  declare readonly username: string | null;

  @ApiProperty({ type: String, nullable: true })
  declare readonly password: string;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  declare readonly walletAddress: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  declare readonly walletCode: string | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  declare readonly avatar: string | null;

  @ApiProperty({ type: Number })
  @Expose()
  declare readonly balance: number;

  @ApiProperty({ type: Date, nullable: true })
  @Expose()
  declare readonly birthDate: Date | null;

  @ApiProperty({ type: String })
  @Expose()
  declare readonly status: string;

  @ApiProperty({ type: [String] })
  @Expose()
  declare readonly socialLinks: string[];

  @ApiProperty({ type: [String] })
  @Expose()
  declare readonly watchList: string[];

  @ApiProperty({ type: [String] })
  @Expose()
  declare readonly completedTours: string[];

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  declare readonly introduction: string | null;

  @ApiProperty({ type: String })
  @Expose()
  declare readonly role: Roles;

  @ApiProperty({ type: Number })
  @Expose()
  declare readonly dailyPnL: number;

  @ApiProperty({ type: Number })
  @Expose()
  declare readonly weeklyPnL: number;

  @ApiProperty({ type: Number })
  @Expose()
  declare readonly monthlyPnL: number;

  @ApiProperty({ type: Number })
  @Expose()
  declare readonly dailyPnLPercent: number;

  @ApiProperty({ type: Number })
  @Expose()
  declare readonly weeklyPnLPercent: number;

  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  declare readonly navBaselineDayKc: number | null;

  @ApiProperty({ type: Number, nullable: true })
  @Expose()
  declare readonly navBaselineWeekKc: number | null;

  @ApiProperty({ type: Date })
  @Expose()
  declare readonly createdAt: Date;

  @ApiProperty({ type: Date })
  @Expose()
  declare readonly updatedAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  @Expose()
  declare readonly emailVerifiedAt: Date | null;

  @ApiProperty({ type: String, nullable: true })
  @Expose()
  declare readonly pendingEmail: string | null;

  @ApiProperty({ type: Boolean })
  @Expose()
  declare readonly isVerified: boolean;

  @ApiProperty({
    type: Array<Order>,
  })
  @Expose()
  declare readonly orders: Order[] | null;

  /** `liquidity_bot` = MM/flow — không tính thống kê trader trên admin. */
  @ApiProperty({ type: [String], required: false })
  @Expose()
  declare readonly accountTags?: string[];
}
