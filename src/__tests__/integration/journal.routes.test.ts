import request from 'supertest';
import express, {type Application} from 'express';
import journalRoutes from '@/routes/journal';
import {responseFormatter} from '@/middlewares/responseFormatter';

// Mock the controllers
jest.mock('@/controllers', () => ({
  getAllJournals: jest.fn((req, res) => {
    return res.apiSuccess({
      message: 'Journals retrieved successfully',
    }, [
      {id: 'journal-1', name: 'My First Journal', userId: req.user.userId},
      {id: 'journal-2', name: 'Travel Journal', userId: req.user.userId},
    ]);
  }),
  getTodayJournal: jest.fn((req, res) => {
    return res.apiSuccess({
      message: 'Today\'s journal retrieved',
    }, {
      id: 'journal-today',
      name: 'Today\'s Journal',
      userId: req.user.userId,
      createdAt: new Date().toISOString(),
    });
  }),
  getJournalById: jest.fn((req, res) => {
    const {id} = req.params;
    if (id === 'not-found') {
      return res.apiError({
        status: 404,
        message: 'Journal not found',
        error: 'NotFound',
      });
    }
    return res.apiSuccess({
      message: 'Journal retrieved successfully',
    }, {
      id,
      name: 'Test Journal',
      userId: req.user.userId,
      entries: [],
    });
  }),
  createJournal: jest.fn((req, res) => {
    const {name} = req.body;
    if (!name) {
      return res.apiError({
        status: 400,
        message: 'Journal name is required',
        error: 'ValidationError',
      });
    }
    return res.apiSuccess({
      message: 'Journal created successfully',
      status: 201,
    }, {
      id: 'journal-new',
      name,
      userId: req.user.userId,
      createdAt: new Date().toISOString(),
    });
  }),
  updateJournal: jest.fn((req, res) => {
    const {id} = req.params;
    const {name} = req.body;
    return res.apiSuccess({
      message: 'Journal updated successfully',
    }, {
      id,
      name: name || 'Updated Journal',
      userId: req.user.userId,
    });
  }),
  deleteJournal: jest.fn((req, res) => {
    const {id} = req.params;
    return res.apiSuccess({
      message: 'Journal deleted successfully',
    }, {
      id,
      deleted: true,
    });
  }),
  addJournalEntry: jest.fn((req, res) => {
    const {id} = req.params;
    const {name, thought, location} = req.body;
    if (!location || !location.coordinate) {
      return res.apiError({
        status: 400,
        message: 'Location is required',
        error: 'ValidationError',
      });
    }
    return res.apiSuccess({
      message: 'Entry added successfully',
      status: 201,
    }, {
      id: 'entry-new',
      journalId: id,
      name: name || '',
      thought: thought || '',
      location,
      arrivalTime: new Date().toISOString(),
    });
  }),
  updateJournalEntry: jest.fn((req, res) => {
    const {id, entryId} = req.params;
    return res.apiSuccess({
      message: 'Entry updated successfully',
    }, {
      id: entryId,
      journalId: id,
      ...req.body,
    });
  }),
  deleteJournalEntry: jest.fn((req, res) => {
    const {entryId} = req.params;
    return res.apiSuccess({
      message: 'Entry deleted successfully',
    }, {
      id: entryId,
      deleted: true,
    });
  }),
  updateEntryTimes: jest.fn((req, res) => {
    const {entryId} = req.params;
    const {arrivalTime, departureTime} = req.body;
    return res.apiSuccess({
      message: 'Entry times updated successfully',
    }, {
      id: entryId,
      arrivalTime,
      departureTime,
    });
  }),
}));

// Mock auth middleware
jest.mock('@/middlewares/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.apiError({
        status: 401,
        message: 'Access token required',
        error: 'NoTokenProvided',
      });
    }
    const token = authHeader.split(' ')[1];
    if (token === 'valid-token') {
      req.user = {userId: 'user-123', userRole: 'user'};
      req.token = token;
      next();
    } else {
      return res.apiError({
        status: 401,
        message: 'Invalid token',
        error: 'InvalidToken',
      });
    }
  }),
}));

describe('Journal Routes Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(responseFormatter);
    app.use('/api/journals', journalRoutes);
  });

  describe('GET /api/journals', () => {
    it('should get all journals for authenticated user', async () => {
      const response = await request(app)
        .get('/api/journals')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.meta.message).toBe('Journals retrieved successfully');
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0]).toHaveProperty('id');
      expect(response.body.results[0]).toHaveProperty('name');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/journals')
        .expect(401);
    });

    it('should reject invalid token', async () => {
      await request(app)
        .get('/api/journals')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('GET /api/journals/today', () => {
    it('should get today\'s journal', async () => {
      const response = await request(app)
        .get('/api/journals/today')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.results).toHaveProperty('id');
      expect(response.body.results).toHaveProperty('name');
      expect(response.body.results).toHaveProperty('createdAt');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/journals/today')
        .expect(401);
    });
  });

  describe('GET /api/journals/:id', () => {
    it('should get journal by id', async () => {
      const response = await request(app)
        .get('/api/journals/journal-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.results.id).toBe('journal-123');
      expect(response.body.results).toHaveProperty('name');
      expect(response.body.results).toHaveProperty('entries');
    });

    it('should return 404 for non-existent journal', async () => {
      const response = await request(app)
        .get('/api/journals/not-found')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.meta.error).toBe('NotFound');
    });

    it('should require authentication', async () => {
      await request(app)
        .get('/api/journals/journal-123')
        .expect(401);
    });
  });

  describe('POST /api/journals', () => {
    it('should create a new journal', async () => {
      const response = await request(app)
        .post('/api/journals')
        .set('Authorization', 'Bearer valid-token')
        .send({name: 'New Journal'})
        .expect(201);

      expect(response.body.results).toHaveProperty('id');
      expect(response.body.results.name).toBe('New Journal');
      expect(response.body.results).toHaveProperty('createdAt');
    });

    it('should return 400 for missing name', async () => {
      const response = await request(app)
        .post('/api/journals')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body.meta.error).toBe('ValidationError');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/journals')
        .send({name: 'New Journal'})
        .expect(401);
    });
  });

  describe('PATCH /api/journals/:id', () => {
    it('should update journal', async () => {
      const response = await request(app)
        .patch('/api/journals/journal-123')
        .set('Authorization', 'Bearer valid-token')
        .send({name: 'Updated Journal Name'})
        .expect(200);

      expect(response.body.results.name).toBe('Updated Journal Name');
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/journals/journal-123')
        .send({name: 'Updated'})
        .expect(401);
    });
  });

  describe('DELETE /api/journals/:id', () => {
    it('should delete journal', async () => {
      const response = await request(app)
        .delete('/api/journals/journal-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.results.deleted).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete('/api/journals/journal-123')
        .expect(401);
    });
  });

  describe('POST /api/journals/:id/entry', () => {
    it('should add entry to journal', async () => {
      const response = await request(app)
        .post('/api/journals/journal-123/entry')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Central Park',
          thought: 'Beautiful day!',
          location: {
            coordinate: {latitude: 40.7829, longitude: -73.9654},
            address: 'Central Park, NYC',
          },
        })
        .expect(201);

      expect(response.body.results).toHaveProperty('id');
      expect(response.body.results.journalId).toBe('journal-123');
      expect(response.body.results).toHaveProperty('location');
    });

    it('should return 400 for missing location', async () => {
      const response = await request(app)
        .post('/api/journals/journal-123/entry')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Test Entry',
          thought: 'Test thought',
        })
        .expect(400);

      expect(response.body.meta.error).toBe('ValidationError');
    });

    it('should require authentication', async () => {
      await request(app)
        .post('/api/journals/journal-123/entry')
        .send({
          location: {coordinate: {latitude: 0, longitude: 0}},
        })
        .expect(401);
    });
  });

  describe('PATCH /api/journals/:id/entry/:entryId', () => {
    it('should update journal entry', async () => {
      const response = await request(app)
        .patch('/api/journals/journal-123/entry/entry-456')
        .set('Authorization', 'Bearer valid-token')
        .send({
          name: 'Updated Entry',
          thought: 'Updated thought',
        })
        .expect(200);

      expect(response.body.results.id).toBe('entry-456');
      expect(response.body.results.name).toBe('Updated Entry');
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/journals/journal-123/entry/entry-456')
        .send({name: 'Updated'})
        .expect(401);
    });
  });

  describe('DELETE /api/journals/:id/entry/:entryId', () => {
    it('should delete journal entry', async () => {
      const response = await request(app)
        .delete('/api/journals/journal-123/entry/entry-456')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.results.deleted).toBe(true);
    });

    it('should require authentication', async () => {
      await request(app)
        .delete('/api/journals/journal-123/entry/entry-456')
        .expect(401);
    });
  });

  describe('PATCH /api/journals/:id/entry/:entryId/times', () => {
    it('should update entry times', async () => {
      const arrivalTime = new Date().toISOString();
      const departureTime = new Date(Date.now() + 3600000).toISOString();

      const response = await request(app)
        .patch('/api/journals/journal-123/entry/entry-456/times')
        .set('Authorization', 'Bearer valid-token')
        .send({
          arrivalTime,
          departureTime,
        })
        .expect(200);

      expect(response.body.results.arrivalTime).toBe(arrivalTime);
      expect(response.body.results.departureTime).toBe(departureTime);
    });

    it('should require authentication', async () => {
      await request(app)
        .patch('/api/journals/journal-123/entry/entry-456/times')
        .send({
          arrivalTime: new Date().toISOString(),
        })
        .expect(401);
    });
  });

  describe('Response format consistency', () => {
    it('should have consistent structure for success responses', async () => {
      const response = await request(app)
        .get('/api/journals')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('results');
      expect(response.body.meta).toHaveProperty('status');
      expect(response.body.meta).toHaveProperty('message');
    });

    it('should have consistent structure for error responses', async () => {
      const response = await request(app)
        .get('/api/journals')
        .expect(401);

      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('results');
      expect(response.body.meta).toHaveProperty('status');
      expect(response.body.meta).toHaveProperty('message');
      expect(response.body.meta).toHaveProperty('error');
      expect(response.body.results).toBeNull();
    });
  });
});

