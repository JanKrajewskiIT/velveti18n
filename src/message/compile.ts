import { createBoundedCache } from '../internal/boundedCache';
import { warnOnce } from '../internal/diagnostics';
import type { MessageNodes } from './ast';
import { MessageSyntaxError, parseMessage } from './parser';

export type MessageMode = 'plain' | 'rich';

const COMPILED_MESSAGE_LIMIT = 500;

const SYNTAX_PATTERNS = {
  plain: /[{}']/u,
  rich: /[{}'<]/u,
} satisfies Record<MessageMode, RegExp>;

const caches = {
  plain: createBoundedCache<string, MessageNodes | null>(COMPILED_MESSAGE_LIMIT),
  rich: createBoundedCache<string, MessageNodes | null>(COMPILED_MESSAGE_LIMIT),
} satisfies Record<MessageMode, unknown>;

const tryParse = (template: string, mode: MessageMode): MessageNodes | null => {
  try {
    return parseMessage(template, { richText: mode === 'rich' });
  } catch (error) {
    if (!(error instanceof MessageSyntaxError)) {
      throw error;
    }
    warnOnce(`Invalid message template ${JSON.stringify(template)}: ${error.message} at position ${error.position}.`);
    return null;
  }
};

export const hasMessageSyntax = (template: string, mode: MessageMode): boolean => SYNTAX_PATTERNS[mode].test(template);

export const compileMessage = (template: string, mode: MessageMode): MessageNodes | null =>
  caches[mode].getOrCreate(template, () => tryParse(template, mode));
