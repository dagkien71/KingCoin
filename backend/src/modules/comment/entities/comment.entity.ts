import { ApiProperty } from '@nestjs/swagger';
import { TokenComment } from '@prisma/client';

export default class CommentEntity implements Partial<TokenComment> {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tokenId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  body: string;

  @ApiProperty({ required: false })
  parentId?: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
