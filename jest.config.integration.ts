/**
 * Jest Configuration for Integration Tests
 * Runs tests against real database and API endpoints
 */

import type { Config } from 'jest';

const config: Config = {
  // Use ts-jest preset for TypeScript
  preset: 'ts-jest',

  // Node environment for backend tests
  testEnvironment: 'node',

  // Only run integration tests
  testMatch: ['**/tests/integration/**/*.test.ts'],

  // Setup files BEFORE environment is initialized (needed for reflect-metadata)
  setupFiles: ['<rootDir>/tests/helpers/reflect-setup.ts'],
  
  // Setup files after environment is initialized
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/test-setup.ts'],

  // Don't collect coverage for integration tests (slower)
  collectCoverage: false,

  // Increased timeout for integration tests (30 seconds)
  testTimeout: 30000,

  // Path alias mapping
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Global setup before all tests
  globalSetup: '<rootDir>/tests/helpers/global-setup.ts',

  // Global teardown after all tests
  globalTeardown: '<rootDir>/tests/helpers/global-teardown.ts',

  // Clear mocks between tests
  clearMocks: true,

  // Reset modules between tests
  resetModules: false,

  // Restore mocks after each test
  restoreMocks: true,

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  
  // Ignore duplicate mock warnings
  modulePathIgnorePatterns: [
    '<rootDir>/dist',
  ],

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
    'node',
  ],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: './tsconfig.test.json',
    }],
  },

  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))',
  ],

  // Verbose output for debugging
  verbose: true,

  // Max workers (1 to avoid database conflicts)
  maxWorkers: 1,

  // Run tests in sequence to avoid DB race conditions
  maxConcurrency: 1,
};

export default config;

