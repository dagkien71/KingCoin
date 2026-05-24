import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export function createUserMiddleware(): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model === 'User' && params.action === 'create') {
      const pwd = params.args?.data?.password;
      if (typeof pwd === 'string' && pwd.length > 0 && !pwd.startsWith('$2')) {
        params.args.data.password = await bcrypt.hash(pwd, 10);
      }
    }

    return next(params);
  };
}
