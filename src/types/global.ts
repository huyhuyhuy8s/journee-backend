import type {ERole} from '@/constants';

export interface IBlacklistToken {
  token: string;
  userId: string;
  blacklistedAt: Date;
  expiresAt: Date;
}

export interface UserPayload {
  userId: string;
  userRole: ERole;
  avatar?: string;
  email?: string;
  name?: string;
  token?: string;
}

/// <reference types="express" />
export interface ApiResponse<T = unknown> {
  meta: {
    status: number;
    message: string;
    error: string;
  };
  results: T | null;
}
