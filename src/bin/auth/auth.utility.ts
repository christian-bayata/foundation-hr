import { Injectable } from '@nestjs/common';
import { createHash, randomInt, randomBytes } from 'crypto';
import * as crypto from 'crypto';

@Injectable()
export class AuthUtility {
  generateOtp(): string {
    return String(randomInt(1000, 10000));
  }

  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  randomToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * @Responsibility: dedicated function for generating random password
   *
   * @returns {number}
   */

  generateRandomString(length = 10) {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(crypto.randomInt(chars.length));
    }
    return result;
  }
}
