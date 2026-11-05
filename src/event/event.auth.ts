import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import type { JwtPayload } from '../common/guards/jwt-auth.guard';
import type { SocketUser } from './event.interface';

@Injectable()
export class EventAuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * @Responsibility: Verify a socket handshake token and resolve the caller.
   *
   * @param socket - The connecting socket
   * @returns {Promise<SocketUser>}
   *
   * @throws {Error} When the token is missing or invalid
   */
  async authenticate(socket: Socket): Promise<SocketUser> {
    const token = this.extractToken(socket);

    if (!token) {
      throw new Error('Missing access token');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
    });

    if (!payload?.sub) {
      throw new Error('Invalid access token');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      userType: payload.userType,
      principalType: payload.principalType,
      employeeId: payload.employeeId,
      adminUserId: payload.adminUserId,
      organizationId: payload.organizationId,
    };
  }

  private extractToken(socket: Socket): string | undefined {
    const authToken = socket.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken.replace(/^Bearer\s+/i, '');
    }

    const authorization = socket.handshake.headers?.authorization;
    if (typeof authorization === 'string' && authorization.length > 0) {
      const [type, token] = authorization.split(' ');
      if (type === 'Bearer' && token) {
        return token;
      }
    }

    const queryToken = socket.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) {
      return queryToken.replace(/^Bearer\s+/i, '');
    }

    return undefined;
  }
}
