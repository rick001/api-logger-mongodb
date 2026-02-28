import { normalizeLoggerOptions, validateLoggerOptions } from '../../src/waf/config';

describe('WAF config validation', () => {
  it('throws when mongoUri is missing', () => {
    expect(() =>
      validateLoggerOptions({
        mongoUri: ''
      })
    ).toThrow('mongoUri is required');
  });

  it('throws when score thresholds are invalid', () => {
    expect(() =>
      validateLoggerOptions({
        mongoUri: 'mongodb://localhost:27017',
        waf: {
          enabled: true,
          scoreThresholds: {
            log: 40,
            softBlock: 20,
            block: 80
          }
        }
      })
    ).toThrow('score thresholds must be ordered');
  });

  it('normalizes waf defaults and async persistence defaults', () => {
    const normalized = normalizeLoggerOptions({
      mongoUri: 'mongodb://localhost:27017'
    });

    expect(normalized.waf?.enabled).toBe(false);
    expect(normalized.waf?.mode).toBe('detect');
    expect(normalized.persistenceMode).toBe('sync');
    expect(normalized.batchSize).toBe(100);
  });
});
