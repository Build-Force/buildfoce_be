/**
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

import type { Config } from 'jest';

const config: Config = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  // Disable by default to avoid threshold failures on single-file runs; use npm run test:coverage when needed
  collectCoverage: false,

  // The directory where Jest should output its coverage files
  coverageDirectory: "coverage",

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // A preset that is used as a base for Jest's configuration
  preset: "ts-jest",

  // The test environment that will be used for testing
  testEnvironment: "node",

  // An array of file extensions your modules use
  moduleFileExtensions: [
    "js",
    "jsx",
    "ts",
    "tsx",
    "json",
    "node"
  ],

  // A map from regular expressions to paths to transformers
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    "node_modules/(?!(.*\\.mjs$))"
  ],

  // The glob patterns Jest uses to detect test files
  testMatch: [
    "**/__tests__/**/*.(test|spec).(ts|tsx|js)",
    "**/*.(test|spec).(ts|tsx|js)"
  ],

  // An array of regexp pattern strings that are matched against all test paths, matched tests are skipped
  testPathIgnorePatterns: [
    "/node_modules/"
  ],

  // Ignore compiled output to avoid duplicate manual mocks from dist
  modulePathIgnorePatterns: [
    "<rootDir>/dist/"
  ],

  // Setup files after environment
  // setupFilesAfterEnv: ["<rootDir>/src/controllers/__tests__/jest.setup.js"],

  // Module name mapping for path aliases
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^\\.\\.\\/models\\/(.*)$": "<rootDir>/src/models/$1",
    "^\\.\\.\\/services\\/(.*)$": "<rootDir>/src/services/$1",
    "^\\.\\.\\/\\.\\.\\/src\\/models\\/(.*)$": "<rootDir>/src/models/$1",
    "^\\.\\.\\/\\.\\.\\/src\\/services\\/(.*)$": "<rootDir>/src/services/$1"
  },

  // Coverage collection from specific files
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/node_modules/**"
  ],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // Relax TS diagnostics for jest (allow type-unsafe mocks in tests)
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json',
      diagnostics: { warnOnly: true }
    }
  }
};

export default config;
