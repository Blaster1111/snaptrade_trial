import { InternalServerError } from ".";
import { CustomApiError } from "./CustomApiError";
import { NextFunction, Request, Response } from "express";

export const GlobalErrorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (err instanceof CustomApiError) {
      res
        .status(err.statusCode)
        .json(err);
      return;
    }
    // console.error("Unhandled error:", err);
    res.status(500).json(InternalServerError());
  } catch (e) {
    // console.error("Error in GlobalErrorHandler:", e);
    res.status(500).json(InternalServerError());
  }
};
