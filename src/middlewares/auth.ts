import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWTService } from "@/services/jwt.service";
import { ERole } from "@/types";
import { config } from "@/config/env";

const JWT_SECRET = config.JWT_SECRET;
interface JWTPayload {
  userId: string;
  userRole: ERole;
  iat?: number;
  exp?: number;
}

const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.apiError({
        status: 401,
        message: "Access token required",
        error: "NoTokenProvided",
      });
    }

    const isBlacklisted = await JWTService.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.apiError({
        status: 401,
        message: "Token has been revoked",
        error: "TokenBlacklisted",
      });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error("JWT Verification Error:", err);

        if (err.name === "TokenExpiredError") {
          return res.apiError({
            status: 401,
            message: "Token has expired",
            error: "TokenExpired",
          });
        } else if (err.name === "JsonWebTokenError") {
          return res.apiError({
            status: 401,
            message: "Invalid token",
            error: "InvalidToken",
          });
        } else {
          return res.apiError({
            status: 401,
            message: "Token verification failed",
            error: "TokenVerificationFailed",
          });
        }
      }

      if (!decoded || typeof decoded === "string") {
        return res.apiError({
          status: 401,
          message: "Invalid token payload",
          error: "InvalidToken",
        });
      }

      const payload = decoded as JWTPayload;

      if (!payload.userId) {
        console.error("Missing userId in token payload:", payload);
        return res.apiError({
          status: 401,
          message: "Invalid token payload - missing userId",
          error: "InvalidToken",
        });
      }

      req.user = { id: payload.userId, role: payload.userRole };
      req.token = token;

      console.log("User authenticated:", req.user);
      next();
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return res.apiError({
      status: 500,
      message: "Internal server error during authentication",
      error: "InternalServerError",
    });
  }
};

const adminAuthenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await authenticateToken(req, res, async () => {
    if (req.user?.role !== ERole.ADMIN) {
      return res.apiError({
        status: 403,
        message: "Admin access required",
        error: "AdminAccessRequired",
      });
    }
    next();
  });
};

export { authenticateToken, adminAuthenticateToken };
export {
  authenticateToken as authenticate,
  adminAuthenticateToken as adminAuthenticate,
};
