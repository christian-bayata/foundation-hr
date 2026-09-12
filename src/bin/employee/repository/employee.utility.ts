import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'crypto';

@Injectable()
export class EmployeeUtility {
  constructor(private readonly configService: ConfigService) {}

  private readonly logger = new Logger(EmployeeUtility.name);

  /**
   * @Responsibility: fxn to create 10-digit alphanumeric number
   * @param dateStr
   * @returns {*}
   */

  generateUniqueId(length = 10): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let code = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }
}
