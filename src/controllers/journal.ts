import {validateRequiredFields} from "@/utils/firestore.helper";
import {Request, Response} from "express";
import {GeoPoint, Timestamp} from "firebase-admin/firestore";
import {JournalService} from "@/services/journal.service";
import {EntryService} from "@/services/entry.service";
import _ from "lodash";

const journalController = {
  getAllJournals: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const journalsResult = await JournalService.getUserJournals(userId, res);

      if (!journalsResult.success || !journalsResult.data) return;

      const journalsWithEntries = await Promise.all(
        journalsResult.data.map(async (journal) => {
          const entriesResult = await EntryService.getEntriesByJournalId(
            journal.id!
          );
          return {
            ...journal,
            createdAt: (journal.createdAt as Timestamp).toDate(),
            updatedAt: (journal.updatedAt as Timestamp).toDate(),
            entries: entriesResult.success ? entriesResult.data : [],
          };
        })
      );

      return res.apiResponse(
        {message: "Journals fetched successfully"},
        {journals: journalsWithEntries}
      );
    } catch (error) {
      console.error("Get all journals error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to fetch journals",
        error: String(error),
      });
    }
  },

  getJournalById: async (req: Request, res: Response) => {
    try {
      const journalId = req.params.id;
      const userId = req.user!.id;

      const result = await JournalService.getJournalWithEntries(journalId, res);

      if (!result.success || !result.journal) return;

      if (result.journal.userId !== userId) {
        return res.apiError({
          status: 403,
          message: "Forbidden",
          error: "Access denied",
        });
      }

      return res.apiResponse(
        {message: "Journal retrieved successfully"},
        {
          journal: {
            ...result.journal,
            createdAt: (result.journal.createdAt as Timestamp).toDate(),
            updatedAt: (result.journal.updatedAt as Timestamp).toDate(),
            entries: result.entries || [],
          },
        }
      );
    } catch (error) {
      console.error("Get journal by ID error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to retrieve journal",
        error: String(error),
      });
    }
  },

  createJournal: async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;

      if (!validateRequiredFields(req.body, ["name"], res)) return;

      const {name} = req.body;

      const journal = await JournalService.createJournal(userId, name);

      return res.apiResponse(
        {message: "Journal created successfully"},
        {journal}
      );
    } catch (error) {
      console.error("Create journal error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to create journal",
        error: String(error),
      });
    }
  },

  updateJournal: async (req: Request, res: Response) => {
    try {
      const journalId = req.params.id;
      const userId = req.user!.id;

      if (!validateRequiredFields(req.body, ["name"], res)) return;

      const {name} = req.body;

      const isOwner = await JournalService.isJournalOwner(
        journalId,
        userId,
        res
      );

      if (!isOwner) {
        return res.apiError({
          status: 403,
          message: "Forbidden",
          error: "You do not have permission to update this journal",
        });
      }

      await JournalService.updateJournal(journalId, name);

      return res.apiResponse(
        {message: "Journal updated successfully"},
        {journal: {id: journalId, name}}
      );
    } catch (error) {
      console.error("Update journal error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to update journal",
        error: String(error),
      });
    }
  },

  deleteJournal: async (req: Request, res: Response) => {
    try {
      const journalId = req.params.id;
      const userId = req.user!.id;

      const isOwner = await JournalService.isJournalOwner(
        journalId,
        userId,
        res
      );

      if (!isOwner) {
        return res.apiError({
          status: 403,
          message: "Forbidden",
          error: "You do not have permission to delete this journal",
        });
      }

      await JournalService.deleteJournal(journalId);

      return res.apiResponse({message: "Journal deleted successfully"}, null);
    } catch (error) {
      console.error("Delete journal error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to delete journal",
        error: String(error),
      });
    }
  },

  addJournalEntry: async (req: Request, res: Response) => {
    try {
      const journalId = req.params.id;
      const userId = req.user!.id;

      if (!validateRequiredFields(req.body, ["name", "location"], res)) return;

      const {name, location, images, thought} = req.body;

      const isOwner = await JournalService.isJournalOwner(
        journalId,
        userId,
        res
      );

      if (!isOwner) {
        return res.apiError({
          status: 403,
          message: "Forbidden",
          error: "You do not have permission to add entries to this journal",
        });
      }

      const newGeoPoint = new GeoPoint(
        location.coordinate.latitude,
        location.coordinate.longitude
      );

      const entry = await EntryService.createEntry(
        journalId,
        newGeoPoint,
        {
          place: location.place,
          street: location.street,
          city: location.city,
          region: location.region,
          country: location.country,
          value: location.value,
        },
        {
          name,
          images: images && Array.isArray(images) ? images : [],
          thought,
        }
      );

      return res.apiResponse(
        {message: "Journal entry added successfully"},
        {entry}
      );
    } catch (error) {
      console.error("Add journal entry error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to add journal entry",
        error: String(error),
      });
    }
  },

  updateJournalEntry: async (req: Request, res: Response) => {
    try {
      const {id: journalId, entryId} = req.params;
      const userId = req.user!.id;

      if (!req.body || _.isEmpty(req.body)) {
        return res.apiError({
          status: 400,
          message: "Bad Request",
          error: "No fields to update",
        });
      }

      const {name, location, images, thought} = req.body;

      const isOwner = await JournalService.isJournalOwner(
        journalId,
        userId,
        res
      );

      if (!isOwner) {
        return res.apiError({
          status: 403,
          message: "Forbidden",
          error: "You do not have permission to update this journal entry",
        });
      }

      const entryResult = await EntryService.getEntryById(entryId, res);
      if (!entryResult.success || !entryResult.data) return;

      const belongsToJournal = await EntryService.verifyEntryBelongsToJournal(
        entryId,
        journalId,
        res
      );

      if (!belongsToJournal) {
        return res.apiError({
          status: 400,
          message: "Bad Request",
          error: "Entry does not belong to this journal",
        });
      }

      const updates: any = {};

      if (name) updates.name = name;
      if (images && _.isArray(images)) updates.images = images;
      if (thought !== undefined) updates.thought = thought;

      if (location) {
        updates.location = {
          place: location.place,
          street: location.street,
          city: location.city,
          region: location.region,
          country: location.country,
          value: location.value,
          coordinate: new GeoPoint(
            location.coordinate.latitude,
            location.coordinate.longitude
          ),
        };
      }

      await EntryService.updateEntry(entryId, updates);

      return res.apiResponse(
        {message: "Journal entry updated successfully"},
        {entry: {id: entryId, ...entryResult.data, ...updates}}
      );
    } catch (error) {
      console.error("Update journal entry error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to update journal entry",
        error: String(error),
      });
    }
  },

  deleteJournalEntry: async (req: Request, res: Response) => {
    try {
      const {id: journalId, entryId} = req.params;
      const userId = req.user!.id;

      const isOwner = await JournalService.isJournalOwner(
        journalId,
        userId,
        res
      );

      if (!isOwner) {
        return res.apiError({
          status: 403,
          message: "Forbidden",
          error: "You do not have permission to delete this journal entry",
        });
      }

      const belongsToJournal = await EntryService.verifyEntryBelongsToJournal(
        entryId,
        journalId,
        res
      );

      if (!belongsToJournal) {
        return res.apiError({
          status: 400,
          message: "Bad Request",
          error: "Entry does not belong to this journal",
        });
      }

      await EntryService.deleteEntry(entryId);

      return res.apiResponse(
        {message: "Journal entry deleted successfully"},
        null
      );
    } catch (error) {
      console.error("Delete journal entry error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to delete journal entry",
        error: String(error),
      });
    }
  },

  updateEntryTimes: async (req: Request, res: Response) => {
    try {
      const {id: journalId, entryId} = req.params;
      const userId = req.user!.id;
      if (
        !validateRequiredFields(req.body, ["arrivalTime", "departureTime"], res)
      )
        return;
      const {arrivalTime, departureTime} = req.body;

      const isOwner = await JournalService.isJournalOwner(
        journalId,
        userId,
        res
      );

      if (!isOwner) {
        return res.apiError({
          status: 403,
          message: "Forbidden",
          error: "Access denied",
        });
      }

      const belongsToJournal = await EntryService.verifyEntryBelongsToJournal(
        entryId,
        journalId,
        res
      );

      if (!belongsToJournal) {
        return res.apiError({
          status: 400,
          message: "Entry does not belong to this journal",
          error: "Bad Request",
        });
      }

      const times: any = {};

      if (arrivalTime) {
        times.arrivalTime = Timestamp.fromDate(new Date(arrivalTime));
      }

      if (departureTime) {
        times.departureTime = Timestamp.fromDate(new Date(departureTime));
      }

      await EntryService.updateEntryTimes(entryId, times);

      return res.apiResponse(
        {message: "Entry times updated successfully"},
        null
      );
    } catch (error) {
      console.error("Update entry times error:", error);
      return res.apiError({
        status: 500,
        message: "Failed to update entry times",
        error: String(error),
      });
    }
  },
};

export {journalController};
