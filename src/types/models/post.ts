import type {IJournal} from '@/types';

export interface IPost {
  id: string;
  userId: string;
  caption: string;
  images?: string[];
  journal?: IJournal[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IComment {
  id: string;
  userId: string;
  postId: string;
  context?: string;
  image?: string;
  createdAt: Date;
}

export type TReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

export interface IReaction {
  id: string;
  userId: string;
  postId: string;
  reactionType: TReactionType;
  createdAt: Date;
  updatedAt: Date;
}
