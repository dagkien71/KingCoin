import ApiBaseResponses from '@decorators/api-base-response.decorator';
import Serialize from '@decorators/serialize.decorator';
import { SignInDto } from '@modules/auth/dto/login.dto';
import RefreshTokenDto from '@modules/auth/dto/refresh-token.dto';
import { TokensEntity } from '@modules/auth/entities/tokens.entity';
import { SkipAuth } from '@modules/auth/skip-auth.guard';
import {
  AccessGuard,
  Actions,
  CaslUser,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import { SignUpResponseEntity } from '@modules/auth/entities/sign-up-response.entity';
import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/register';
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
import { TokenService } from './token.service';

@ApiTags('Auth')
@ApiBaseResponses()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly tokenService: TokenService,
  ) {}

  @ApiBody({ type: SignUpDto })
  @Serialize(SignUpResponseEntity)
  @SkipAuth()
  @Post('register')
  create(@Body() signUpDto: SignUpDto): Promise<SignUpResponseEntity> {
    return this.authService.signUp(signUpDto);
  }

  @ApiBody({ type: SignInDto })
  @SkipAuth()
  @Post('login')
  signIn(@Body() signInDto: SignInDto): Promise<Auth.AuthResponse> {
    return this.authService.signIn(signInDto);
  }

  @SkipAuth()
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @SkipAuth()
  @Post('resend-verification')
  resendVerification(@Body() dto: ResendVerificationDto) {
    return this.authService.resendVerification(dto);
  }

  @SkipAuth()
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @SkipAuth()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @ApiBody({ type: RequestEmailChangeDto })
  @Post('email-change/request')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  async requestEmailChange(
    @Body() dto: RequestEmailChangeDto,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    return this.authService.requestEmailChange(user.id, dto);
  }

  @ApiBody({ type: ConfirmEmailChangeDto })
  @Post('email-change/confirm')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  async confirmEmailChange(
    @Body() dto: ConfirmEmailChangeDto,
    @CaslUser() userProxy?: UserProxy<User>,
  ) {
    const user = await userProxy.get();
    return this.authService.confirmEmailChange(user.id, dto);
  }

  @Post('email-change/resend')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  async resendEmailChange(@CaslUser() userProxy?: UserProxy<User>) {
    const user = await userProxy.get();
    return this.authService.resendEmailChange(user.id);
  }

  @Post('email-change/cancel')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  async cancelEmailChange(@CaslUser() userProxy?: UserProxy<User>) {
    const user = await userProxy.get();
    return this.authService.cancelEmailChange(user.id);
  }

  @ApiBody({ type: RefreshTokenDto })
  @SkipAuth()
  @Post('token/refresh')
  refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<Auth.AccessRefreshTokens | void> {
    return this.tokenService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @ApiBadRequestResponse()
  @Post('logout')
  @ApiBearerAuth()
  @UseGuards(AccessGuard)
  @UseAbility(Actions.delete, TokensEntity)
  async logout(@CaslUser() userProxy?: UserProxy<User>) {
    const { accessToken } = await userProxy.getMeta();
    const { id: userId } = await userProxy.get();

    return this.authService.logout(userId, accessToken);
  }
}
