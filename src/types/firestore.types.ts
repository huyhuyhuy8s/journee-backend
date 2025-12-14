// src/types/firestore.types.ts
import {
  Firestore,
  CollectionReference,
  DocumentData,
  QueryDocumentSnapshot,
  FirestoreDataConverter,
} from "firebase-admin/firestore";
import {
  IBlacklist,
  IBlacklistToken,
  IComment,
  IEntry,
  IJournal,
  IPost,
  IReaction,
  IUser,
  IUserSetting,
} from "./global";

// Type-safe Firestore collections
export interface FirestoreCollections {
  users: CollectionReference<IUser>;
  userSettings: CollectionReference<IUserSetting>;
  userBlacklists: CollectionReference<IBlacklist>;
  reactions: CollectionReference<IReaction>;
  posts: CollectionReference<IPost>;
  journals: CollectionReference<IJournal>;
  entries: CollectionReference<IEntry>;
  comments: CollectionReference<IComment>;
  blacklistedTokens: CollectionReference<IBlacklistToken>;
}

// Firestore data converter helper
export function createConverter<T>(): FirestoreDataConverter<T> {
  return {
    toFirestore: (data: T): DocumentData => {
      return data as DocumentData;
    },
    fromFirestore: (snapshot: QueryDocumentSnapshot): T => {
      return snapshot.data() as T;
    },
  };
}
