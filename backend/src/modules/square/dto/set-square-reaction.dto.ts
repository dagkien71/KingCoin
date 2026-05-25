import { IsIn, IsOptional, IsString } from 'class-validator';
import { SQUARE_REACTIONS } from '../square.constants';

export class SetSquareReactionDto {
  @IsOptional()
  @IsString()
  @IsIn([...SQUARE_REACTIONS, ''])
  readonly emoji?: string;
}
