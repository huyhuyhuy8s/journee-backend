// src/types/express.d.ts
import { UserPayload, ApiResponse } from "./global";

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      token?: string;
    }
    interface Response {
      apiResponse<T = any>(
        meta: {
          status?: number;
          message: string;
          error?: string;
        },
        results?: T | null
      ): this;

      apiSuccess<T = any>(
        meta: {
          status?: number;
          message: string;
        },
        results?: T
      ): this;

      apiError(meta: { status: number; message: string; error: string }): this;
    }
  }
}

export {};
