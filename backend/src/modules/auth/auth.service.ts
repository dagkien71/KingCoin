import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignUpDto } from './dto/register';
import { UserRepository } from '@modules/user/user.repository';
import {
  INVALID_CREDENTIALS,
  NOT_FOUND,
  USER_CONFLICT,
} from '@constants/errors.constants';
import {
  NotificationPriority,
  NotificationType,
  Prisma,
  User,
} from '@prisma/client';
import { SignInDto } from '@modules/auth/dto/login.dto';
import { TokenService } from '@modules/auth/token.service';
import { NotificationService } from '@modules/notification/notification.service';
import { ReferralService } from '@modules/referral/referral.service';
import { Roles } from '@modules/app/app.roles';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly referralService: ReferralService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * @desc Create a new user
   * @param signUpDto
   * @returns Promise<User> - Created user
   * @throws ConflictException - User with this email or phone already exists
   */

  async signUp(signUpDto: SignUpDto): Promise<User> {
    const existingUser: User = await this.userRepository.findOne({
      where: { email: signUpDto.email },
    });

    if (existingUser) {
      throw new ConflictException(USER_CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);

    const newUserData: Prisma.UserCreateInput = {
      email: signUpDto.email,
      password: hashedPassword,
      username: signUpDto.username,
      phone: signUpDto.phone,
      walletAddress: this.generateRandomWalletAddress(),
      role: Roles.user,
      avatar: this.getRandomAvatarUrl(signUpDto.username),
      socialLinks: [],
      balance: {
        create: {
          stableCoin: 0,
        },
      },
    };

    const created = await this.userRepository.create(newUserData);
    const initialKc = Number(process.env.INITIAL_KC_BALANCE ?? '2000');
    await this.userRepository.seedInitialQuoteTokenForUser(created.id, initialKc);
    await this.referralService.attachOnSignup(
      created.id,
      signUpDto.referralCode,
    );
    const full = await this.userRepository.findOne({ where: { id: created.id } });
    const user = full ?? created;
    if (initialKc > 0) {
      await this.notifications.notify({
        userId: user.id,
        type: NotificationType.SIGNUP_BONUS,
        priority: NotificationPriority.low,
        title: 'Chào mừng KingCoin',
        body: `Bạn nhận ${initialKc.toLocaleString('vi-VN')} KC khi đăng ký.`,
        dedupeKey: `SIGNUP_BONUS:${user.id}`,
        payload: { deeplink: '/wallet', amountKc: initialKc },
      });
    }
    return user;
  }

  private generateRandomWalletAddress(): string {
    return `0x${Math.random().toString(36).substring(2, 50)}`;
  }

  private getRandomAvatarUrl(name?: string): string {
    const label = name?.trim() || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(label)}`;
  }

  /**
   * @desc Sign in a user
   * @returns Auth.AccessRefreshTokens - Access and refresh tokens
   * @throws NotFoundException - User not found
   * @throws UnauthorizedException - Invalid credentials
   * @param signInDto - User credentials
   */
  async signIn(signInDto: SignInDto): Promise<Auth.AuthResponse> {
    const testUser: User = await this.userRepository.findOne({
      where: {
        email: signInDto.email,
      },
    });

    if (!testUser) {
      // 404001: User not found
      throw new NotFoundException(NOT_FOUND);
    }

    const passwordOk = await this.tokenService.isPasswordCorrect(
      signInDto.password,
      testUser.password,
    );
    if (!passwordOk) {
      // 401001: Invalid credentials
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (this.tokenService.isLegacyPlainPassword(testUser.password)) {
      const hashedPassword = await bcrypt.hash(signInDto.password, 10);
      await this.userRepository.update(testUser.id, { password: hashedPassword });
    }

    const token = await this.tokenService.sign({
      id: testUser.id,
      email: testUser.email,
      role: testUser.role,
    });

    return {
      ...token,
      user: testUser,
    };
  }

  logout(userId: string, accessToken: string): Promise<void> {
    return this.tokenService.logout(userId, accessToken);
  }
}
