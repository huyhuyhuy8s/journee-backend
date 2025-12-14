import { Request } from "express";
import { GeoPoint, Timestamp } from "firebase-admin/firestore";

export enum EUserLocationState {
  FAST_MOVING = "FAST_MOVING",
  SLOW_MOVING = "SLOW_MOVING",
  STATIONARY = "STATIONARY",
}

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  roleId: ERole;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  lastLogin: Timestamp | Date;
}

export interface IUserLocationState {
  id?: string;
  userId: string;
  currentState: EUserLocationState;
  lastLocation: ILocation;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export enum ERole {
  ADMIN = "Nintendo7131",
  MODERATOR = "Destiny4015",
  USER = "Salon4637",
}

export enum ELocationSetting {
  PRECISE = "precise",
  BLURRED = "blurred",
  FROZEN = "frozen",
  HIDDEN = "hidden",
}

export type TActionSetting = {
  addFriend: boolean;
  commentPost: boolean;
};

export type TVisibilitySetting = {
  journalEntries: boolean;
  locationHistory: boolean;
  location: ELocationSetting;
};

export interface IUserSetting {
  userId: string;
  visibility: TVisibilitySetting;
  action: TActionSetting;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface IBlacklist {
  userId: string;
  blockedUsers: string[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface IJournal {
  id: string;
  userId: string;
  name: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  entries?: IEntry[];
}

export interface IEntry {
  id?: string;
  journalId: string;
  name?: string;
  location: ILocation;
  images: string[];
  thought?: string;
  arrivalTime: Timestamp | Date;
  departureTime?: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface ILocation {
  place?: string;
  street?: string;
  city?: string;
  region?: string;
  country?: string;
  value?: string;
  coordinate: GeoPoint;
}

export interface IPost {
  id: string;
  userId: string;
  caption: string;
  images?: string[];
  journal?: IJournal[];
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface IComment {
  id: string;
  userId: string;
  postId: string;
  context?: string;
  image?: string;
  createdAt: Timestamp | Date;
}

export type TReactionType = "like" | "love" | "haha" | "wow" | "sad" | "angry";

export interface IReaction {
  id: string;
  userId: string;
  postId: string;
  reactionType: TReactionType;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export type TMessageType =
  | string
  | ILocation
  | IJournal
  | IEntry
  | TReactionType;

export interface IMessage {
  id: string;
  senderId: string;
  receiverId: string;
  context: TMessageType;
  createdAt: Timestamp | Date;
}

export interface IBlacklistToken {
  token: string;
  userId: string;
  blacklistedAt: Timestamp | Date;
  expiresAt: Timestamp | Date;
}

export interface UserPayload {
  id: string;
  role: ERole;
  avatar?: string;
  email?: string;
  name?: string;
  token?: string;
}

export interface AuthRequest extends Request {
  user?: UserPayload;
  token?: string;
}

export interface LocationData {
  userId: string;
  latitude: number;
  longitude: number;
  timestamp: Timestamp | Date;
  accuracy?: number;
  speed?: number | null;
  movementState?: "STATIONARY" | "SLOW_MOVING" | "FAST_MOVING" | "UNKNOWN";
  enhancedPlace?: string;
  enhancedAddress?: string;
  geocodingSource?: string;
  geocodingConfidence?: string;
}

export interface VisitData {
  userId: string;
  externalId: string;
  placeName: string;
  address: string;
  latitude: number;
  longitude: number;
  arrivalTime: Date;
  departureTime?: Date | null;
  duration?: number | null;
  visitType: "confirmed" | "potential" | "brief";
  confidence: "high" | "medium" | "low";
  geocodingSource: string;
  metadata: {
    maxSpeed: number;
    minSpeed: number;
    averageSpeed: number;
    stationaryDuration: number;
    source: string;
    version: string;
  };
}

/// <reference types="express" />
export interface ApiResponse<T = any> {
  meta: {
    status: number;
    message: string;
    error: string;
  };
  results: T | null;
}
