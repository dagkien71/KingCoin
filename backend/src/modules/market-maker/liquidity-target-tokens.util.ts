import { PrismaClient } from '@prisma/client';

export function quoteTokenName(): string {
  return process.env.QUOTE_TOKEN_NAME?.trim() || 'KingCoin';
}

export function isQuoteToken(token: {
  name?: string | null;
  symbol?: string | null;
  tokenKind?: string | null;
}): boolean {
  if (token.tokenKind === 'stablecoin') return true;
  const qName = quoteTokenName();
  if (token.name === qName) return true;
  const qSym = process.env.QUOTE_DISPLAY_SYMBOL?.trim() || 'KC';
  if (token.symbol?.toUpperCase() === qSym.toUpperCase()) return true;
  return false;
}

/**
 * Mọi token base để MM/flow (trừ quote KC).
 * Nếu MARKET_MAKER_TOKEN_NAMES / MARKET_FLOW_BASE_TOKEN_NAMES có set — dùng list đó;
 * không thì lấy tất cả token trong DB (trừ quote).
 */
export async function resolveMmTargetTokenNames(
  prisma: PrismaClient,
): Promise<string[]> {
  const fromEnv = parseEnvTokenNames(
    process.env.MARKET_MAKER_TOKEN_NAMES,
    process.env.MARKET_MAKER_TOKEN_NAME,
  );
  if (fromEnv.length > 0) {
    const valid = await filterExistingBaseNames(prisma, fromEnv);
    if (valid.length > 0) {
      return valid;
    }
  }
  return listBaseTokenNamesFromDb(prisma);
}

export async function resolveFlowBaseTokenNames(
  prisma: PrismaClient,
): Promise<string[]> {
  const fromEnv = parseEnvTokenNames(process.env.MARKET_FLOW_BASE_TOKEN_NAMES);
  if (fromEnv.length > 0) {
    const valid = await filterExistingBaseNames(prisma, fromEnv);
    if (valid.length > 0) {
      return valid;
    }
  }
  return listBaseTokenNamesFromDb(prisma);
}

function parseEnvTokenNames(
  listEnv?: string,
  singleEnv?: string,
): string[] {
  const list = listEnv?.trim();
  if (list) {
    return [
      ...new Set(
        list
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      ),
    ];
  }
  const single = singleEnv?.trim();
  return single ? [single] : [];
}

async function filterExistingBaseNames(
  prisma: PrismaClient,
  names: string[],
): Promise<string[]> {
  const out: string[] = [];
  for (const name of names) {
    const token = await prisma.tokenCrypto.findFirst({
      where: { name },
      select: { name: true, symbol: true, tokenKind: true },
    });
    if (token?.name && !isQuoteToken(token)) {
      out.push(token.name);
    }
  }
  return [...new Set(out)];
}

async function listBaseTokenNamesFromDb(
  prisma: PrismaClient,
): Promise<string[]> {
  const tokens = await prisma.tokenCrypto.findMany({
    where: { status: 'active' },
    select: { name: true, symbol: true, tokenKind: true },
    orderBy: { rank: 'asc' },
  });
  return tokens
    .filter((t) => t.name && !isQuoteToken(t))
    .map((t) => t.name as string);
}
