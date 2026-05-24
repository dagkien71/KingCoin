import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import UpcomingListingEntity from './upcoming-listing.entity';

@Exclude()
class UpcomingMyPreorderEntity {
  @ApiProperty()
  @Expose()
  declare readonly amountKc: number;
}

@Exclude()
export default class UpcomingListingDetailEntity {
  @ApiProperty({ type: UpcomingListingEntity })
  @Expose()
  @Type(() => UpcomingListingEntity)
  declare readonly listing: UpcomingListingEntity;

  @ApiProperty()
  @Expose()
  declare readonly preorderCount: number;

  @ApiProperty()
  @Expose()
  declare readonly totalPreorderKc: number;

  @ApiProperty({ nullable: true, type: UpcomingMyPreorderEntity })
  @Expose()
  @Type(() => UpcomingMyPreorderEntity)
  declare readonly myPreorder: UpcomingMyPreorderEntity | null;
}
