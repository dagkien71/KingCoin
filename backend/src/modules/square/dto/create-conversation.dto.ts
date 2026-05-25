import { IsString } from 'class-validator';

export class CreateSquareConversationDto {
  @IsString()
  readonly targetUserId!: string;
}
