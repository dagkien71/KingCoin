import { faker } from '@faker-js/faker';
import { Roles } from '@modules/app/app.roles';
import { AuthService } from '@modules/auth/auth.service';
import { SignUpDto } from '@modules/auth/dto/register';
import { TokenService } from '@modules/auth/token.service';
import { INestApplication } from '@nestjs/common';
import { PrismaClient, User } from '@prisma/client';
import { getSignUpData } from '@tests/common/user.mock.functions';
import { AdminUserInterface } from '@tests/e2e/interfaces/admin-user.interface';

class TestService {
  private _authService!: AuthService;

  private _tokenService!: TokenService;

  private _connection!: PrismaClient;

  constructor(app: INestApplication, connection: PrismaClient) {
    this._authService = app.get<AuthService>(AuthService);

    this._tokenService = app.get<TokenService>(TokenService);

    this._connection = connection;
  }

  async createGlobalAdmin(): Promise<AdminUserInterface> {
    const role: Roles.admin[] = [Roles.admin];

    const signUpData: SignUpDto = getSignUpData();
    const userPassword: string = signUpData.password;

    const newAdmin: User = await this._authService.signUp(signUpData);

    await this._connection.user.update({
      where: {
        id: newAdmin.id,
      },
      data: {
        role: Roles.admin,
      },
    });

    const { id, phone, email } = newAdmin;

    const { accessToken, refreshToken } = await this._authService.signIn({
      email,
      password: userPassword,
    });

    return {
      id,
      phone,
      email,
      password: userPassword,
      accessToken,
      refreshToken,
    };
  }

  async createUser(): Promise<User> {
    const signUpDto: SignUpDto = this.getSignUpData();
    const { password } = signUpDto;
    const user = await this._authService.signUp(signUpDto);

    return {
      ...user,
      password,
    };
  }

  getSignUpData(): SignUpDto {
    return {
      email: faker.internet.email(),
      username: faker.person.fullName(),
      password: faker.internet.password({ length: 12 }),
    };
  }

  async getTokens(user: User): Promise<Auth.AccessRefreshTokens> {
    return this._tokenService.sign({
      id: user.id,
      email: user.email,
      role: user.role,
    });
  }
}

export default TestService;
