import { getModelToken } from '@nestjs/mongoose';

export const createMockModel = (
  overrides: Partial<Record<string, jest.Mock>> = {},
) => {
  const mock = {
    create: jest.fn(),
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findById: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    deleteOne: jest.fn().mockReturnThis(),
    ...overrides,
  };

  return mock;
};

export const mockModelToken = (modelName: string) => getModelToken(modelName);

export const createMockRequest = (overrides: Record<string, unknown> = {}) => ({
  headers: {},
  user: undefined,
  userId: undefined,
  ...overrides,
});

export const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  setHeader: jest.fn(),
  flushHeaders: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
  headersSent: false,
});
