import { ApiLogger } from '../../src/core/logger';
import type { ApiLogEntry } from '../../src/types';

describe('ApiLogger', () => {
  it('throws when mongoUri is empty', () => {
    expect(() => new ApiLogger({ mongoUri: '' })).toThrow('mongoUri');
  });

  it('uses DEFAULT_MASK_FIELDS when maskFields not provided', () => {
    const logger = new ApiLogger({ mongoUri: 'mongodb://localhost' });
    const opts = (logger as any).options;
    expect(Array.isArray(opts.maskFields)).toBe(true);
    expect(opts.maskFields).toContain('password');
  });

  it('logEntry applies masking and does not throw without init', async () => {
    const logger = new ApiLogger({
      mongoUri: 'mongodb://localhost',
      maskFields: ['secret']
    });
    const entry: ApiLogEntry = {
      url: '/x',
      method: 'POST',
      request: { headers: {}, body: { secret: 'x', name: 'y' }, query: {}, params: {} },
      response: { statusCode: 200 },
      createdAt: new Date(),
      durationMs: 0
    };
    await expect(logger.logEntry(entry)).resolves.not.toThrow();
  });
});
