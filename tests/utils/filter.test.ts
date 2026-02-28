import { shouldLogRequest, shouldLogEntry } from '../../src/utils/filter';
import type { Request, Response } from 'express';
import type { ApiLogEntry, ApiLoggerOptions } from '../../src/types';

function mockReq(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    url: '/api/users',
    originalUrl: '/api/users',
    headers: {},
    query: {},
    params: {},
    body: {},
    ...overrides
  } as Request;
}

function mockRes(overrides: { statusCode?: number } = {}): Response {
  return { statusCode: 200, ...overrides } as Response;
}

function mockEntry(overrides: Partial<ApiLogEntry> = {}): ApiLogEntry {
  return {
    url: '/api/users',
    method: 'GET',
    request: { headers: {}, body: {}, query: {}, params: {} },
    response: { statusCode: 200 },
    createdAt: new Date(),
    durationMs: 10,
    ...overrides
  };
}

describe('filter', () => {
  describe('shouldLogRequest', () => {
    it('allows when no filters set', () => {
      const options: ApiLoggerOptions = { mongoUri: 'mongodb://localhost' };
      expect(shouldLogRequest(mockReq(), mockRes(), options)).toBe(true);
    });

    it('excludes when logErrorsOnly and status 200', () => {
      const options: ApiLoggerOptions = { mongoUri: 'x', logErrorsOnly: true };
      expect(shouldLogRequest(mockReq(), mockRes({ statusCode: 200 }), options)).toBe(false);
      expect(shouldLogRequest(mockReq(), mockRes({ statusCode: 500 }), options)).toBe(true);
    });

    it('excludes when method not in includeMethods', () => {
      const options: ApiLoggerOptions = { mongoUri: 'x', includeMethods: ['POST'] };
      expect(shouldLogRequest(mockReq(), mockRes(), options)).toBe(false);
    });

    it('excludes when url matches excludeRoutes', () => {
      const options: ApiLoggerOptions = { mongoUri: 'x', excludeRoutes: [/^\/health/] };
      expect(shouldLogRequest(mockReq({ originalUrl: '/health' }), mockRes(), options)).toBe(false);
    });
  });

  describe('shouldLogEntry', () => {
    it('allows when no filters set', () => {
      const options: ApiLoggerOptions = { mongoUri: 'mongodb://localhost' };
      expect(shouldLogEntry(mockEntry(), options)).toBe(true);
    });

    it('excludes when logErrorsOnly and status 200', () => {
      const options: ApiLoggerOptions = { mongoUri: 'x', logErrorsOnly: true };
      expect(shouldLogEntry(mockEntry(), options)).toBe(false);
      expect(shouldLogEntry(mockEntry({ response: { statusCode: 500 } }), options)).toBe(true);
    });

    it('respects shouldLogEntry callback', () => {
      const options: ApiLoggerOptions = {
        mongoUri: 'x',
        shouldLogEntry: (e) => e.url === '/skip'
      };
      expect(shouldLogEntry(mockEntry({ url: '/skip' }), options)).toBe(true);
      expect(shouldLogEntry(mockEntry({ url: '/other' }), options)).toBe(false);
    });
  });
});
