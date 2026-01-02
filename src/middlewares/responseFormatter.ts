import type {NextFunction, Request, Response} from 'express';

export const responseFormatter = (
  _: Request,
  res: Response,
  next: NextFunction,
) => {
  res.apiResponse = function <T = unknown>(
    meta: {
      status?: number;
      message: string;
      error?: string;
    },
    results: T | null = null,
  ): Response {
    return this.status(meta.status || 200).json({
      meta: {
        status: meta.status || 200,
        message: meta.message,
        error: meta.error || null,
      },
      results,
    });
  };

  res.apiSuccess = function <T = unknown>(
    meta: {
      message: string;
      status?: number;
    },
    results: T | null = null,
  ): Response {
    const status = meta.status || 200;
    return this.status(status).json({
      meta: {
        status,
        message: meta.message,
      },
      results,
    });
  };

  res.apiError = function (this: Response, meta: {
    status: number;
    message: string;
    error: string;
  }): Response {
    if (this.headersSent) {
      return this;
    }
    return this.status(meta.status).json({
      meta: {
        status: meta.status,
        message: meta.message,
        error: meta.error,
      },
      results: null,
    });
  };

  next();
};
