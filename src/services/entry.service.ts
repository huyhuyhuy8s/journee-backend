import {adminDb} from '@/config/firebase';
import type {ICoordinates, IEntry, ILocation} from '@/types';
import {GeoPoint} from 'firebase-admin/firestore';
import * as LocationHelper from '@/utils/location.helper';
import {fetchDocument, type FetchDocumentResult, fetchDocumentsWithQuery} from '@/utils/firestore.helper';
import type {Response} from 'express';
import _ from 'lodash';

export const getLatestEntry = async (
  journalId: string,
): Promise<FetchDocumentResult<IEntry>> => {
  try {
    const snapshot = await adminDb
      .collection('entries')
      .where('journalId', '==', journalId)
      .orderBy('arrivalTime', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return {success: false};

    const doc = snapshot.docs[0];
    return {
      success: true,
      data: {id: doc.id, ...doc.data()} as IEntry,
      doc,
    };
  } catch (error) {
    console.error('Error getting latest entry:', error);
    return {success: false};
  }
};

export const getEntriesByJournalId = async (
  journalId: string,
  res?: Response,
): Promise<FetchDocumentResult<IEntry[]>> => {
  try {
    const result = await fetchDocumentsWithQuery<IEntry>(
      'entries',
      [{field: 'journalId', operator: '==', value: journalId}],
      undefined,
      undefined,
      res,
      'Entries',
    );

    if (!result.success || !result.parents) {
      return {success: false};
    }

    const sortedEntries = result.parents.sort((a, b) => {
      const fallbackTime = new Date().getTime();
      const aTime = a.arrivalTime ? a.arrivalTime.getTime() : fallbackTime;
      const bTime = b.arrivalTime ? b.arrivalTime.getTime() : fallbackTime;
      return aTime - bTime;
    });

    return {success: true, data: sortedEntries};
  } catch (error) {
    console.error('Error getting entries by journal ID:', error);
    if (res) {
      res.apiError({
        status: 500,
        message: 'Failed to fetch entries',
        error: String(error),
      });
    }
    return {success: false};
  }
};

export const getEntryById = async (
  entryId: string,
  res: Response,
): Promise<FetchDocumentResult<IEntry>> => {
  try {
    const result = await fetchDocument<IEntry>(
      'entries',
      entryId,
      res,
      'Entry',
    );

    if (!result.success || !result.data) {
      return {success: false};
    }

    return {
      success: true,
      data: {...result.data, id: entryId},
      doc: result.doc,
    };
  } catch (error) {
    console.error('Error getting entry by ID:', error);
    res.apiError({
      status: 500,
      message: 'Failed to fetch entry',
      error: String(error),
    });
    return {success: false};
  }
};

export const addOrUpdateEntry = async (
  journalId: string,
  locationData: Partial<ILocation>,
  additionalData?: {
    name?: string;
    images?: string[];
    thought?: string;
  },
): Promise<IEntry> => {
  const now = new Date();

  if (!locationData.coordinate) {
    throw new Error('Coordinate is required');
  }

  const newGeoPoint = new GeoPoint(
    locationData.coordinate.latitude,
    locationData.coordinate.longitude,
  );

  const latestEntryResult = await getLatestEntry(journalId);

  if (!latestEntryResult.success || !latestEntryResult.data) {
    return await createEntry(
      journalId,
      newGeoPoint,
      locationData,
      additionalData,
      now,
    );
  }

  const data = latestEntryResult.data;

  const isSameLocation = LocationHelper.isSameLocation(
    data.location.coordinate,
    newGeoPoint,
  );

  if (isSameLocation) {
    await adminDb
      .collection('entries')
      .doc(data.id)
      .update({
        departureTime: now,
        updatedAt: now,
      });

    return {
      ...data,
      departureTime: now,
      updatedAt: now,
    };
  } else {
    if (!data.departureTime) {
      await adminDb
        .collection('entries')
        .doc(data.id)
        .update({
          departureTime: now,
          updatedAt: now,
        });
    }

    return await createEntry(
      journalId,
      newGeoPoint,
      locationData,
      additionalData,
      now,
    );
  }
};

export const createEntry = async (
  journalId: string,
  coordinate: ICoordinates,
  locationData: Partial<ILocation>,
  additionalData?: {
    name?: string;
    images?: string[];
    thought?: string;
  },
  arrivalTime: Date = new Date(),
): Promise<IEntry> => {
  const location: ILocation = {
    coordinate,
  };

  if (!_.isUndefined(locationData.place)) location.place = locationData.place;
  if (!_.isUndefined(locationData.street))
    location.street = locationData.street;
  if (!_.isUndefined(locationData.city)) location.city = locationData.city;
  if (!_.isUndefined(locationData.region))
    location.region = locationData.region;
  if (!_.isUndefined(locationData.country))
    location.country = locationData.country;
  if (!_.isUndefined(locationData.value)) location.value = locationData.value;

  const newEntry: Partial<IEntry> = {
    journalId,
    name: additionalData?.name || locationData.place || 'Unknown Location',
    location,
    arrivalTime,
    createdAt: arrivalTime,
    updatedAt: arrivalTime,
  };

  if (!_.isUndefined(additionalData?.images))
    newEntry.images = additionalData.images;
  if (!_.isUndefined(additionalData?.thought))
    newEntry.thought = additionalData.thought;

  const docRef = await adminDb.collection('entries').add(newEntry);

  return {
    ...(newEntry as IEntry),
    id: docRef.id,
  };
};

export const updateEntry = async (
  entryId: string,
  updates: {
    name?: string;
    location?: ILocation;
    images?: string[];
    thought?: string;
  },
): Promise<void> => {
  const updateData: Partial<IEntry> = {
    updatedAt: new Date(),
  };

  if (updates.name) updateData.name = updates.name;
  if (updates.location) updateData.location = updates.location;
  if (updates.images) updateData.images = updates.images;
  if (updates.thought !== undefined) updateData.thought = updates.thought;

  await adminDb.collection('entries').doc(entryId).update(updateData);
};

export const updateEntryTimes = async (
  entryId: string,
  times: {
    arrivalTime?: Date;
    departureTime?: Date;
  },
): Promise<void> => {
  const updateData: Partial<IEntry> = {
    updatedAt: new Date(),
  };

  if (times.arrivalTime) updateData.arrivalTime = times.arrivalTime;
  if (times.departureTime) updateData.departureTime = times.departureTime;

  await adminDb.collection('entries').doc(entryId).update(updateData);
};

export const deleteEntry = async (entryId: string): Promise<void> => {
  await adminDb.collection('entries').doc(entryId).delete();
};

export const verifyEntryBelongsToJournal = async (
  entryId: string,
  journalId: string,
  res: Response,
): Promise<boolean> => {
  const result = await getEntryById(entryId, res);

  if (!result.success || !result.data) return false;

  return result.data.journalId === journalId;
};
