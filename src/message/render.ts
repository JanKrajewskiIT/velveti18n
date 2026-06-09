import { formatMessageDate, formatMessageNumber, formatPoundNumber, getPluralRules } from '../intl';
import type { MessageParams, RichMessageParams } from '../params';
import type { MessageNode, PluralNode, RichNode, SelectNode } from './ast';

type AnyParams = MessageParams | RichMessageParams;

const substituteArg = (name: string, params: AnyParams): string => {
  const value = params[name];
  if (value === null || value === undefined) return `{${name}}`;
  return String(value);
};

const selectPluralBranch = (node: PluralNode, value: number, locale: string): readonly MessageNode[] => {
  const exact = node.exact.get(String(value));
  if (exact) return exact;
  if (Number.isFinite(value)) {
    const category = getPluralRules(locale).select(value);
    const branch = node.categories.get(category);
    if (branch) return branch;
  }
  return node.categories.get('other') ?? [];
};

const selectSelectBranch = (node: SelectNode, value: string): readonly MessageNode[] =>
  node.branches.get(value) ?? node.branches.get('other') ?? [];

export const renderPlain = (
  nodes: readonly MessageNode[],
  params: AnyParams,
  locale: string,
  pound?: number,
): string => {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += node.value;
        break;
      case 'arg':
        out += substituteArg(node.name, params);
        break;
      case 'number':
        out += formatMessageNumber(params[node.name], node.style, locale);
        break;
      case 'date':
        out += formatMessageDate(params[node.name], node.kind, node.style, locale);
        break;
      case 'pound':
        out += formatPoundNumber(pound ?? 0, locale);
        break;
      case 'plural': {
        const value = Number(params[node.name]);
        out += renderPlain(selectPluralBranch(node, value, locale), params, locale, value);
        break;
      }
      case 'select':
        out += renderPlain(selectSelectBranch(node, String(params[node.name])), params, locale, pound);
        break;
      case 'tag':
        out += renderPlain(node.children, params, locale, pound);
        break;
    }
  }
  return out;
};

const pushSegment = (out: RichNode[], segment: string): void => {
  const last = out[out.length - 1];
  if (typeof last === 'string') out[out.length - 1] = last + segment;
  else out.push(segment);
};

const appendNodes = (out: RichNode[], nodes: readonly RichNode[]): void => {
  for (const node of nodes) {
    if (typeof node === 'string') pushSegment(out, node);
    else out.push(node);
  }
};

export const renderRich = (
  nodes: readonly MessageNode[],
  params: RichMessageParams,
  locale: string,
  pound?: number,
): RichNode[] => {
  const out: RichNode[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        pushSegment(out, node.value);
        break;
      case 'arg':
        pushSegment(out, substituteArg(node.name, params));
        break;
      case 'number':
        pushSegment(out, formatMessageNumber(params[node.name], node.style, locale));
        break;
      case 'date':
        pushSegment(out, formatMessageDate(params[node.name], node.kind, node.style, locale));
        break;
      case 'pound':
        pushSegment(out, formatPoundNumber(pound ?? 0, locale));
        break;
      case 'plural': {
        const value = Number(params[node.name]);
        appendNodes(out, renderRich(selectPluralBranch(node, value, locale), params, locale, value));
        break;
      }
      case 'select':
        appendNodes(out, renderRich(selectSelectBranch(node, String(params[node.name])), params, locale, pound));
        break;
      case 'tag':
        out.push({ tag: node.name, children: renderRich(node.children, params, locale, pound) });
        break;
    }
  }
  return out;
};
