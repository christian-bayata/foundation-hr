import { HttpException, HttpStatus } from '@nestjs/common';

export interface ErrorResponseI {
  message: string;
  status?: number;
  location?: string;
}

export class AppException extends HttpException {
  constructor(message: string, status: number = HttpStatus.BAD_REQUEST) {
    super(message, status);
  }
}
