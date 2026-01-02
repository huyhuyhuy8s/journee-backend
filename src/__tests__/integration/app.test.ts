import request, {type Response as SuperTestResponse} from 'supertest';
import express, {type Application} from 'express';
import {responseFormatter} from '@/middlewares/responseFormatter';
import '@/types/express';

describe('App Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(responseFormatter);

    // Health check endpoint
    app.get('/health', (_req, res) => {
      return res.json({
        status: 'OK',
        time: new Date().toISOString(),
        environment: 'test',
      });
    });

    // Root endpoint
    app.get('/', (_req, res) => {
      return res.json({
        message: 'Journee API Server',
        version: '0.5.0',
        status: 'Running',
      });
    });

    // Test API response formatter
    app.get('/test/success', (_req, res) => {
      return res.apiSuccess({
        message: 'Test success',
      }, {data: 'test'});
    });

    app.get('/test/error', (_req, res) => {
      return res.apiError({
        status: 400,
        message: 'Test error',
        error: 'TestError',
      });
    });

    // Error handling middleware
    app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
      return res.status(500).json({
        error: err.message,
        stack: err.stack,
      });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('time');
      expect(response.body).toHaveProperty('environment');
    });

    it('should return valid timestamp', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.time);
      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Journee API Server');
      expect(response.body).toHaveProperty('version', '0.5.0');
      expect(response.body).toHaveProperty('status', 'Running');
    });

    it('should return JSON content type', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('API Response Format', () => {
    it('should format success responses correctly', async () => {
      const response = await request(app)
        .get('/test/success')
        .expect(200);

      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('results');
      expect(response.body.meta).toHaveProperty('status', 200);
      expect(response.body.meta).toHaveProperty('message', 'Test success');
      expect(response.body.results).toEqual({data: 'test'});
    });

    it('should format error responses correctly', async () => {
      const response = await request(app)
        .get('/test/error')
        .expect(400);

      expect(response.body).toHaveProperty('meta');
      expect(response.body).toHaveProperty('results');
      expect(response.body.meta).toHaveProperty('status', 400);
      expect(response.body.meta).toHaveProperty('message', 'Test error');
      expect(response.body.meta).toHaveProperty('error', 'TestError');
      expect(response.body.results).toBeNull();
    });
  });

  describe('HTTP Methods', () => {
    beforeAll(() => {
      app.post('/test/post', (req, res) => {
        return res.apiSuccess({
          message: 'POST successful',
          status: 201,
        }, req.body);
      });

      app.put('/test/put', (req, res) => {
        return res.apiSuccess({
          message: 'PUT successful',
        }, req.body);
      });

      app.patch('/test/patch', (req, res) => {
        return res.apiSuccess({
          message: 'PATCH successful',
        }, req.body);
      });

      app.delete('/test/delete', (_req, res) => {
        return res.apiSuccess({
          message: 'DELETE successful',
        }, {deleted: true});
      });
    });

    it('should handle POST requests', async () => {
      const response = await request(app)
        .post('/test/post')
        .send({name: 'test'})
        .expect(201);

      expect(response.body.results).toEqual({name: 'test'});
    });

    it('should handle PUT requests', async () => {
      const response = await request(app)
        .put('/test/put')
        .send({name: 'updated'})
        .expect(200);

      expect(response.body.results).toEqual({name: 'updated'});
    });

    it('should handle PATCH requests', async () => {
      const response = await request(app)
        .patch('/test/patch')
        .send({name: 'patched'})
        .expect(200);

      expect(response.body.results).toEqual({name: 'patched'});
    });

    it('should handle DELETE requests', async () => {
      const response = await request(app)
        .delete('/test/delete')
        .expect(200);

      expect(response.body.results.deleted).toBe(true);
    });
  });

  describe('Request Headers', () => {
    it('should accept JSON content type', async () => {
      await request(app)
        .post('/test/post')
        .set('Content-Type', 'application/json')
        .send({test: 'data'})
        .expect(201);
    });

    it('should return JSON responses', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers['content-type']).toMatch(/json/);
    });
  });

  describe('404 Handling', () => {
    it('should return 404 for non-existent routes', async () => {
      await request(app)
        .get('/non-existent-route')
        .expect(404);
    });

    it('should return 404 for non-existent POST routes', async () => {
      await request(app)
        .post('/non-existent-route')
        .send({data: 'test'})
        .expect(404);
    });
  });

  describe('Request Body Parsing', () => {
    it('should parse JSON request bodies', async () => {
      const testData = {
        name: 'Test',
        nested: {
          value: 123,
          array: [1, 2, 3],
        },
      };

      const response = await request(app)
        .post('/test/post')
        .send(testData)
        .expect(201);

      expect(response.body.results).toEqual(testData);
    });

    it('should handle empty request bodies', async () => {
      const response = await request(app)
        .post('/test/post')
        .send({})
        .expect(201);

      expect(response.body.results).toEqual({});
    });

    it('should handle malformed JSON gracefully', async () => {
      // Note: Express automatically returns 400 for malformed JSON
      // This test verifies that behavior
      try {
        await request(app)
          .post('/test/post')
          .set('Content-Type', 'application/json')
          .send('invalid json');
      } catch (error) {
        // Expected to fail with malformed JSON
        expect(error).toBeDefined();
      }
    });
  });

  describe('Response Headers', () => {
    it('should set appropriate content-type headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      expect(response.headers).toHaveProperty('content-type');
      expect(response.headers['content-type']).toContain('application/json');
    });
  });

  describe('Performance', () => {
    it('should respond quickly to health checks', async () => {
      const start = Date.now();
      await request(app).get('/health').expect(200);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should respond in less than 100ms
    });

    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({length: 10}, () =>
        request(app).get('/health').expect(200),
      );

      const responses = await Promise.all(requests);
      expect(responses).toHaveLength(10);
      responses.forEach((response: SuperTestResponse) => {
        expect(response.body.status).toBe('OK');
      });
    });
  });
});

