/**
 * Compile a parsed MessageFormat AST into high-performance render functions.
 *
 * Two renderers are produced from the same AST:
 *   - `compileMessage(template)` -> `(params, locale) => string`
 *     Used by `t()` / `ts()`. Tag pairs (`<x>...</x>`) collapse to their
 *     inner text when rendered to a string.
 *   - `compileRichMessage(template)` -> `(params, locale) => RichNode[]`
 *     Used by `tx()`. Tag pairs become structured rich nodes that the
 *     `tx` runtime resolves to JSX via the caller-supplied tag handlers.
 *
 * Compiled functions are cached per template string so repeated calls
 * cost only a Map lookup plus the closure invocation.
 */

import type { Locale, MessageParams } from '../types';
import { getDateTimeFormat, getNumberFormat, getPluralRules, resolveDateTimeStyle, resolveNumberStyle } from './intl';
import { type MessageNode, parseMessage } from './parser';

export type CompiledMessage = (params: MessageParams | undefined, locale: Locale) => string;

/**
 * Structured rich-text output: either a plain text run or a tag with
 * recursively resolved child rich nodes. The runtime renders text runs
 * as-is and looks tags up in the caller-supplied handler map.
 */
export type RichNode = string | { readonly tag: string; readonly children: ReadonlyArray<RichNode> };

export type CompiledRichMessage = (params: MessageParams | undefined, locale: Locale) => ReadonlyArray<RichNode>;

const compileCache = new Map<string, CompiledMessage>();
const compileRichCache = new Map<string, CompiledRichMessage>();

const coerceNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === 'boolean') return value ? 1 : 0;
  return 0;
};

const coerceDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date(0);
};

// ---- string renderer ----------------------------------------------------

const renderNodes = (
  nodes: ReadonlyArray<MessageNode>,
  params: MessageParams | undefined,
  locale: Locale,
  poundValue: string,
): string => {
  let out = '';
  for (const node of nodes) {
    out += renderNode(node, params, locale, poundValue);
  }
  return out;
};

const renderNode = (
  node: MessageNode,
  params: MessageParams | undefined,
  locale: Locale,
  poundValue: string,
): string => {
  switch (node.type) {
    case 'literal':
      return node.value;
    case 'pound':
      return poundValue;
    case 'argument': {
      const value = params?.[node.name];
      if (value === undefined || value === null) return `{${node.name}}`;
      return String(value);
    }
    case 'number': {
      const value = coerceNumber(params?.[node.name]);
      return getNumberFormat(locale, resolveNumberStyle(node.style)).format(value);
    }
    case 'date':
    case 'time': {
      const value = coerceDate(params?.[node.name]);
      return getDateTimeFormat(locale, resolveDateTimeStyle(node.type, node.style)).format(value);
    }
    case 'plural': {
      const value = coerceNumber(params?.[node.name]);
      const formatted = getNumberFormat(locale).format(value);
      const exactKey = `=${value}`;
      const exact = node.branches.find((b) => b.key === exactKey);
      if (exact) return renderNodes(exact.nodes, params, locale, formatted);
      const category = getPluralRules(locale).select(value);
      const branch = node.branches.find((b) => b.key === category) ?? node.branches.find((b) => b.key === 'other');
      return branch ? renderNodes(branch.nodes, params, locale, formatted) : formatted;
    }
    case 'select': {
      const raw = params?.[node.name];
      const key = raw === undefined || raw === null ? 'other' : String(raw);
      const branch = node.branches.find((b) => b.key === key) ?? node.branches.find((b) => b.key === 'other');
      return branch ? renderNodes(branch.nodes, params, locale, '') : '';
    }
    case 'tag':
      // Tag pairs collapse to inner text in plain-string render mode.
      return renderNodes(node.children, params, locale, poundValue);
  }
};

// ---- rich (JSX-aware) renderer ------------------------------------------

const pushText = (out: RichNode[], text: string): void => {
  if (text.length === 0) return;
  const last = out[out.length - 1];
  if (typeof last === 'string') {
    out[out.length - 1] = last + text;
  } else {
    out.push(text);
  }
};

const renderRichNodes = (
  nodes: ReadonlyArray<MessageNode>,
  params: MessageParams | undefined,
  locale: Locale,
  poundValue: string,
): ReadonlyArray<RichNode> => {
  const out: RichNode[] = [];
  for (const node of nodes) {
    appendRichNode(out, node, params, locale, poundValue);
  }
  return out;
};

const appendRichNode = (
  out: RichNode[],
  node: MessageNode,
  params: MessageParams | undefined,
  locale: Locale,
  poundValue: string,
): void => {
  switch (node.type) {
    case 'literal':
      pushText(out, node.value);
      return;
    case 'pound':
      pushText(out, poundValue);
      return;
    case 'argument':
    case 'number':
    case 'date':
    case 'time':
    case 'select':
      pushText(out, renderNode(node, params, locale, poundValue));
      return;
    case 'plural': {
      const value = coerceNumber(params?.[node.name]);
      const formatted = getNumberFormat(locale).format(value);
      const exactKey = `=${value}`;
      const branch =
        node.branches.find((b) => b.key === exactKey) ??
        node.branches.find((b) => b.key === getPluralRules(locale).select(value)) ??
        node.branches.find((b) => b.key === 'other');
      if (!branch) {
        pushText(out, formatted);
        return;
      }
      for (const child of branch.nodes) {
        appendRichNode(out, child, params, locale, formatted);
      }
      return;
    }
    case 'tag':
      out.push({
        tag: node.name,
        children: renderRichNodes(node.children, params, locale, poundValue),
      });
      return;
  }
};

// ---- public entry points ------------------------------------------------

const passthroughString =
  (template: string): CompiledMessage =>
  () =>
    template;
const passthroughRich =
  (template: string): CompiledRichMessage =>
  () => [template];

const parseSafely = (template: string): ReadonlyArray<MessageNode> | null => {
  try {
    return parseMessage(template);
  } catch {
    return null;
  }
};

/**
 * Compile a template into a `(params, locale) => string` function, cached
 * by template identity. Templates without placeholders short-circuit to a
 * constant returner. Tag pairs collapse to their inner text.
 */
export function compileMessage(template: string): CompiledMessage {
  const cached = compileCache.get(template);
  if (cached) return cached;

  if (!template.includes('{') && !template.includes('<')) {
    const constant = passthroughString(template);
    compileCache.set(template, constant);
    return constant;
  }

  const nodes = parseSafely(template);
  if (!nodes) {
    const passthrough = passthroughString(template);
    compileCache.set(template, passthrough);
    return passthrough;
  }

  const compiled: CompiledMessage = (params, locale) => renderNodes(nodes, params, locale, '');
  compileCache.set(template, compiled);
  return compiled;
}

/**
 * Compile a template into a `(params, locale) => RichNode[]` function.
 * Used by `tx()` to produce JSX-renderable output where `<tag>...</tag>`
 * pairs are preserved as structured nodes.
 */
export function compileRichMessage(template: string): CompiledRichMessage {
  const cached = compileRichCache.get(template);
  if (cached) return cached;

  if (!template.includes('{') && !template.includes('<')) {
    const constant = passthroughRich(template);
    compileRichCache.set(template, constant);
    return constant;
  }

  const nodes = parseSafely(template);
  if (!nodes) {
    const passthrough = passthroughRich(template);
    compileRichCache.set(template, passthrough);
    return passthrough;
  }

  const compiled: CompiledRichMessage = (params, locale) => renderRichNodes(nodes, params, locale, '');
  compileRichCache.set(template, compiled);
  return compiled;
}
