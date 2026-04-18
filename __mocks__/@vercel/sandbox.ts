function createCommandResult(stdout = '+ @vibeopc/test@1.0.0\n', stderr = '', exitCode = 0) {
  return {
    exitCode,
    stdout: () => Promise.resolve(stdout),
    stderr: () => Promise.resolve(stderr),
  };
}

// Mock @vercel/sandbox to avoid ESM issues in Jest
const mockSandbox = {
  sandboxId: 'sandbox_test',
  writeFiles: jest.fn(() => Promise.resolve()),
  runCommand: jest.fn(() => Promise.resolve(createCommandResult())),
  stop: jest.fn(() => Promise.resolve()),
  fs: { readFile: jest.fn(), writeFile: jest.fn() },
};

export const __mockSandbox = mockSandbox;
export const __setSandboxCommandResult = (stdout: string, stderr = '', exitCode = 0) => {
  mockSandbox.runCommand.mockImplementation(() =>
    Promise.resolve(createCommandResult(stdout, stderr, exitCode))
  );
};

export const Sandbox = {
  create: jest.fn(() => Promise.resolve(mockSandbox)),
};
