import { ApiLoggerOptions, WafOptions, WafRule } from '../types';

const DEFAULT_WAF_OPTIONS: Required<
  Pick<WafOptions, 'enabled' | 'mode' | 'failOpen' | 'statusCode' | 'disableManagedRules'>
> = {
  enabled: false,
  mode: 'detect',
  failOpen: true,
  statusCode: 403,
  disableManagedRules: false
};

export function normalizeLoggerOptions(options: ApiLoggerOptions): ApiLoggerOptions {
  validateLoggerOptions(options);

  const normalizedWaf = normalizeWafOptions(options.waf);
  return {
    ...options,
    persistenceMode: options.persistenceMode ?? 'sync',
    maxQueueSize: options.maxQueueSize ?? 1000,
    flushIntervalMs: options.flushIntervalMs ?? 500,
    batchSize: options.batchSize ?? 100,
    waf: normalizedWaf
  };
}

export function normalizeWafOptions(waf?: WafOptions): WafOptions {
  const merged: WafOptions = {
    ...DEFAULT_WAF_OPTIONS,
    ...waf,
    scoreThresholds: {
      log: waf?.scoreThresholds?.log ?? 15,
      softBlock: waf?.scoreThresholds?.softBlock ?? 50,
      block: waf?.scoreThresholds?.block ?? 80
    },
    rateLimit: {
      enabled: waf?.rateLimit?.enabled ?? false,
      windowMs: waf?.rateLimit?.windowMs ?? 60_000,
      maxRequests: waf?.rateLimit?.maxRequests ?? 120,
      blockDurationMs: waf?.rateLimit?.blockDurationMs ?? 60_000,
      statusCode: waf?.rateLimit?.statusCode ?? 429,
      ...(waf?.rateLimit?.keyGenerator ? { keyGenerator: waf.rateLimit.keyGenerator } : {})
    },
    sizeLimits: {
      maxBodyBytes: waf?.sizeLimits?.maxBodyBytes ?? 128 * 1024,
      maxHeadersBytes: waf?.sizeLimits?.maxHeadersBytes ?? 32 * 1024,
      maxQueryBytes: waf?.sizeLimits?.maxQueryBytes ?? 16 * 1024,
      maxParamsBytes: waf?.sizeLimits?.maxParamsBytes ?? 16 * 1024,
      maxPreviewLength: waf?.sizeLimits?.maxPreviewLength ?? 120
    }
  };

  return merged;
}

export function validateLoggerOptions(options: ApiLoggerOptions): void {
  if (!options.mongoUri || options.mongoUri.trim().length === 0) {
    throw new Error('ApiLoggerOptions.mongoUri is required.');
  }

  if (
    options.persistenceMode !== undefined &&
    options.persistenceMode !== 'sync' &&
    options.persistenceMode !== 'async'
  ) {
    throw new Error('ApiLoggerOptions.persistenceMode must be "sync" or "async".');
  }

  if (options.maxQueueSize !== undefined && options.maxQueueSize <= 0) {
    throw new Error('ApiLoggerOptions.maxQueueSize must be greater than 0.');
  }
  if (options.flushIntervalMs !== undefined && options.flushIntervalMs <= 0) {
    throw new Error('ApiLoggerOptions.flushIntervalMs must be greater than 0.');
  }
  if (options.batchSize !== undefined && options.batchSize <= 0) {
    throw new Error('ApiLoggerOptions.batchSize must be greater than 0.');
  }

  if (!options.waf) {
    return;
  }

  const { waf } = options;
  if (waf.mode && !['detect', 'soft-block', 'block'].includes(waf.mode)) {
    throw new Error('WAF mode must be detect, soft-block, or block.');
  }
  if (waf.statusCode !== undefined && (waf.statusCode < 100 || waf.statusCode > 599)) {
    throw new Error('WAF statusCode must be a valid HTTP status code.');
  }

  const scoreThresholds = waf.scoreThresholds;
  if (scoreThresholds) {
    const log = scoreThresholds.log ?? 15;
    const softBlock = scoreThresholds.softBlock ?? 50;
    const block = scoreThresholds.block ?? 80;
    if (log < 0 || softBlock < 0 || block < 0) {
      throw new Error('WAF score thresholds must be non-negative.');
    }
    if (log > softBlock || softBlock > block) {
      throw new Error('WAF score thresholds must be ordered: log <= softBlock <= block.');
    }
  }

  validateRules(waf.rules);
}

function validateRules(rules?: WafRule[]): void {
  if (!rules) {
    return;
  }

  const ids = new Set<string>();
  for (const rule of rules) {
    if (!rule.id || !rule.name) {
      throw new Error('Each WAF rule must include id and name.');
    }
    if (ids.has(rule.id)) {
      throw new Error(`Duplicate WAF rule id detected: ${rule.id}`);
    }
    ids.add(rule.id);

    if (!rule.targets || rule.targets.length === 0) {
      throw new Error(`WAF rule "${rule.id}" must define at least one target.`);
    }
    if (!(rule.pattern instanceof RegExp)) {
      throw new Error(`WAF rule "${rule.id}" pattern must be a RegExp.`);
    }
    if (rule.score !== undefined && rule.score < 0) {
      throw new Error(`WAF rule "${rule.id}" score must be non-negative.`);
    }
  }
}
