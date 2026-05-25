import { Catch, ConflictException, HttpStatus } from '@nestjs/common';
import { CONFLICT } from '@constants/errors.constants';
import BaseExceptionFilter from './base-exception.filter';

@Catch(ConflictException)
export class ConflictExceptionFilter extends BaseExceptionFilter {
  constructor() {
    super(CONFLICT, HttpStatus.CONFLICT);
  }
}
