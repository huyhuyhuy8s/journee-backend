import type {Response} from 'express';
import type {ApiResponse} from '@/types/global';

export const sendResponse = <T = unknown>(
  res: Response,
  status: number,
  message: string,
  results: T | null = null,
  error = '',
): Response<ApiResponse<T>> => {
  return res.status(status).json({
    meta: {
      status,
      message,
      error,
    },
    results,
  });
};

export const sendSuccess = <T = unknown>(
  res: Response,
  message: string,
  results: T,
  status = 200,
) => {
  return sendResponse(res, status, message, results, '');
};

export const sendError = (
  res: Response,
  status: number,
  message: string,
  error: string,
) => {
  return sendResponse(res, status, message, null, error);
};
