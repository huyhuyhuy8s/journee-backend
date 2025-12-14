import express from "express";
import { journalController } from "@/controllers/journal";
import { authenticateToken } from "@/middlewares/auth";

const router = express.Router();

router.use(authenticateToken);

// Journal
router.get("/", journalController.getAllJournals);
router.get("/:id", journalController.getJournalById);

router.post("/", journalController.createJournal);
router.patch("/:id", journalController.updateJournal);
router.delete("/:id", journalController.deleteJournal);

// Journal Entries
router.post("/:id/entry", journalController.addJournalEntry);
router.patch("/:id/entry/:entryId", journalController.updateJournalEntry);
router.delete("/:id/entry/:entryId", journalController.deleteJournalEntry);
router.patch("/:id/entry/:entryId/times", journalController.updateEntryTimes);
export default router;
