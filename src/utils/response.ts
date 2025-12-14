import { Response } from "express";
import { ApiResponse } from "@/types/global";

export const sendResponse = <T = any>(
  res: Response,
  status: number,
  message: string,
  results: T | null = null,
  error: string = ""
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

export const sendSuccess = <T = any>(
  res: Response,
  message: string,
  results: T,
  status: number = 200
) => {
  return sendResponse(res, status, message, results, "");
};

export const sendError = (
  res: Response,
  status: number,
  message: string,
  error: string
) => {
  return sendResponse(res, status, message, null, error);
};
