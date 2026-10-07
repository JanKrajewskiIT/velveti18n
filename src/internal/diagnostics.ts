import { DEV } from 'solid-js';

const reportedMessages = new Set<string>();

// `DEV` is undefined unless the consumer resolves Solid's development build, so warnings follow the consumer's mode.
export const warnOnce = (message: string): void => {
  if (DEV === undefined || reportedMessages.has(message)) {
    return;
  }
  reportedMessages.add(message);
  console.warn(`[i18n] ${message}`);
};
