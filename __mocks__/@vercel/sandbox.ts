// Mock @vercel/sandbox to avoid ESM issues in Jest
const mockSandbox = {
  writeFiles: jest.fn(() => Promise.resolve()),
  runCommand: jest.fn(() =>
    Promise.resolve({
      exitCode: 0,
      stdout: () => Promise.resolve('+ @vibeopc/test@1.0.0\n'),
      stderr: () => Promise.resolve(''),
    })
  ),
  stop: jest.fn(() => Promise.resolve()),
  fs: { readFile: jest.fn(), writeFile: jest.fn() },
};

export const Sandbox = {
  create: jest.fn(() => Promise.resolve(mockSandbox)),
};
