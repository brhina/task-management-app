import { Response } from "express";

export interface ApiResponseOptions<T = any> {
  statusCode?: number;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const sendSuccess = <T>(res: Response, options: ApiResponseOptions<T>) => {
  const { statusCode = 200, message, data, pagination } = options;
  return res.status(statusCode).json({
    success: true,
    ...(message && { message }),
    ...(data !== undefined && { data }),
    ...(pagination && { pagination }),
  });
};

export const sendError = (
  res: Response,
  message: string = "An error occurred",
  statusCode: number = 500,
  details?: any,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
  });
};
