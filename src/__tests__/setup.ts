// Test setup file
// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.JWT_EXPIRE = '1h';

// Mock config/env to avoid import.meta issues
jest.mock('@/config/env', () => ({
  config: {
    JWT_SECRET: 'test-secret-key',
    JWT_EXPIRE: '1h',
    PORT: 3000,
    NODE_ENV: 'test',
  },
}));

// Global test timeout
jest.setTimeout(10000);

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
};

