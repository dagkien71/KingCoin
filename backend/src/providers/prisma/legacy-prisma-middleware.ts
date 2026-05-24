/** Prisma 6+ removed `$use` / `Middleware` types — giữ shape cũ cho Nest provider. */
export type LegacyPrismaMiddlewareParams = {
  model?: string;
  action: string;
  args?: { data?: Record<string, unknown> };
};

export type LegacyPrismaMiddleware = (
  params: LegacyPrismaMiddlewareParams,
  next: (params: LegacyPrismaMiddlewareParams) => Promise<unknown>,
) => Promise<unknown>;

export type PrismaClientWithUse = {
  $use?: (middleware: LegacyPrismaMiddleware) => void;
};
