import { ApiLoggerOptions } from '../types';

/**
 * Validates API logger options at construction. Throws if invalid.
 */
export function validateLoggerOptions(options: ApiLoggerOptions): void {
  if (!options.mongoUri || typeof options.mongoUri !== 'string') {
    throw new Error('ApiLoggerOptions.mongoUri is required and must be a non-empty string.');
  }
  if (options.mongoUri.trim().length === 0) {
    throw new Error('ApiLoggerOptions.mongoUri cannot be blank.');
  }
  if (options.databaseName !== undefined && (typeof options.databaseName !== 'string' || options.databaseName.trim().length === 0)) {
    throw new Error('ApiLoggerOptions.databaseName must be a non-empty string when provided.');
  }
  if (options.collectionName !== undefined && (typeof options.collectionName !== 'string' || options.collectionName.trim().length === 0)) {
    throw new Error('ApiLoggerOptions.collectionName must be a non-empty string when provided.');
  }
}
