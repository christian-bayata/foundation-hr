import { AppException, ErrorResponseI } from './app-exception';

export const AppResponse = {
  success: (message: string, statusCode = 200, data: unknown = {}) => ({
    message,
    status: true,
    statusCode,
    data,
  }),

  error: (err: ErrorResponseI): never => {
    throw new AppException(err.message, err.status ?? 500);
  },
};
