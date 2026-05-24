import { TokenRepository } from '@modules/auth/token.repository';
import {
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenWhiteList } from '@prisma/client';
import * as bcrypt from 'bcrypt';

class RefreshTokenExpiredException extends HttpException {
  constructor() {
    super('Refresh token has expired.', 498); // Custom status code
  }
}
class TokenExpiredException extends HttpException {
  constructor() {
    super('Token has expired.', 497); // Custom status code
  }
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tokenRepository: TokenRepository,
  ) {}

  async sign(payload): Promise<Auth.AccessRefreshTokens> {
    try {
      const userId = payload.id;
      const _accessToken = await this.createJwtAccessToken(payload);
      const _refreshToken = this.createJwtRefreshToken(payload);

      const _savedRefreshToken =
        await this.tokenRepository.saveRefreshTokenToWhitelist(
          userId,
          _refreshToken,
        );

      if (!_savedRefreshToken) {
        throw new Error('Failed to save refresh token to whitelist.');
      }

      await this.tokenRepository.saveAccessTokenToWhitelist(
        userId,
        _savedRefreshToken.id,
        _accessToken,
      );

      return {
        accessToken: _accessToken,
        refreshToken: _refreshToken,
      };
    } catch (error) {
      console.error('Error during token creation:', error);
      throw error;
    }
  }

  async getAccessTokenFromWhitelist(
    accessToken: string,
  ): Promise<TokenWhiteList | void> {
    try {
      const token = await this.tokenRepository.getAccessTokenFromWhitelist(
        accessToken,
      );

      if (!token) {
        // Nếu token không tồn tại trong whitelist, ném lỗi
        throw new TokenExpiredException();
      }

      return token;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new TokenExpiredException();
      }
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  async refreshTokens(refreshToken: string): Promise<Auth.AccessRefreshTokens> {
    // Check if the refresh token exists in the whitelist
    const token = await this.tokenRepository.getRefreshTokenFromWhitelist(
      refreshToken,
    );

    if (!token) {
      throw new UnauthorizedException('Invalid or missing refresh token.');
    }

    try {
      // Verify the refresh token signature
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshToken'),
      });

      const _payload = {
        id: payload.id,
        email: payload.email,
        role: payload.role,
      };

      // Generate new access and refresh tokens
      const _accessToken = await this.createJwtAccessToken(_payload);
      const _refreshToken = this.createJwtRefreshToken(_payload);

      // Save new refresh token
      const _savedRefreshToken =
        await this.tokenRepository.saveRefreshTokenToWhitelist(
          _payload.id,
          _refreshToken,
        );

      await this.tokenRepository.saveAccessTokenToWhitelist(
        _payload.id,
        _savedRefreshToken.id,
        _accessToken,
      );

      return {
        accessToken: _accessToken,
        refreshToken: _refreshToken,
      };
    } catch (error) {
      // Handle expiration or verification failure
      if (error.name === 'TokenExpiredError') {
        throw new RefreshTokenExpiredException();
      }
      throw new UnauthorizedException('Invalid refresh token.');
    }
  }

  async logout(userId: string, accessToken: string): Promise<void> {
    const _accessToken =
      await this.tokenRepository.getUserAccessTokenFromWhitelist(
        userId,
        accessToken,
      );

    await Promise.all([
      this.tokenRepository.deleteAccessTokenFromWhitelist(_accessToken.id),
      this.tokenRepository.deleteRefreshTokenFromWhitelist(
        _accessToken.refreshTokenId,
      ),
    ]);

    return;
  }

  async isPasswordCorrect(
    dtoPassword: string,
    password: string,
  ): Promise<boolean> {
    if (!password || !dtoPassword) {
      return false;
    }
    if (password.startsWith('$2a$') || password.startsWith('$2b$')) {
      return bcrypt.compare(dtoPassword, password);
    }
    // Tài khoản cũ lưu plaintext — cho phép đăng nhập một lần để migrate hash
    return dtoPassword === password;
  }

  isLegacyPlainPassword(password: string): boolean {
    return (
      typeof password === 'string' &&
      password.length > 0 &&
      !password.startsWith('$2a$') &&
      !password.startsWith('$2b$')
    );
  }

  async createJwtAccessToken(payload: Buffer | object): Promise<string> {
    return await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<number>('jwt.jwtExpAccessToken'),
      secret: this.configService.get<string>('jwt.accessToken'),
    });
  }

  createJwtRefreshToken(payload: Buffer | object): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<number>('jwt.jwtExpRefreshToken'),
      secret: this.configService.get<string>('jwt.refreshToken'),
    });
  }
}
