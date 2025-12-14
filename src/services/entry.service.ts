import { adminDb } from "@/config/firebase";
import { IEntry, ILocation } from "@/types/global";
import { GeoPoint, Timestamp } from "firebase-admin/firestore";
import { LocationHelper } from "@/utils/location.helper";
import {
  fetchDocument,
  FetchDocumentResult,
  fetchDocumentsWithQuery,
} from "@/utils/firestore.helper";
import { Response } from "express";
import _ from "lodash";

export const EntryService = {
  getLatestEntry: async (
    journalId: string
  ): Promise<FetchDocumentResult<IEntry>> => {
    try {
      const snapshot = await adminDb
        .collection("entries")
        .where("journalId", "==", journalId)
        .orderBy("arrivalTime", "desc")
        .limit(1)
        .get();

      if (snapshot.empty) return { success: false };

      const doc = snapshot.docs[0];
      return {
        success: true,
        data: { id: doc.id, ...doc.data() } as IEntry,
        doc,
      };
    } catch (error) {
      console.error("Error getting latest entry:", error);
      return { success: false };
    }
  },

  getEntriesByJournalId: async (
    journalId: string,
    res?: Response
  ): Promise<FetchDocumentResult<IEntry[]>> => {
    try {
      const result = await fetchDocumentsWithQuery<IEntry>(
        "entries",
        [{ field: "journalId", operator: "==", value: journalId }],
        undefined,
        undefined,
        res,
        "Entries"
      );

      if (!result.success || !result.parents) {
        return { success: false };
      }

      const sortedEntries = result.parents.sort((a, b) => {
        const aTime = (a.arrivalTime as Timestamp).toMillis();
        const bTime = (b.arrivalTime as Timestamp).toMillis();
        return aTime - bTime;
      });

      return { success: true, data: sortedEntries };
    } catch (error) {
      console.error("Error getting entries by journal ID:", error);
      if (res) {
        res.apiError({
          status: 500,
          message: "Failed to fetch entries",
          error: String(error),
        });
      }
      return { success: false };
    }
  },

  getEntryById: async (
    entryId: string,
    res: Response
  ): Promise<FetchDocumentResult<IEntry>> => {
    try {
      const result = await fetchDocument<IEntry>(
        "entries",
        entryId,
        res,
        "Entry"
      );

      if (!result.success || !result.data) {
        return { success: false };
      }

      return {
        success: true,
        data: { id: entryId, ...result.data },
        doc: result.doc,
      };
    } catch (error) {
      console.error("Error getting entry by ID:", error);
      res.apiError({
        status: 500,
        message: "Failed to fetch entry",
        error: String(error),
      });
      return { success: false };
    }
  },

  addOrUpdateEntry: async (
    journalId: string,
    locationData: Partial<ILocation>,
    additionalData?: {
      name?: string;
      images?: string[];
      thought?: string;
    }
  ): Promise<IEntry> => {
    const now = Timestamp.now();

    if (!locationData.coordinate) {
      throw new Error("Coordinate is required");
    }

    const newGeoPoint = new GeoPoint(
      locationData.coordinate.latitude,
      locationData.coordinate.longitude
    );

    const latestEntryResult = await EntryService.getLatestEntry(journalId);

    if (!latestEntryResult.success || !latestEntryResult.data) {
      return await EntryService.createEntry(
        journalId,
        newGeoPoint,
        locationData,
        additionalData,
        now
      );
    }

    const isSameLocation = LocationHelper.isSameLocation(
      latestEntryResult.data.location.coordinate,
      newGeoPoint
    );

    if (isSameLocation) {
      await adminDb
        .collection("entries")
        .doc(latestEntryResult.data.id!)
        .update({
          departureTime: now,
          updatedAt: now,
        });

      return {
        ...latestEntryResult.data,
        departureTime: now,
        updatedAt: now,
      };
    } else {
      if (!latestEntryResult.data.departureTime) {
        await adminDb
          .collection("entries")
          .doc(latestEntryResult.data.id!)
          .update({
            departureTime: now,
            updatedAt: now,
          });
      }

      return await EntryService.createEntry(
        journalId,
        newGeoPoint,
        locationData,
        additionalData,
        now
      );
    }
  },

  createEntry: async (
    journalId: string,
    coordinate: GeoPoint,
    locationData: Partial<ILocation>,
    additionalData?: {
      name?: string;
      images?: string[];
      thought?: string;
    },
    arrivalTime: Timestamp = Timestamp.now()
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
      name: additionalData?.name || locationData.place || "Unknown Location",
      location,
      arrivalTime,
      createdAt: arrivalTime,
      updatedAt: arrivalTime,
    };

    if (!_.isUndefined(additionalData?.images))
      newEntry.images = additionalData.images;
    if (!_.isUndefined(additionalData?.thought))
      newEntry.thought = additionalData.thought;

    const docRef = await adminDb.collection("entries").add(newEntry);

    return {
      id: docRef.id,
      ...(newEntry as IEntry),
    };
  },

  updateEntry: async (
    entryId: string,
    updates: {
      name?: string;
      location?: ILocation;
      images?: string[];
      thought?: string;
    }
  ): Promise<void> => {
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (updates.name) updateData.name = updates.name;
    if (updates.location) updateData.location = updates.location;
    if (updates.images) updateData.images = updates.images;
    if (updates.thought !== undefined) updateData.thought = updates.thought;

    await adminDb.collection("entries").doc(entryId).update(updateData);
  },

  updateEntryTimes: async (
    entryId: string,
    times: {
      arrivalTime?: Timestamp;
      departureTime?: Timestamp;
    }
  ): Promise<void> => {
    const updateData: any = {
      updatedAt: Timestamp.now(),
    };

    if (times.arrivalTime) updateData.arrivalTime = times.arrivalTime;
    if (times.departureTime) updateData.departureTime = times.departureTime;

    await adminDb.collection("entries").doc(entryId).update(updateData);
  },

  deleteEntry: async (entryId: string): Promise<void> => {
    await adminDb.collection("entries").doc(entryId).delete();
  },

  verifyEntryBelongsToJournal: async (
    entryId: string,
    journalId: string,
    res: Response
  ): Promise<boolean> => {
    const result = await EntryService.getEntryById(entryId, res);

    if (!result.success || !result.data) return false;

    return result.data.journalId === journalId;
  },
};
