import { Injectable } from '@nestjs/common';
import { createHash, randomInt, randomBytes } from 'crypto';

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
}
