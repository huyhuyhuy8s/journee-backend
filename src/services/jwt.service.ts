import jwt from 'jsonwebtoken';
import {config} from '@/config/env';
import {adminDb} from '@/config/firebase';
import type {IBlacklistToken, UserPayload} from '@/types/global';
import type {ERole} from '@/constants';
import type {QueryDocumentSnapshot} from 'firebase-admin/firestore';

export const generateToken = (userId: string, userRole: ERole): string => {
  const payload: UserPayload = {
    userId,
    userRole,
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRE,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): UserPayload => {
  try {
    return jwt.verify(token, config.JWT_SECRET) as UserPayload;
  } catch {
    throw new Error('Invalid token');
  }
};

export const blacklistToken = async (token: string, userId: string): Promise<void> => {
  const decoded = jwt.decode(token) as jwt.JwtPayload;
  if (!decoded || typeof decoded.exp !== 'number') {
    throw new Error('Token payload missing expired claim');
  }
  const expiresAt = new Date(decoded.exp * 1000);
  try {
    const tokenData: IBlacklistToken = {
      token,
      userId,
      blacklistedAt: new Date(),
      expiresAt,
    };

    await adminDb.collection('blacklistedTokens').add(tokenData);
    console.info(`Token blacklisted for user: ${userId}`);
  } catch (error) {
    console.error('Error blacklisting token:', error);
    throw error;
  }
};

export const isTokenBlacklisted = async (token: string): Promise<boolean> => {
  try {
    const snapshot = await adminDb
      .collection('blacklistedTokens')
      .where('token', '==', token)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error('Error checking token blacklist:', error);
    return false;
  }
};

export const cleanupExpiredTokens = async (): Promise<number> => {
  try {
    const now = new Date();

    const snapshot = await adminDb
      .collection('blacklistedTokens')
      .where('expiresAt', '<', now)
      .get();

    if (snapshot.empty) {
      return 0;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc: QueryDocumentSnapshot) => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    console.info(`Cleaned up ${snapshot.size} expired tokens`);
    return snapshot.size;
  } catch (error) {
    console.error('Error cleaning up expired tokens:', error);
    return 0;
  }
};
