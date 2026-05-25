import { IsString } from 'class-validator';

export class VoteSquarePollDto {
  @IsString()
  readonly optionId!: string;
}
