import jwt from "jsonwebtoken";
import { config } from "@/config/env";
import { adminDb } from "@/config/firebase";
import { ERole, IBlacklistToken, UserPayload } from "@/types/global";
import { Timestamp } from "firebase-admin/firestore";

export const JWTService = {
  generateToken: (userId: string, role: ERole): string => {
    const payload: UserPayload = {
      id: userId,
      role,
    };
    return jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRE,
    } as jwt.SignOptions);
  },

  verifyToken: (token: string): UserPayload => {
    try {
      return jwt.verify(token, config.JWT_SECRET) as UserPayload;
    } catch (error) {
      throw new Error("Invalid token");
    }
  },

  blacklistToken: async (token: string, userId: string): Promise<void> => {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload;

      if (!decoded || !decoded.exp) {
        throw new Error("Invalid token");
      }

      const expiresAt = Timestamp.fromDate(new Date(decoded.exp * 1000));

      const tokenData: IBlacklistToken = {
        token,
        userId,
        blacklistedAt: Timestamp.now(),
        expiresAt,
      };

      await adminDb.collection("blacklistedTokens").add(tokenData);
      console.info(`Token blacklisted for user: ${userId}`);
    } catch (error) {
      console.error("Error blacklisting token:", error);
      throw error;
    }
  },

  isTokenBlacklisted: async (token: string): Promise<boolean> => {
    try {
      const snapshot = await adminDb
        .collection("blacklistedTokens")
        .where("token", "==", token)
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      console.error("Error checking token blacklist:", error);
      return false;
    }
  },

  cleanupExpiredTokens: async (): Promise<number> => {
    try {
      const now = new Date();

      const snapshot = await adminDb
        .collection("blacklistedTokens")
        .where("expiresAt", "<", now)
        .get();

      if (snapshot.empty) {
        return 0;
      }

      const batch = adminDb.batch();
      snapshot.docs.forEach((doc: any) => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.info(`Cleaned up ${snapshot.size} expired tokens`);
      return snapshot.size;
    } catch (error) {
      console.error("Error cleaning up expired tokens:", error);
      return 0;
    }
  },
};
