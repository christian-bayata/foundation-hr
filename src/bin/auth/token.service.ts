import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  userType?: string;
}

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @Responsibility: dedicated service for generating an access token
   *
   * @param payload
   * @returns {Promise<string>}
   */
  async generateAccessToken(payload: AccessTokenPayload): Promise<string> {
    const expiresIn = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
    return this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn,
    } as object);
  }

  /**
   * @Responsibility: dedicated service for generating a token pair (access + refresh)
   *
   * @param payload
   * @returns {Promise<TokenPair>}
   */
  async generateTokenPair(payload: AccessTokenPayload): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(payload),
      this.generateRefreshToken(payload?.sub),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * @Responsibility: dedicated service for generating a refresh token
   *
   * @param userId
   * @returns {Promise<string>}
   */
  async generateRefreshToken(userId: string): Promise<string> {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';
    return this.jwtService.signAsync(
      { sub: userId },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn,
      } as object,
    );
  }

  /**
   * @Responsibility: dedicated service for verifying a refresh token
   *
   * @param token
   * @returns {Promise<{ sub: string }>}
   */
  async verifyRefreshToken(token: string): Promise<{ sub: string }> {
    return this.jwtService.verifyAsync<{ sub: string }>(token, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
    });
  }
}
