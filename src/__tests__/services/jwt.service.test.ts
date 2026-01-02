import jwt from 'jsonwebtoken';
import {
  blacklistToken,
  cleanupExpiredTokens,
  generateToken,
  isTokenBlacklisted,
  verifyToken,
} from '@/services/jwt.service';
import {ERole} from '@/constants';
import type {UserPayload} from '@/types/global';

// Mock Firebase admin
jest.mock('@/config/firebase', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      add: jest.fn(),
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
        get: jest.fn(),
      })),
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
    batch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn(),
    })),
  },
}));

// Mock config
jest.mock('@/config/env', () => ({
  config: {
    JWT_SECRET: 'test-secret-key',
    JWT_EXPIRE: '1h',
  },
}));

describe('JWT Service', () => {
  const mockUserId = 'user-123';
  const mockUserRole = ERole.USER;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(mockUserId, mockUserRole);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include userId in token payload', () => {
      const token = generateToken(mockUserId, mockUserRole);
      const decoded = jwt.decode(token) as UserPayload;

      expect(decoded.userId).toBe(mockUserId);
    });

    it('should include userRole in token payload', () => {
      const token = generateToken(mockUserId, mockUserRole);
      const decoded = jwt.decode(token) as UserPayload;

      expect(decoded.userRole).toBe(mockUserRole);
    });

    it('should generate different tokens for different users', () => {
      const token1 = generateToken('user-1', ERole.USER);
      const token2 = generateToken('user-2', ERole.USER);

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for different roles', () => {
      const token1 = generateToken(mockUserId, ERole.USER);
      const token2 = generateToken(mockUserId, ERole.ADMIN);

      expect(token1).not.toBe(token2);
    });

    it('should generate token with expiration', () => {
      const token = generateToken(mockUserId, mockUserRole);
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');
    });

    it('should generate token with issued at timestamp', () => {
      const token = generateToken(mockUserId, mockUserRole);
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
    });

    it('should handle admin role', () => {
      const token = generateToken(mockUserId, ERole.ADMIN);
      const decoded = jwt.decode(token) as UserPayload;

      expect(decoded.userRole).toBe(ERole.ADMIN);
    });

    it('should handle moderator role', () => {
      const token = generateToken(mockUserId, ERole.MODERATOR);
      const decoded = jwt.decode(token) as UserPayload;

      expect(decoded.userRole).toBe(ERole.MODERATOR);
    });

    it('should generate token that can be verified', () => {
      const token = generateToken(mockUserId, mockUserRole);
      const verified = jwt.verify(token, 'test-secret-key');

      expect(verified).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = generateToken(mockUserId, mockUserRole);
      const payload = verifyToken(token);

      expect(payload).toBeDefined();
      expect(payload.userId).toBe(mockUserId);
      expect(payload.userRole).toBe(mockUserRole);
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow('Invalid token');
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        verifyToken('not-a-jwt-token');
      }).toThrow('Invalid token');
    });

    it('should throw error for token with wrong secret', () => {
      const token = jwt.sign({userId: mockUserId}, 'wrong-secret', {expiresIn: '1h'});

      expect(() => {
        verifyToken(token);
      }).toThrow('Invalid token');
    });

    it('should throw error for expired token', () => {
      const token = jwt.sign(
        {userId: mockUserId, userRole: mockUserRole},
        'test-secret-key',
        {expiresIn: '-1s'}, // Already expired
      );

      expect(() => {
        verifyToken(token);
      }).toThrow('Invalid token');
    });

    it('should return correct payload structure', () => {
      const token = generateToken(mockUserId, ERole.ADMIN);
      const payload = verifyToken(token);

      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('userRole');
    });

    it('should verify token with all role types', () => {
      const roles = [ERole.USER, ERole.ADMIN, ERole.MODERATOR];

      roles.forEach(role => {
        const token = generateToken(mockUserId, role);
        const payload = verifyToken(token);
        expect(payload.userRole).toBe(role);
      });
    });

    it('should throw error for empty token', () => {
      expect(() => {
        verifyToken('');
      }).toThrow('Invalid token');
    });
  });

  describe('blacklistToken', () => {
    const {adminDb} = require('@/config/firebase');

    beforeEach(() => {
      adminDb.collection.mockReturnValue({
        add: jest.fn().mockResolvedValue({id: 'blacklist-id'}),
      });
    });

    it('should blacklist a valid token', async () => {
      const token = generateToken(mockUserId, mockUserRole);

      await expect(blacklistToken(token, mockUserId)).resolves.not.toThrow();

      expect(adminDb.collection).toHaveBeenCalledWith('blacklistedTokens');
    });

    it('should store token data in database', async () => {
      const token = generateToken(mockUserId, mockUserRole);
      const mockAdd = jest.fn().mockResolvedValue({id: 'blacklist-id'});

      adminDb.collection.mockReturnValue({
        add: mockAdd,
      });

      await blacklistToken(token, mockUserId);

      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          token,
          userId: mockUserId,
          blacklistedAt: expect.any(Date),
          expiresAt: expect.any(Date),
        }),
      );
    });

    it('should set correct expiration date from token', async () => {
      const token = generateToken(mockUserId, mockUserRole);
      const decoded = jwt.decode(token) as jwt.JwtPayload;
      const mockAdd = jest.fn().mockResolvedValue({id: 'blacklist-id'});

      adminDb.collection.mockReturnValue({
        add: mockAdd,
      });

      await blacklistToken(token, mockUserId);

      const addedData = mockAdd.mock.calls[0][0];

      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');

      const exp = decoded.exp as number;
      expect(addedData.expiresAt.getTime()).toBe(exp * 1000);
    });

    it('should throw error for token without expiration', async () => {
      const tokenWithoutExp = jwt.sign({userId: mockUserId}, 'test-secret-key');

      await expect(blacklistToken(tokenWithoutExp, mockUserId)).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      const token = generateToken(mockUserId, mockUserRole);
      const mockAdd = jest.fn().mockRejectedValue(new Error('Database error'));

      adminDb.collection.mockReturnValue({
        add: mockAdd,
      });

      await expect(blacklistToken(token, mockUserId)).rejects.toThrow('Database error');
    });

    it('should log blacklist action', async () => {
      const token = generateToken(mockUserId, mockUserRole);
      const consoleSpy = jest.spyOn(console, 'info');

      await blacklistToken(token, mockUserId);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(`Token blacklisted for user: ${mockUserId}`));
    });
  });

  describe('isTokenBlacklisted', () => {
    const {adminDb} = require('@/config/firebase');

    it('should return true for blacklisted token', async () => {
      const mockGet = jest.fn().mockResolvedValue({empty: false});

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      const result = await isTokenBlacklisted('some-token');

      expect(result).toBe(true);
    });

    it('should return false for non-blacklisted token', async () => {
      const mockGet = jest.fn().mockResolvedValue({empty: true});

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      const result = await isTokenBlacklisted('some-token');

      expect(result).toBe(false);
    });

    it('should query correct collection and field', async () => {
      const mockWhere = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({empty: true}),
        }),
      });

      adminDb.collection.mockReturnValue({
        where: mockWhere,
      });

      const token = 'test-token';
      await isTokenBlacklisted(token);

      expect(adminDb.collection).toHaveBeenCalledWith('blacklistedTokens');
      expect(mockWhere).toHaveBeenCalledWith('token', '==', token);
    });

    it('should limit query to 1 result', async () => {
      const mockLimit = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({empty: true}),
      });

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: mockLimit,
        }),
      });

      await isTokenBlacklisted('test-token');

      expect(mockLimit).toHaveBeenCalledWith(1);
    });

    it('should return true on database error (fail-safe)', async () => {
      const mockGet = jest.fn().mockRejectedValue(new Error('Database error'));

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      const result = await isTokenBlacklisted('some-token');

      expect(result).toBe(true);
    });

    it('should log errors', async () => {
      const mockGet = jest.fn().mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error');

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            get: mockGet,
          }),
        }),
      });

      await isTokenBlacklisted('some-token');

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredTokens', () => {
    const {adminDb} = require('@/config/firebase');

    it('should return 0 when no expired tokens exist', async () => {
      const mockGet = jest.fn().mockResolvedValue({empty: true, size: 0});

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });

      const result = await cleanupExpiredTokens();

      expect(result).toBe(0);
    });

    it('should delete expired tokens', async () => {
      const mockDocs = [
        {ref: {id: 'doc1'}},
        {ref: {id: 'doc2'}},
      ];

      const mockGet = jest.fn().mockResolvedValue({
        empty: false,
        size: 2,
        docs: mockDocs,
      });

      const mockDelete = jest.fn();
      const mockCommit = jest.fn().mockResolvedValue(undefined);
      const mockBatch = {
        delete: mockDelete,
        commit: mockCommit,
      };

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });
      adminDb.batch.mockReturnValue(mockBatch);

      const result = await cleanupExpiredTokens();

      expect(result).toBe(2);
      expect(mockDelete).toHaveBeenCalledTimes(2);
      expect(mockCommit).toHaveBeenCalled();
    });

    it('should query tokens with expiresAt less than now', async () => {
      const mockWhere = jest.fn().mockReturnValue({
        get: jest.fn().mockResolvedValue({empty: true, size: 0}),
      });

      adminDb.collection.mockReturnValue({
        where: mockWhere,
      });

      await cleanupExpiredTokens();

      expect(mockWhere).toHaveBeenCalledWith('expiresAt', '<', expect.any(Date));
    });

    it('should handle batch deletion for large number of tokens', async () => {
      // Create 1000 mock documents
      const mockDocs = Array.from({length: 1000}, (_, i) => ({
        ref: {id: `doc${i}`},
      }));

      const mockGet = jest.fn().mockResolvedValue({
        empty: false,
        size: 1000,
        docs: mockDocs,
      });

      const mockDelete = jest.fn();
      const mockCommit = jest.fn().mockResolvedValue(undefined);
      const mockBatch = {
        delete: mockDelete,
        commit: mockCommit,
      };

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });
      adminDb.batch.mockReturnValue(mockBatch);

      const result = await cleanupExpiredTokens();

      expect(result).toBe(1000);
      // Should create 2 batches (500 items each)
      expect(mockCommit).toHaveBeenCalledTimes(2);
    });

    it('should log cleanup results', async () => {
      const mockGet = jest.fn().mockResolvedValue({
        empty: false,
        size: 5,
        docs: Array(5).fill({ref: {id: 'doc'}}),
      });

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });
      adminDb.batch.mockReturnValue({
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(undefined),
      });

      const consoleSpy = jest.spyOn(console, 'info');

      await cleanupExpiredTokens();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Cleaned up 5 expired tokens'));
    });

    it('should return 0 on database error', async () => {
      const mockGet = jest.fn().mockRejectedValue(new Error('Database error'));

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });

      const result = await cleanupExpiredTokens();

      expect(result).toBe(0);
    });

    it('should log errors', async () => {
      const mockGet = jest.fn().mockRejectedValue(new Error('Database error'));
      const consoleSpy = jest.spyOn(console, 'error');

      adminDb.collection.mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: mockGet,
        }),
      });

      await cleanupExpiredTokens();

      expect(consoleSpy).toHaveBeenCalledWith('Error cleaning up expired tokens:', expect.any(Error));
    });
  });
});

