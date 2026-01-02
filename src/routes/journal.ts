import express from 'express';
import {authenticateToken} from '@/middlewares/auth';
import {
  addJournalEntry,
  createJournal,
  deleteJournal,
  deleteJournalEntry,
  getAllJournals,
  getJournalById,
  getTodayJournal,
  updateEntryTimes,
  updateJournal,
  updateJournalEntry
} from '@/controllers';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAllJournals);
router.get('/today', getTodayJournal);
router.get('/:id', getJournalById);

router.post('/', createJournal);
router.patch('/:id', updateJournal);
router.delete('/:id', deleteJournal);

router.post('/:id/entry', addJournalEntry);
router.patch('/:id/entry/:entryId', updateJournalEntry);
router.delete('/:id/entry/:entryId', deleteJournalEntry);

router.patch('/:id/entry/:entryId/times', updateEntryTimes);

export default router;
