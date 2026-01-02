import request from 'supertest';
import express, {type Application} from 'express';
import userRoutes from '@/routes/user';
import {responseFormatter} from '@/middlewares/responseFormatter';

// Mock the controllers
jest.mock('@/controllers', () => ({
  createUser: jest.fn((req, res) => {
    const {email, password, name} = req.body;
    if (!email || !password || !name) {
      return res.apiError({
        status: 400,
        message: 'Missing required fields',
        error: 'ValidationError',
      });
    }
    return res.apiSuccess({
      message: 'User created successfully',
      status: 201,
    }, {
      id: 'user-123',
      email,
      name,
      role: 'user',
    });
  }),
  login: jest.fn((req, res) => {
    const {email, password} = req.body;
    if (!email || !password) {
      return res.apiError({
        status: 400,
        message: 'Email and password are required',
        error: 'ValidationError',
      });
    }
    if (email === 'invalid@test.com') {
      return res.apiError({
        status: 401,
        message: 'Invalid credentials',
        error: 'AuthenticationError',
      });
    }
    return res.apiSuccess({
      message: 'Login successful',
    }, {
      user: {id: 'user-123', email, name: 'Test User'},
      token: 'mock-jwt-token',
    });
  }),
  getCurrentUser: jest.fn((req, res) => {
    if (!req.user) {
      return res.apiError({
        status: 401,
        message: 'Unauthorized',
        error: 'NotAuthenticated',
      });
    }
    return res.apiSuccess({
      message: 'User retrieved successfully',
    }, {
      id: req.user.userId,
      email: 'test@example.com',
      name: 'Test User',
      role: req.user.userRole,
    });
  }),
  getAllUsers: jest.fn((req, res) => {
    return res.apiSuccess({
      message: 'Users retrieved successfully',
    }, [
      {id: 'user-1', email: 'user1@test.com', name: 'User One', role: 'user'},
      {id: 'user-2', email: 'user2@test.com', name: 'User Two', role: 'user'},
    ]);
  }),
  getUserById: jest.fn((req, res) => {
    const {id} = req.params;
    if (id === 'invalid-id') {
      return res.apiError({
        status: 404,
        message: 'User not found',
        error: 'NotFound',
      });
    }
    return res.apiSuccess({
      message: 'User retrieved successfully',
    }, {
      id,
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
    });
  }),
  updateUser: jest.fn((req, res) => {
    const {id} = req.params;
    const {name} = req.body;
    return res.apiSuccess({
      message: 'User updated successfully',
    }, {
      id,
      name: name || 'Updated Name',
      email: 'test@example.com',
    });
  }),
  deleteUser: jest.fn((req, res) => {
    return res.apiSuccess({
      message: 'User deleted successfully',
    }, {deleted: true});
  }),
  logout: jest.fn((req, res) => {
    return res.apiSuccess({
      message: 'Logout successful',
    }, {success: true});
  }),
  deactivateUser: jest.fn((req, res) => {
    return res.apiSuccess({
      message: 'User deactivated successfully',
    }, {deactivated: true});
  }),
  validateToken: jest.fn((req, res) => {
    return res.apiSuccess({
      message: 'Token is valid',
    }, {valid: true});
  }),
  cleanupTokens: jest.fn((req, res) => {
    return res.apiSuccess({
      message: 'Tokens cleaned up',
    }, {cleaned: 10});
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
  adminAuthenticateToken: jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.apiError({
        status: 401,
        message: 'Access token required',
        error: 'NoTokenProvided',
      });
    }
    const token = authHeader.split(' ')[1];
    if (token === 'admin-token') {
      req.user = {userId: 'admin-123', userRole: 'admin'};
      req.token = token;
      next();
    } else {
      return res.apiError({
        status: 403,
        message: 'Admin access required',
        error: 'Forbidden',
      });
    }
  }),
}));

describe('User Routes Integration Tests', () => {
  let app: Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use(responseFormatter);
    app.use('/api/users', userRoutes);
  });

  describe('POST /api/users/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'newuser@test.com',
          password: 'password123',
          name: 'New User',
        })
        .expect(201);

      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta.status).toBe(201);
      expect(response.body.meta.message).toBe('User created successfully');
      expect(response.body.results).toHaveProperty('id');
      expect(response.body.results.email).toBe('newuser@test.com');
      expect(response.body.results.name).toBe('New User');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          email: 'test@test.com',
        })
        .expect(400);

      expect(response.body.meta.error).toBe('ValidationError');
    });
  });

  describe('POST /api/users/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(200);

      expect(response.body.results).toHaveProperty('token');
      expect(response.body.results).toHaveProperty('user');
      expect(response.body.results.user.email).toBe('test@example.com');
    });

    it('should return 400 for missing credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'test@test.com',
        })
        .expect(400);

      expect(response.body.meta.error).toBe('ValidationError');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/api/users/login')
        .send({
          email: 'invalid@test.com',
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.meta.error).toBe('AuthenticationError');
    });
  });

  describe('GET /api/users/me', () => {
    it('should get current user with valid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.results).toHaveProperty('id');
      expect(response.body.results).toHaveProperty('email');
      expect(response.body.results).toHaveProperty('name');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .expect(401);

      expect(response.body.meta.error).toBe('NoTokenProvided');
    });

    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.meta.error).toBe('InvalidToken');
    });
  });

  describe('GET /api/users/all', () => {
    it('should get all users with admin token', async () => {
      const response = await request(app)
        .get('/api/users/all')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.results).toHaveLength(2);
    });

    it('should return 403 with non-admin token', async () => {
      const response = await request(app)
        .get('/api/users/all')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(response.body.meta.error).toBe('Forbidden');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const response = await request(app)
        .get('/api/users/user-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.results.id).toBe('user-123');
    });

    it('should return 404 for invalid user id', async () => {
      const response = await request(app)
        .get('/api/users/invalid-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body.meta.error).toBe('NotFound');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user successfully', async () => {
      const response = await request(app)
        .put('/api/users/user-123')
        .set('Authorization', 'Bearer valid-token')
        .send({name: 'Updated Name'})
        .expect(200);

      expect(response.body.results.name).toBe('Updated Name');
    });

    it('should require authentication', async () => {
      await request(app)
        .put('/api/users/user-123')
        .send({name: 'Updated Name'})
        .expect(401);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user with admin token', async () => {
      const response = await request(app)
        .delete('/api/users/user-123')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.results.deleted).toBe(true);
    });

    it('should return 403 with non-admin token', async () => {
      await request(app)
        .delete('/api/users/user-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(403);
    });
  });

  describe('POST /api/users/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/users/logout')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.results.success).toBe(true);
    });
  });

  describe('POST /api/users/deactivate/:id', () => {
    it('should deactivate user with admin token', async () => {
      const response = await request(app)
        .post('/api/users/deactivate/user-123')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.results.deactivated).toBe(true);
    });
  });

  describe('POST /api/users/validate', () => {
    it('should validate token', async () => {
      const response = await request(app)
        .post('/api/users/validate')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.results.valid).toBe(true);
    });
  });

  describe('POST /api/users/cleanup-tokens', () => {
    it('should cleanup tokens with admin access', async () => {
      const response = await request(app)
        .post('/api/users/cleanup-tokens')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(response.body.results).toHaveProperty('cleaned');
    });
  });
});

