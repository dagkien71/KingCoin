import * as bcrypt from 'bcrypt';
import type { LegacyPrismaMiddleware } from '../legacy-prisma-middleware';

export function createUserMiddleware(): LegacyPrismaMiddleware {
  return async (params, next): Promise<any> => {
    if (params.model === 'User' && params.action === 'create') {
      const pwd = params.args?.data?.password;
      if (typeof pwd === 'string' && pwd.length > 0 && !pwd.startsWith('$2')) {
        params.args.data.password = await bcrypt.hash(pwd, 10);
      }
    }

    return next(params);
  };
}
