import type {IEntry, IJournal, ILocation, TReactionType} from '@/types';

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
  createdAt: Date;
}
