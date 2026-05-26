import { ApiProperty } from '@nestjs/swagger';

export class OrderbookDepthLevelDto {
  @ApiProperty()
  price!: number;

  @ApiProperty()
  quantity!: number;
}

export class OrderbookDepthResponseDto {
  @ApiProperty()
  tokenId!: string;

  @ApiProperty()
  at!: number;

  @ApiProperty({ type: [OrderbookDepthLevelDto] })
  bids!: OrderbookDepthLevelDto[];

  @ApiProperty({ type: [OrderbookDepthLevelDto] })
  asks!: OrderbookDepthLevelDto[];
}
