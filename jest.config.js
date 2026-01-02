import {createDefaultPreset} from 'ts-jest';

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
export default {
  testEnvironment: "node",
  preset: 'ts-jest',
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@@/(.*)$': '<rootDir>/$1',
  },
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/types/**',
    '!src/config/**',
    '!src/controllers/**',
    '!src/routes/**',
    '!src/jobs/**',
    '!src/middlewares/logger.ts',
    '!src/services/entry.service.ts',
    '!src/services/journal.service.ts',
  ],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
  ],
  coverageThreshold: {
    global: {
      branches: 65,
      functions: 55,
      lines: 65,
      statements: 70,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
};
