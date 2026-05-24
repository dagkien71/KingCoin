import { faker } from '@faker-js/faker';
import { SignUpDto } from '@modules/auth/dto/register';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import PaginatedResult = PaginatorTypes.PaginatedResult;

export function getSignUpData(email?: string): SignUpDto {
  return {
    email: faker.internet.email({ provider: email }),
    username: faker.person.fullName(),
    password: faker.internet.password({ length: 12 }),
  };
}

export function getPaginatedData<T>(input: T[]): PaginatedResult<T> {
  return {
    data: input,
    meta: {
      total: input.length,
      lastPage: Math.ceil(input.length / 10),
      currentPage: 1,
      perPage: 10,
      prev: null,
      next: null,
    },
  };
}

export function getJwtTokens(): Auth.AccessRefreshTokens {
  return {
    accessToken: faker.string.alphanumeric({ length: 40 }),
    refreshToken: faker.string.alphanumeric({ length: 40 }),
  };
}
