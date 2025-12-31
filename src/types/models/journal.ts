import type {ILocation} from '@/types/models/location';

export interface IEntry {
  id: string;
  journalId: string;
  name?: string;
  location: ILocation;
  images: string[];
  thought?: string;
  arrivalTime: Date;
  departureTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IJournal {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  entries?: IEntry[];
}
