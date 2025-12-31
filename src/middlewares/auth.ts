import type {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {config} from '@/config/env';
import {ERole} from '@/constants';
import {isTokenBlacklisted} from '@/services/jwt.service';

interface JWTPayload {
  userId: string;
  userRole: ERole;
  iat?: number;
  exp?: number;
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.apiError({
        status: 401,
        message: 'Access token required',
        error: 'NoTokenProvided',
      });
    }

    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.apiError({
        status: 401,
        message: 'Token has been revoked',
        error: 'TokenBlacklisted',
      });
    }

    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT Verification Error:', err);

        if (err.name === 'TokenExpiredError') {
          return res.apiError({
            status: 401,
            message: 'Token has expired',
            error: 'TokenExpired',
          });
        } else if (err.name === 'JsonWebTokenError') {
          return res.apiError({
            status: 401,
            message: 'Invalid token',
            error: 'InvalidToken',
          });
        } else {
          return res.apiError({
            status: 401,
            message: 'Token verification failed',
            error: 'TokenVerificationFailed',
          });
        }
      }

      if (!decoded || typeof decoded === 'string') {
        return res.apiError({
          status: 401,
          message: 'Invalid token payload',
          error: 'InvalidToken',
        });
      }

      const payload = decoded as JWTPayload;

      if (!payload.userId) {
        console.error('Missing userId in token payload:', payload);
        return res.apiError({
          status: 401,
          message: 'Invalid token payload - missing userId',
          error: 'InvalidToken',
        });
      }

      req.user = {id: payload.userId, role: payload.userRole};
      req.token = token;

      console.info('User authenticated:', req.user);
      next();
    });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.apiError({
      status: 500,
      message: 'Internal server error during authentication',
      error: 'InternalServerError',
    });
  }
};

export const adminAuthenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await authenticateToken(req, res, async () => {
    if (req.user && req.user.role !== ERole.ADMIN) {
      return res.apiError({
        status: 403,
        message: 'Permission denied',
        error: 'Permission Denied',
      });
    }
    next();
  });
};

export const moderatorAuthenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  await authenticateToken(req, res, async () => {
    if (req.user && req.user.role === ERole.USER) {
      return res.apiError({
        status: 403,
        message: 'Permission denied',
        error: 'Permission Denied',
      });
    }
    next();
  });
};
