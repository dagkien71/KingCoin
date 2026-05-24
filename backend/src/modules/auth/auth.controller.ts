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
import UserBaseEntity from '@modules/user/entities/user-base.entity';
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
  @Serialize(UserBaseEntity)
  @SkipAuth()
  @Post('register')
  create(@Body() signUpDto: SignUpDto): Promise<User> {
    return this.authService.signUp(signUpDto);
  }

  @ApiBody({ type: SignInDto })
  @SkipAuth()
  @Post('login')
  signIn(@Body() signInDto: SignInDto): Promise<Auth.AuthResponse> {
    return this.authService.signIn(signInDto);
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
