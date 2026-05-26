import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignUpDto } from './dto/register';
import { UserRepository } from '@modules/user/user.repository';
import {
  EMAIL_CHANGE_NONE_PENDING,
  EMAIL_CHANGE_SAME,
  INVALID_CREDENTIALS,
  INVALID_VERIFICATION_CODE,
  NOT_FOUND,
  UNVERIFIED_EMAIL,
  USER_CONFLICT,
} from '@constants/errors.constants';
import {
  AuthTokenPurpose,
  NotificationPriority,
  NotificationType,
  Prisma,
  User,
} from '@prisma/client';
import { SignInDto } from '@modules/auth/dto/login.dto';
import { TokenService } from '@modules/auth/token.service';
import { NotificationService } from '@modules/notification/notification.service';
import { ReferralService } from '@modules/referral/referral.service';
import { MailService } from '@modules/mail/mail.service';
import type { MailTemplateId, MailTemplateVars } from '@modules/mail/mail.templates';
import { AuthTokenRepository } from './auth-token.repository';
import {
  ConfirmEmailChangeDto,
  RequestEmailChangeDto,
} from './dto/change-email.dto';
import {
  ForgotPasswordDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/verify-email.dto';
import { Roles } from '@modules/app/app.roles';
import { SignUpResponseEntity } from '@modules/auth/entities/sign-up-response.entity';
import { generateWalletCode } from '@common/wallet-code.util';
import { PrismaService } from '@providers/prisma';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
    private readonly referralService: ReferralService,
    private readonly notifications: NotificationService,
    private readonly mail: MailService,
    private readonly authTokens: AuthTokenRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private verificationRequired(): boolean {
    return this.config.get<boolean>('mail.verificationRequired') === true;
  }

  private async hasPendingEmailVerify(userId: string): Promise<boolean> {
    const n = await this.prisma.authToken.count({
      where: {
        userId,
        purpose: AuthTokenPurpose.email_verify,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    return n > 0;
  }

  /**
   * @desc Create a new user
   * @param signUpDto
   * @returns Promise<User> - Created user
   * @throws ConflictException - User with this email or phone already exists
   */

  async signUp(signUpDto: SignUpDto): Promise<SignUpResponseEntity> {
    const existingUser: User = await this.userRepository.findOne({
      where: { email: signUpDto.email },
    });

    if (existingUser) {
      throw new ConflictException(USER_CONFLICT);
    }

    const hashedPassword = await bcrypt.hash(signUpDto.password, 10);
    const walletCode = await this.uniqueWalletCode();

    const newUserData: Prisma.UserCreateInput = {
      email: signUpDto.email,
      password: hashedPassword,
      username: signUpDto.username,
      phone: signUpDto.phone,
      walletCode,
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
        body: `Bạn nhận ${initialKc.toLocaleString('vi-VN')} KC khi đăng nhập lần đầu.`,
        dedupeKey: `SIGNUP_BONUS:${user.id}`,
        payload: { deeplink: '/wallet', amountKc: initialKc },
      });
    }
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      verificationEmailSent: false,
    };
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<{ verified: true }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new BadRequestException(INVALID_VERIFICATION_CODE);
    }
    if (user.emailVerifiedAt) {
      return { verified: true };
    }
    const ok = await this.authTokens.consume(
      user.id,
      AuthTokenPurpose.email_verify,
      dto.code,
    );
    if (!ok) {
      throw new BadRequestException(INVALID_VERIFICATION_CODE);
    }
    await this.userRepository.update(user.id, {
      emailVerifiedAt: new Date(),
    });
    const initialKc = Number(process.env.INITIAL_KC_BALANCE ?? '2000');
    void this.mail.send({
      to: user.email,
      template: 'signup_welcome',
      vars: {
        email: user.email,
        name: user.username ?? undefined,
        bonusKc: initialKc > 0 ? initialKc : undefined,
      },
    });
    return { verified: true };
  }

  async resendVerification(
    dto: ResendVerificationDto,
  ): Promise<{ sent: boolean }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user || user.emailVerifiedAt) {
      return { sent: true };
    }
    const code = await this.authTokens.issue(
      user.id,
      AuthTokenPurpose.email_verify,
    );
    const sent = await this.deliverMail(user.email, 'email_verify', {
      code,
      email: user.email,
      name: user.username ?? undefined,
    });
    return { sent };
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ sent: boolean }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      return { sent: true };
    }
    const code = await this.authTokens.issue(
      user.id,
      AuthTokenPurpose.password_reset,
    );
    const sent = await this.deliverMail(user.email, 'password_reset', {
      code,
      email: user.email,
    });
    return { sent };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ reset: true }> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email },
    });
    if (!user) {
      throw new BadRequestException(INVALID_VERIFICATION_CODE);
    }
    const ok = await this.authTokens.consume(
      user.id,
      AuthTokenPurpose.password_reset,
      dto.code,
    );
    if (!ok) {
      throw new BadRequestException(INVALID_VERIFICATION_CODE);
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    await this.userRepository.update(user.id, { password: hashedPassword });
    return { reset: true };
  }

  private async uniqueWalletCode(): Promise<string> {
    for (let i = 0; i < 8; i++) {
      const code = generateWalletCode();
      const exists = await this.userRepository.findOne({
        where: { walletCode: code },
      });
      if (!exists) return code;
    }
    return generateWalletCode();
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

    if (
      !testUser.emailVerifiedAt &&
      this.verificationRequired() &&
      (await this.hasPendingEmailVerify(testUser.id))
    ) {
      throw new UnauthorizedException(UNVERIFIED_EMAIL);
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

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  /** Gửi SMTP; `false` khi chưa cấu hình hoặc lỗi — API phải phản ánh `sent`, không luôn `true`. */
  private async deliverMail(
    to: string,
    template: MailTemplateId,
    vars: MailTemplateVars,
  ): Promise<boolean> {
    const sent = await this.mail.send({ to, template, vars });
    if (!sent) {
      const code = vars.code != null ? String(vars.code) : '';
      this.logger.warn(
        `[auth] Không gửi được mail (${template}) → ${to}` +
          (code ? ` — mã (chỉ log server): ${code}` : '') +
          `. SMTP configured=${this.mail.isConfigured()}` +
          (this.mail.getLastVerifyError()
            ? ` verifyErr=${this.mail.getLastVerifyError()}`
            : ''),
      );
    }
    return sent;
  }

  private async assertCurrentPassword(
    user: User,
    currentPassword: string,
  ): Promise<void> {
    const ok = await this.tokenService.isPasswordCorrect(
      currentPassword,
      user.password,
    );
    if (!ok) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
  }

  async requestEmailChange(
    userId: string,
    dto: RequestEmailChangeDto,
  ): Promise<{ pendingEmail: string; sent: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(NOT_FOUND);
    }

    await this.assertCurrentPassword(user, dto.currentPassword);

    const newEmail = this.normalizeEmail(dto.newEmail);
    if (newEmail === this.normalizeEmail(user.email)) {
      throw new BadRequestException(EMAIL_CHANGE_SAME);
    }

    const taken = await this.userRepository.findOne({
      where: { email: newEmail },
    });
    if (taken && taken.id !== userId) {
      throw new ConflictException(USER_CONFLICT);
    }

    await this.userRepository.update(userId, { pendingEmail: newEmail });

    const code = await this.authTokens.issue(
      userId,
      AuthTokenPurpose.email_verify,
    );
    const sent = await this.deliverMail(newEmail, 'email_change_verify', {
      code,
      email: newEmail,
      name: user.username ?? undefined,
    });

    return { pendingEmail: newEmail, sent };
  }

  async resendEmailChange(userId: string): Promise<{ sent: boolean }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.pendingEmail) {
      throw new BadRequestException(EMAIL_CHANGE_NONE_PENDING);
    }

    const code = await this.authTokens.issue(
      userId,
      AuthTokenPurpose.email_change,
    );
    const sent = await this.deliverMail(
      user.pendingEmail,
      'email_change_verify',
      {
        code,
        email: user.pendingEmail,
        name: user.username ?? undefined,
      },
    );
    return { sent };
  }

  async confirmEmailChange(
    userId: string,
    dto: ConfirmEmailChangeDto,
  ): Promise<{ email: string }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user?.pendingEmail) {
      throw new BadRequestException(EMAIL_CHANGE_NONE_PENDING);
    }

    const ok = await this.authTokens.consume(
      userId,
      AuthTokenPurpose.email_verify,
      dto.code,
    );
    if (!ok) {
      throw new BadRequestException(INVALID_VERIFICATION_CODE);
    }

    const newEmail = this.normalizeEmail(user.pendingEmail);
    const taken = await this.userRepository.findOne({
      where: { email: newEmail },
    });
    if (taken && taken.id !== userId) {
      throw new ConflictException(USER_CONFLICT);
    }

    const updated = await this.userRepository.update(userId, {
      email: newEmail,
      pendingEmail: null,
      emailVerifiedAt: new Date(),
    });

    return { email: updated.email };
  }

  async cancelEmailChange(userId: string): Promise<{ cancelled: true }> {
    await this.userRepository.update(userId, { pendingEmail: null });
    await this.prisma.authToken.updateMany({
      where: {
        userId,
        purpose: AuthTokenPurpose.email_verify,
        usedAt: null,
      },
      data: { usedAt: new Date() },
    });
    return { cancelled: true };
  }

  logout(userId: string, accessToken: string): Promise<void> {
    return this.tokenService.logout(userId, accessToken);
  }
}
