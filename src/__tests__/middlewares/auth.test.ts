import {authenticateToken, requireAuth} from '@/middlewares/auth';
import {ERole} from '@/constants';
import type {NextFunction, Request, Response} from 'express';
import jwt from 'jsonwebtoken';
import {isTokenBlacklisted} from '@/services/jwt.service';

// Mock dependencies
jest.mock('@/config/env', () => ({
  config: {
    JWT_SECRET: 'test-secret-key',
    JWT_EXPIRE: '1h',
  },
}));

jest.mock('@/services/jwt.service', () => ({
  isTokenBlacklisted: jest.fn(),
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let apiErrorMock: jest.Mock;

  beforeEach(() => {
    apiErrorMock = jest.fn();
    mockRequest = {
      headers: {},
      user: undefined,
      token: undefined,
    } as Partial<Request>;
    mockResponse = {
      apiError: apiErrorMock,
    } as Partial<Response>;
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return true when user is authenticated', () => {
      mockRequest.user = {
        userId: 'user-123',
        userRole: ERole.USER,
      };

      const result = requireAuth(mockRequest as Request, mockResponse as Response);

      expect(result).toBe(true);
      expect(apiErrorMock).not.toHaveBeenCalled();
    });

    it('should return false when user is not authenticated', () => {
      mockRequest.user = undefined;

      const result = requireAuth(mockRequest as Request, mockResponse as Response);

      expect(result).toBe(false);
      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 401,
        message: 'Unauthorized',
        error: 'User not authenticated',
      });
    });

    it('should return false when user is null', () => {
      (mockRequest as unknown as { user: { userId: string; userRole: ERole } | null }).user = null;

      const result = requireAuth(mockRequest as Request, mockResponse as Response);

      expect(result).toBe(false);
      expect(apiErrorMock).toHaveBeenCalled();
    });

    it('should work as type guard', () => {
      mockRequest.user = {
        userId: 'user-123',
        userRole: ERole.USER,
      };

      if (requireAuth(mockRequest as Request, mockResponse as Response)) {
        // TypeScript should know that req.user is defined here
        expect(mockRequest.user.userId).toBe('user-123');
      }
    });
  });

  describe('authenticateToken', () => {
    const validToken = jwt.sign(
      {userId: 'user-123', userRole: ERole.USER},
      'test-secret-key',
      {expiresIn: '1h'},
    );

    beforeEach(() => {
      (isTokenBlacklisted as jest.Mock).mockResolvedValue(false);
    });

    it('should authenticate valid token', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user?.userId).toBe('user-123');
      expect(mockRequest.token).toBe(validToken);
    });

    it('should return error when no token provided', async () => {
      mockRequest.headers = {};

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 401,
        message: 'Access token required',
        error: 'NoTokenProvided',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error when authorization header is malformed', async () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 401,
        message: 'Access token required',
        error: 'NoTokenProvided',
      });
    });

    it('should return error for blacklisted token', async () => {
      (isTokenBlacklisted as jest.Mock).mockResolvedValue(true);
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 401,
        message: 'Token has been revoked',
        error: 'TokenBlacklisted',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error for expired token', async () => {
      const expiredToken = jwt.sign(
        {userId: 'user-123', userRole: ERole.USER},
        'test-secret-key',
        {expiresIn: '-1s'},
      );

      mockRequest.headers = {
        authorization: `Bearer ${expiredToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 401,
        message: 'Token has expired',
        error: 'TokenExpired',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error for invalid token signature', async () => {
      const invalidToken = jwt.sign(
        {userId: 'user-123', userRole: ERole.USER},
        'wrong-secret',
        {expiresIn: '1h'},
      );

      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 401,
        message: 'Invalid token',
        error: 'InvalidToken',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return error for malformed token', async () => {
      mockRequest.headers = {
        authorization: 'Bearer not-a-valid-jwt',
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 401,
        message: 'Invalid token',
        error: 'InvalidToken',
      });
    });

    it('should return error for string decoded token', async () => {
      // This is a edge case that shouldn't happen in practice
      jest.spyOn(jwt, 'verify').mockImplementation(((token: string, secret: unknown, callback?: (err: unknown, decoded?: unknown) => void) => {
        if (callback) {
          callback(null, 'string-payload');
        }
      }) as typeof jwt.verify);

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 401,
        message: 'Invalid token payload',
        error: 'InvalidToken',
      });

      jest.restoreAllMocks();
    });

    it('should return error for token without userId', async () => {
      const tokenWithoutUserId = jwt.sign(
        {userRole: ERole.USER},
        'test-secret-key',
        {expiresIn: '1h'},
      );

      mockRequest.headers = {
        authorization: `Bearer ${tokenWithoutUserId}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(apiErrorMock).toHaveBeenCalledWith({
        status: 401,
        message: 'Invalid token payload - missing userId',
        error: 'InvalidToken',
      });
    });

    it('should handle all user roles', async () => {
      const roles = [ERole.USER, ERole.ADMIN, ERole.MODERATOR];

      for (const role of roles) {
        const token = jwt.sign(
          {userId: 'user-123', userRole: role},
          'test-secret-key',
          {expiresIn: '1h'},
        );

        mockRequest.headers = {
          authorization: `Bearer ${token}`,
        };

        jest.clearAllMocks();

        await authenticateToken(
          mockRequest as Request,
          mockResponse as Response,
          mockNext,
        );

        expect(mockRequest.user?.userRole).toBe(role);
        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('should set both user and token on request', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.token).toBe(validToken);
    });

    it('should log user authentication', async () => {
      const consoleSpy = jest.spyOn(console, 'info');
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'User authenticated:',
        expect.objectContaining({
          userId: 'user-123',
          userRole: ERole.USER,
        }),
      );
    });

    it('should log JWT verification errors', async () => {
      const consoleSpy = jest.spyOn(console, 'error');
      const invalidToken = 'invalid-token';

      mockRequest.headers = {
        authorization: `Bearer ${invalidToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'JWT Verification Error:',
        expect.any(Error),
      );
    });

    it('should handle Bearer token with extra spaces', async () => {
      mockRequest.headers = {
        authorization: `Bearer  ${validToken}  `,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Should fail because of extra spaces
      expect(apiErrorMock).toHaveBeenCalled();
    });

    it('should handle lowercase bearer', async () => {
      mockRequest.headers = {
        authorization: `bearer ${validToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // Current implementation is case-sensitive, so this should work
      expect(mockNext).toHaveBeenCalled();
    });

    it('should not call next multiple times', async () => {
      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should handle isTokenBlacklisted errors gracefully', async () => {
      (isTokenBlacklisted as jest.Mock).mockRejectedValue(new Error('Database error'));

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      // The function catches the error and doesn't rethrow it
      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      // It should not call next since an error occurred
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should check blacklist before verifying token', async () => {
      const checkOrder: string[] = [];

      (isTokenBlacklisted as jest.Mock).mockImplementation(async () => {
        checkOrder.push('blacklist');
        return false;
      });

      jest.spyOn(jwt, 'verify').mockImplementation(((token: string, secret: unknown, callback?: (err: unknown, decoded?: unknown) => void) => {
        checkOrder.push('verify');
        const decoded = jwt.decode(token);
        if (callback) {
          callback(null, decoded);
        }
      }) as typeof jwt.verify);

      mockRequest.headers = {
        authorization: `Bearer ${validToken}`,
      };

      await authenticateToken(
        mockRequest as Request,
        mockResponse as Response,
        mockNext,
      );

      expect(checkOrder).toEqual(['blacklist', 'verify']);

      jest.restoreAllMocks();
    });
  });
});


