import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export default class ListingRequestEntity {
  @ApiProperty()
  @Expose()
  declare readonly id: string;

  @ApiProperty()
  @Expose()
  declare readonly userId: string;

  @ApiProperty()
  @Expose()
  declare readonly name: string;

  @ApiProperty()
  @Expose()
  declare readonly symbol: string;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly logo: string | null;

  @ApiProperty()
  @Expose()
  declare readonly decimals: number;

  @ApiProperty()
  @Expose()
  declare readonly totalSupply: number;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly initialPrice: number | null;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly description: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly communityLinks: Record<string, string> | null;

  @ApiProperty()
  @Expose()
  declare readonly status: string;

  @ApiProperty()
  @Expose()
  declare readonly listingFeeKc: number;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly rejectionReason: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly upcomingListingId: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly tokenId: string | null;

  @ApiProperty()
  @Expose()
  declare readonly createdAt: Date;
}
