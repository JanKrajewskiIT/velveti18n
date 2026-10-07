import { warnOnce } from '../internal/diagnostics';

export const toDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return new Date(value);
  }

  const received = value === null ? 'null' : typeof value;
  warnOnce(`Expected a Date, number, or string date value but received ${received}; using the Unix epoch.`);
  return new Date(0);
};
