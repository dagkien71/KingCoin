import { Injectable } from '@nestjs/common';
import { SubjectBeforeFilterHook } from '@modules/casl';
import { AuthorizableRequest } from '@modules/casl';
import { TokenComment } from '@prisma/client';
import { CommentRepository } from './comment.repository';

@Injectable()
export class CommentHook implements SubjectBeforeFilterHook<TokenComment> {
  constructor(private readonly commentRepository: CommentRepository) {}

  async run(request: AuthorizableRequest): Promise<TokenComment | undefined> {
    const id = request.params?.id;
    if (!id || typeof id !== 'string') {
      return undefined;
    }
    const row = await this.commentRepository.findById(id);
    return row ?? undefined;
  }
}
