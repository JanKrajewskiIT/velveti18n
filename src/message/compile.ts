import { warnOnce } from '../internal/env';
import type { MessageParams, RichMessageParams } from '../params';
import type { RichNode } from './ast';
import { parseMessage } from './parser';
import { renderPlain, renderRich } from './render';

export type CompiledMessage = (params: MessageParams | undefined, locale: string) => string;

export type CompiledRichMessage = (params: RichMessageParams | undefined, locale: string) => RichNode[];

const plainCache = new Map<string, CompiledMessage>();
const richCache = new Map<string, CompiledRichMessage>();

const hasSyntax = (template: string): boolean => template.includes('{') || template.includes('<');

export const compileMessage = (template: string): CompiledMessage => {
  if (!hasSyntax(template)) {
    return () => template;
  }
  const cached = plainCache.get(template);
  if (cached) return cached;

  let compiled: CompiledMessage;
  try {
    const nodes = parseMessage(template, false);
    compiled = (params, locale) => renderPlain(nodes, params ?? {}, locale);
  } catch {
    warnOnce(`parse:${template}`, `[i18n] Failed to parse message template: ${template}`);
    compiled = () => template;
  }
  plainCache.set(template, compiled);
  return compiled;
};

export const compileRichMessage = (template: string): CompiledRichMessage => {
  if (!hasSyntax(template)) {
    return () => [template];
  }
  const cached = richCache.get(template);
  if (cached) return cached;

  let compiled: CompiledRichMessage;
  try {
    const nodes = parseMessage(template, true);
    compiled = (params, locale) => renderRich(nodes, params ?? {}, locale);
  } catch {
    warnOnce(`parse-rich:${template}`, `[i18n] Failed to parse rich-text template: ${template}`);
    compiled = () => [template];
  }
  richCache.set(template, compiled);
  return compiled;
};
