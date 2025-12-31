import type {ILocation} from '@/types';
import type {ELocationSetting, ERole, EUserLocationState} from '@/constants';

export interface IUser {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  roleId: ERole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date;
}

export interface IUserLocationState {
  id?: string;
  userId: string;
  currentState: EUserLocationState;
  lastLocation: ILocation;
  createdAt: Date;
  updatedAt: Date;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface IBlacklist {
  userId: string;
  blockedUsers: string[];
  createdAt: Date;
  updatedAt: Date;
}
