import { warnOnce } from '../internal/diagnostics';
import { toDate } from '../intl/dateValue';
import { getDateTimeFormat, getNumberFormat, getPluralRules } from '../intl/formatters';
import type { Locale } from '../locale/locales';
import type { DateTimeNode, MessageNode, MessageNodes, NumberNode, NumberStyle, PluralNode } from './ast';
import type { ParamReader } from './readParam';

export interface RenderedTag {
  readonly tag: string;
  readonly children: readonly RenderedNode[];
}

export type RenderedNode = string | RenderedTag;

interface EvaluationContext {
  readonly locale: Locale;
  readonly readValue: ParamReader;
  readonly pluralValue: number | undefined;
}

const NUMBER_STYLE_OPTIONS: Readonly<Record<NumberStyle, Intl.NumberFormatOptions>> = {
  percent: { style: 'percent' },
  currency: { style: 'currency', currency: 'USD' },
  integer: { maximumFractionDigits: 0 },
};

const assertNever = (value: never): never => {
  throw new Error(`Unhandled message node ${JSON.stringify(value)}.`);
};

const coerceToString = (value: unknown): string => String(value);

const appendText = (output: RenderedNode[], value: string): void => {
  if (value === '') {
    return;
  }
  const last = output.at(-1);
  if (typeof last === 'string') {
    output[output.length - 1] = last + value;
  } else {
    output.push(value);
  }
};

const formatArgument = (name: string, value: unknown): string =>
  value === null || value === undefined ? `{${name}}` : coerceToString(value);

const resolveNumberOptions = (node: NumberNode): Intl.NumberFormatOptions | undefined => {
  if (node.style === undefined) {
    return undefined;
  }
  if (node.style === 'currency') {
    warnOnce(`{${node.name}, number, currency} assumes USD; use formatNumber with explicit currency options instead.`);
  }
  return NUMBER_STYLE_OPTIONS[node.style];
};

const formatNumberArgument = (node: NumberNode, locale: Locale, value: unknown): string => {
  const numeric = typeof value === 'bigint' ? value : Number(value);
  return getNumberFormat(locale, resolveNumberOptions(node)).format(numeric);
};

const formatDateTimeArgument = (node: DateTimeNode, locale: Locale, value: unknown): string => {
  const options: Intl.DateTimeFormatOptions =
    node.kind === 'date' ? { dateStyle: node.style ?? 'medium' } : { timeStyle: node.style ?? 'short' };
  return getDateTimeFormat(locale, options).format(toDate(value));
};

const selectPluralBranch = (node: PluralNode, count: number, locale: Locale): MessageNodes => {
  const exactBranch = node.exactBranches.get(String(count));
  if (exactBranch !== undefined) {
    return exactBranch;
  }
  if (!Number.isFinite(count)) {
    return node.otherBranch;
  }
  return node.categoryBranches.get(getPluralRules(locale).select(count)) ?? node.otherBranch;
};

const evaluateNode = (output: RenderedNode[], node: MessageNode, context: EvaluationContext): void => {
  switch (node.kind) {
    case 'text':
      appendText(output, node.value);
      return;
    case 'argument':
      appendText(output, formatArgument(node.name, context.readValue(node.name)));
      return;
    case 'number':
      appendText(output, formatNumberArgument(node, context.locale, context.readValue(node.name)));
      return;
    case 'date':
    case 'time':
      appendText(output, formatDateTimeArgument(node, context.locale, context.readValue(node.name)));
      return;
    case 'plural': {
      const count = Number(context.readValue(node.name));
      const branch = selectPluralBranch(node, count, context.locale);
      evaluateNodes(output, branch, { ...context, pluralValue: count });
      return;
    }
    case 'select': {
      const selected = coerceToString(context.readValue(node.name));
      evaluateNodes(output, node.branches.get(selected) ?? node.otherBranch, context);
      return;
    }
    case 'pound':
      appendText(
        output,
        context.pluralValue === undefined ? '#' : getNumberFormat(context.locale).format(context.pluralValue),
      );
      return;
    case 'tag': {
      const children: RenderedNode[] = [];
      evaluateNodes(children, node.children, context);
      output.push({ tag: node.name, children });
      return;
    }
    default:
      assertNever(node);
  }
};

const evaluateNodes = (output: RenderedNode[], nodes: MessageNodes, context: EvaluationContext): void => {
  for (const node of nodes) {
    evaluateNode(output, node, context);
  }
};

export const evaluateMessage = (nodes: MessageNodes, locale: Locale, readValue: ParamReader): RenderedNode[] => {
  const output: RenderedNode[] = [];
  evaluateNodes(output, nodes, { locale, readValue, pluralValue: undefined });
  return output;
};
