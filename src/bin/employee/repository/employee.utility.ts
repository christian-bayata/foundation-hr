import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EmployeeUtility {
  constructor(private readonly configService: ConfigService) {}

  private algorithm = 'aes-256-ctr';
  private secretKey = Buffer.from(process.env.ENCRYPTION_KEY ?? '', 'base64');

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

  /**
   * @Responsibility: dedicated function to encrypt a value
   *
   * @returns {string}
   */

  encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(this.algorithm, this.secretKey, iv);
      const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
      return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @Responsibility: dedicated function to decrypt an encrypted value
   *
   * @returns {string}
   */

  decrypt(hash: string): string {
    try {
      const [iv, encryptedText] = hash.split(':');
      const decipher = crypto.createDecipheriv(
        this.algorithm,
        this.secretKey,
        Buffer.from(iv, 'hex'),
      );
      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedText, 'hex')),
        decipher.final(),
      ]);
      return decrypted.toString();
    } catch (error) {
      throw error;
    }
  }
}
