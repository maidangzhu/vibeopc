/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  verbose: true,
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/src/generated/',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: false,
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@vercel/sandbox$': '<rootDir>/__mocks__/@vercel/sandbox.ts',
  },
  testTimeout: 60000,
};
