import {adminDb} from "@/config/firebase";
import {IJournal} from "@/types/global";
import {Timestamp} from "firebase-admin/firestore";
import {DateHelper} from "@/utils/date.helper";
import {
  fetchDocument,
  FetchDocumentResult,
  fetchDocumentsWithQuery,
  fetchDocumentWithRelation,
} from "@/utils/firestore.helper";
import {Response} from "express";

export const JournalService = {
  getTodayJournal: async (
    userId: string
  ): Promise<FetchDocumentResult<IJournal>> => {
    const startOfDay = Timestamp.fromDate(DateHelper.getStartOfDay());
    const endOfDay = Timestamp.fromDate(DateHelper.getEndOfDay());

    try {
      const result = await fetchDocumentsWithQuery<IJournal>("journals", [
        {field: "userId", operator: "==", value: userId},
        {field: "createdAt", operator: ">=", value: startOfDay},
        {field: "createdAt", operator: "<=", value: endOfDay},
      ]);

      if (!result.success || !result.parents || result.parents.length === 0) {
        return {success: false};
      }

      return {success: true, data: result.parents[0]};
    } catch (error) {
      console.error("Error getting today's journal:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : 'No stack');
      return {success: false};
    }
  },

  getUserJournals: async (
    userId: string,
    res: Response
  ): Promise<FetchDocumentResult<IJournal[]>> => {
    try {
      const result = await fetchDocumentsWithQuery<IJournal>(
        "journals",
        [{field: "userId", operator: "==", value: userId}],
        undefined,
        undefined,
        res,
        "Journals"
      );

      if (!result.success) {
        return {success: false};
      }

      const sortedJournals = (result.parents || []).sort((a, b) => {
        const aTime = (a.createdAt as Timestamp).toMillis();
        const bTime = (b.createdAt as Timestamp).toMillis();
        return bTime - aTime;
      });

      return {success: true, data: sortedJournals};
    } catch (error) {
      console.error("Error fetching user journals:", error);
      res.apiError({
        status: 500,
        message: "Failed to fetch journals",
        error: String(error),
      });
      return {success: false};
    }
  },

  getJournalById: async (
    journalId: string,
    res: Response
  ): Promise<FetchDocumentResult<IJournal>> => {
    try {
      const result = await fetchDocument<IJournal>(
        "journals",
        journalId,
        res,
        "Journal"
      );

      if (!result.success || !result.data) {
        return {success: false};
      }

      return {success: true, data: {...result.data, id: journalId}};
    } catch (error) {
      console.error("Error getting journal by ID:", error);
      res.apiError({
        status: 500,
        message: "Failed to fetch journal",
        error: String(error),
      });
      return {success: false};
    }
  },

  createJournal: async (userId: string, name: string): Promise<IJournal> => {
    const newJournal: Omit<IJournal, "id"> = {
      userId,
      name,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await adminDb.collection("journals").add(newJournal);

    return {
      id: docRef.id,
      ...newJournal,
    };
  },

  updateJournal: async (journalId: string, name: string): Promise<void> => {
    await adminDb.collection("journals").doc(journalId).update({
      name,
      updatedAt: Timestamp.now(),
    });
  },

  deleteJournal: async (journalId: string): Promise<void> => {
    const batch = adminDb.batch();

    const entriesSnapshot = await adminDb
      .collection("entries")
      .where("journalId", "==", journalId)
      .get();

    entriesSnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    const journalRef = adminDb.collection("journals").doc(journalId);
    batch.delete(journalRef);

    await batch.commit();
  },

  isJournalOwner: async (
    journalId: string,
    userId: string,
    res: Response
  ): Promise<boolean> => {
    const result = await JournalService.getJournalById(journalId, res);

    if (!result.success || !result.data) return false;

    return result.data.userId === userId;
  },

  getJournalWithEntries: async (
    journalId: string,
    res: Response
  ): Promise<{
    success: boolean;
    journal?: IJournal;
    entries?: any[];
  }> => {
    try {
      const result = await fetchDocumentWithRelation<IJournal, any>(
        "journals",
        journalId,
        "entries",
        "journalId",
        res,
        "Journal",
        "Entries"
      );

      if (!result.success || !result.parent) {
        return {success: false};
      }

      return {
        success: true,
        journal: {
          ...result.parent,
          id: journalId,
        },
        entries: result.children || [],
      };
    } catch (error) {
      console.error("Error getting journal with entries:", error);
      return {success: false};
    }
  },
};
