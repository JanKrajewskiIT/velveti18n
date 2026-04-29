import { warnDevOnce } from '../dev';
import type { Locale, MessageParams } from '../types';
import {
  coerceDate,
  getDateTimeFormat,
  getNumberFormat,
  getPluralRules,
  resolveDateTimeStyle,
  resolveNumberStyle,
} from './intl';
import { type MessageNode, parseMessage } from './parser';

export type CompiledMessage = (params: MessageParams | undefined, locale: Locale) => string;

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

const renderNodes = (
  nodes: ReadonlyArray<MessageNode>,
  params: MessageParams | undefined,
  locale: Locale,
  poundValue: string,
): string => {
  let output = '';
  for (const node of nodes) {
    output += renderNode(node, params, locale, poundValue);
  }
  return output;
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
      const exact = node.branches.find((branch) => branch.key === exactKey);
      if (exact) return renderNodes(exact.nodes, params, locale, formatted);
      const category = getPluralRules(locale).select(value);
      const branch =
        node.branches.find((candidate) => candidate.key === category) ??
        node.branches.find((candidate) => candidate.key === 'other');
      return branch ? renderNodes(branch.nodes, params, locale, formatted) : formatted;
    }
    case 'select': {
      const raw = params?.[node.name];
      const key = raw === undefined || raw === null ? 'other' : String(raw);
      const branch =
        node.branches.find((candidate) => candidate.key === key) ??
        node.branches.find((candidate) => candidate.key === 'other');
      return branch ? renderNodes(branch.nodes, params, locale, '') : '';
    }
    case 'tag':
      return renderNodes(node.children, params, locale, poundValue);
  }
};

const pushText = (output: RichNode[], text: string): void => {
  if (text.length === 0) return;
  const last = output[output.length - 1];
  if (typeof last === 'string') {
    output[output.length - 1] = last + text;
  } else {
    output.push(text);
  }
};

const renderRichNodes = (
  nodes: ReadonlyArray<MessageNode>,
  params: MessageParams | undefined,
  locale: Locale,
  poundValue: string,
): ReadonlyArray<RichNode> => {
  const output: RichNode[] = [];
  for (const node of nodes) {
    appendRichNode(output, node, params, locale, poundValue);
  }
  return output;
};

const appendRichNode = (
  output: RichNode[],
  node: MessageNode,
  params: MessageParams | undefined,
  locale: Locale,
  poundValue: string,
): void => {
  switch (node.type) {
    case 'literal':
      pushText(output, node.value);
      return;
    case 'pound':
      pushText(output, poundValue);
      return;
    case 'argument':
    case 'number':
    case 'date':
    case 'time':
    case 'select':
      pushText(output, renderNode(node, params, locale, poundValue));
      return;
    case 'plural': {
      const value = coerceNumber(params?.[node.name]);
      const formatted = getNumberFormat(locale).format(value);
      const exactKey = `=${value}`;
      const branch =
        node.branches.find((candidate) => candidate.key === exactKey) ??
        node.branches.find((candidate) => candidate.key === getPluralRules(locale).select(value)) ??
        node.branches.find((candidate) => candidate.key === 'other');
      if (!branch) {
        pushText(output, formatted);
        return;
      }
      for (const child of branch.nodes) {
        appendRichNode(output, child, params, locale, formatted);
      }
      return;
    }
    case 'tag':
      output.push({
        tag: node.name,
        children: renderRichNodes(node.children, params, locale, poundValue),
      });
      return;
  }
};

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
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown parser error';
    warnDevOnce(`[velvet-i18n] Failed to parse message template "${template}": ${reason}`);
    return null;
  }
};

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
