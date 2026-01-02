import _ from 'lodash';
import type {IBlacklist, IUserSetting} from '@/types';
import {adminDb} from '@/config/firebase';
import {ELocationSetting} from '@/constants';

export const checkIsUserExist = async (userId: string) => {
  if (_.isUndefined(userId)) return false;

  const userDoc = await adminDb.collection('users').doc(userId).get();
  return userDoc.exists;
};
export const settingCreation = async (userId: string) => {
  const isUserExist = await checkIsUserExist(userId);
  if (!isUserExist) return;

  const userSettings: IUserSetting = {
    userId,
    visibility: {
      journalEntries: false,
      locationHistory: false,
      location: ELocationSetting.PRECISE,
    },
    action: {
      addFriend: true,
      commentPost: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await adminDb.collection('userSettings').doc(userId).set(userSettings);
};
export const blacklistCreation = async (userId: string) => {
  const isUserExist = await checkIsUserExist(userId);
  if (!isUserExist) return;

  const userBlacklist: IBlacklist = {
    userId,
    blockedUsers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await adminDb.collection('userBlacklists').doc(userId).set(userBlacklist);
};
export const cleanUpUserSettings = async (userId: string) => {
  const settingsSnap = await adminDb
    .collection('userSettings')
    .where('userId', '==', userId)
    .get();

  if (!settingsSnap.empty) {
    const deletions = settingsSnap.docs.map((doc) =>
      adminDb.collection('userSettings').doc(doc.id).delete(),
    );
    await Promise.all(deletions);
  }

  const userBlacklistSnap = await adminDb
    .collection('userBlacklists')
    .where('userId', '==', userId)
    .get();

  if (!userBlacklistSnap.empty) {
    const deletions = userBlacklistSnap.docs.map((doc) =>
      adminDb.collection('userBlacklists').doc(doc.id).delete(),
    );
    await Promise.all(deletions);
  }
};
