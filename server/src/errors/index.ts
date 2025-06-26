import { CustomApiError } from './CustomApiError';

export const NotFoundError = (msg?: string) => new CustomApiError(msg || 'Not Found', 404);
export const BadRequestError = (msg?: string) => new CustomApiError(msg || 'Bad Request', 400);
export const UnauthorizedError = (msg?: string) => new CustomApiError(msg || 'Unauthorized', 401);
export const ForbiddenError = (msg?: string) => new CustomApiError(msg || 'Forbidden', 403);
export const InternalServerError = (msg?: string) => new CustomApiError(msg || 'Internal Server Error', 500);