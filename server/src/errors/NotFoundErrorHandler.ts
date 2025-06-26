import { NotFoundError } from './index';
import { Request, Response, NextFunction } from 'express';

export const NotFoundErrorHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  throw NotFoundError(
    `The requested resource ${req.originalUrl} was not found`
  );
};