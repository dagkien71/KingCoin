import { Exclude, Expose, Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export type UpcomingListingSpecRow = { label: string; value: string };

@Exclude()
export default class UpcomingListingEntity {
  @ApiProperty()
  @Expose()
  declare readonly id: string;

  @ApiProperty()
  @Expose()
  declare readonly name: string;

  @ApiProperty()
  @Expose()
  declare readonly symbol: string;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly logo: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly tagline: string | null;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly description: string | null;

  @ApiProperty()
  @Expose()
  declare readonly status: string;

  @ApiProperty()
  @Expose()
  @Transform(({ value }) =>
    value instanceof Date ? value.toISOString() : value,
  )
  declare readonly listingAt: Date;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly initialPrice: number | null;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly totalSupply: number | null;

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly category: string | null;

  @ApiProperty({ type: [String] })
  @Expose()
  declare readonly features: string[];

  @ApiProperty({ nullable: true })
  @Expose()
  declare readonly specs: UpcomingListingSpecRow[] | null;

  @ApiProperty()
  @Expose()
  declare readonly sortOrder: number;

  @ApiProperty()
  @Expose()
  declare readonly isFeatured: boolean;
}
