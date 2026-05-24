import appConfig from '@config/app.config';
import jwtConfig from '@config/jwt.config';
import s3Config from '@config/s3.config';
import sqsConfig from '@config/sqs.config';
import swaggerConfig from '@config/swagger.config';
import { faker } from '@faker-js/faker';
import { AuthController } from '@modules/auth/auth.controller';
import { permissions } from '@modules/auth/auth.permissions';
import { AuthService } from '@modules/auth/auth.service';
import { TokenRepository } from '@modules/auth/token.repository';
import { TokenService } from '@modules/auth/token.service';
import { CaslModule } from '@modules/casl';
import { UserRepository } from '@modules/user/user.repository';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '@providers/prisma';
import mockTokenService from '@tests/mocks/token.service.mock';
import mockUserRepository from '@tests/mocks/user.repository.mock';
describe('AuthService', () => {
  let module: TestingModule;

  let authService: AuthService;
  let userRepository: UserRepository;
  let tokenService: TokenService;
  let tokenRepository: TokenRepository;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        CaslModule.forFeature({ permissions }),
        JwtModule.register({}),
        ConfigModule.forRoot({
          load: [appConfig, swaggerConfig, jwtConfig, s3Config, sqsConfig],
        }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: TokenService, useValue: mockTokenService },
        { provide: UserRepository, useValue: mockUserRepository },
        TokenRepository,
        JwtService,
        ConfigService,
        PrismaService,
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userRepository = module.get<UserRepository>(UserRepository);
    tokenService = module.get<TokenService>(TokenService);
    tokenRepository = module.get<TokenRepository>(TokenRepository);
  });

  it('AuthService - should be defined', () => {
    expect(authService).toBeDefined();
  });

  it('UserRepository - should be defined', () => {
    expect(userRepository).toBeDefined();
  });

  it('TokenService - should be defined', () => {
    expect(tokenService).toBeDefined();
  });

  it('TokenRepository - should be defined', () => {
    expect(tokenRepository).toBeDefined();
  });

  describe('when calling the logout method', () => {
    describe('and valid arguments are provided', () => {
      beforeEach(async () => {
        mockTokenService.logout.mockReturnValueOnce(null);
      });

      it('should remove tokens from white list', async () => {
        const userId = faker.string.alphanumeric({ length: 12 });
        const accessToken = faker.string.alphanumeric({ length: 40 });
        expect(await authService.logout(userId, accessToken)).toBe(null);
      });
    });
  });
});
