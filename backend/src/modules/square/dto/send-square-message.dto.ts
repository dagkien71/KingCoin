import { IsString, MaxLength } from 'class-validator';

export class SendSquareMessageDto {
  @IsString()
  @MaxLength(2000)
  readonly body!: string;
}
