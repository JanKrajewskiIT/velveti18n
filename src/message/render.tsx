import type { JSX } from 'solid-js';

import { warnOnce } from '../env.js';
import { coerceDate, formatDateForLocale, formatNumberForLocale } from '../intl.js';
import type { MessageParams, RichMessageParams, TagHandler } from '../types.js';
import type { MessageNode } from './ast.js';
import { parseMessage } from './parser.js';

type Params = RichMessageParams;
type PluralValues = readonly number[];
const emptyBranch: readonly MessageNode[] = [];

const currentPluralValue = (pluralValues: PluralValues): number => pluralValues[pluralValues.length - 1] ?? Number.NaN;

const choiceBranch = (
  branches: Readonly<Record<string, readonly MessageNode[]>>,
  selector: string,
): readonly MessageNode[] => branches[selector] ?? branches.other ?? emptyBranch;

const argumentValue = (name: string, params: Params): RichMessageParams[string] | undefined =>
  Object.hasOwn(params, name) ? params[name] : undefined;

const plainArgumentValue = (name: string, params: Params): MessageParams[string] | undefined => {
  const value = argumentValue(name, params);
  return typeof value === 'function' ? undefined : value;
};

const stringifyMessageValue = (value: string | number | boolean | Date | TagHandler): string => {
  if (value instanceof Date || typeof value === 'function') {
    return value.toString();
  }
  return String(value);
};

const numberValue = (value: unknown): number | bigint => (typeof value === 'bigint' ? value : Number(value));

const formatArgument = (
  node: Extract<MessageNode, { type: 'argument' }>,
  params: Params,
  locale: string,
  ignoreTagHandlers = false,
): string => {
  const value = ignoreTagHandlers ? plainArgumentValue(node.name, params) : argumentValue(node.name, params);

  if (node.format === 'simple') {
    return value === null || value === undefined ? `{${node.name}}` : stringifyMessageValue(value);
  }

  if (node.format === 'number') {
    let options: Intl.NumberFormatOptions | undefined;
    if (node.style === 'percent') {
      options = { style: 'percent' };
    } else if (node.style === 'currency') {
      warnOnce(
        'message-currency-style',
        'The "currency" message style defaults to USD; use formatNumber for explicit currency formatting.',
      );
      options = { style: 'currency', currency: 'USD' };
    } else if (node.style === 'integer') {
      options = { maximumFractionDigits: 0 };
    }
    return formatNumberForLocale(locale, numberValue(value), options);
  }

  const date = coerceDate(value);
  const dateStyle = node.style ?? (node.format === 'date' ? 'medium' : 'short');
  return formatDateForLocale(
    locale,
    date,
    node.format === 'date'
      ? { dateStyle: dateStyle as Intl.DateTimeFormatOptions['dateStyle'] }
      : { timeStyle: dateStyle as Intl.DateTimeFormatOptions['timeStyle'] },
  );
};

const renderStringNodes = (
  nodes: readonly MessageNode[],
  params: Params,
  locale: string,
  pluralValues: PluralValues,
): string =>
  nodes
    .map((node) => {
      if (node.type === 'text') {
        return node.value;
      }
      if (node.type === 'pound') {
        return formatNumberForLocale(locale, currentPluralValue(pluralValues));
      }
      if (node.type === 'argument') {
        return formatArgument(node, params, locale);
      }
      if (node.type === 'tag') {
        return `<${node.name}>${renderStringNodes(node.children, params, locale, pluralValues)}</${node.name}>`;
      }

      if (node.mode === 'select') {
        const selector = String(argumentValue(node.name, params));
        const branch = choiceBranch(node.branches, selector);
        return renderStringNodes(branch, params, locale, pluralValues);
      }

      const value = Number(argumentValue(node.name, params));
      const exactBranch = node.branches[`=${String(value)}`];
      const category = Number.isFinite(value) ? new Intl.PluralRules(locale).select(value) : 'other';
      const branch = choiceBranch(node.branches, exactBranch ? `=${String(value)}` : category);
      return renderStringNodes(branch, params, locale, [...pluralValues, value]);
    })
    .join('');

const renderRichNodes = (
  nodes: readonly MessageNode[],
  params: RichMessageParams,
  locale: string,
  pluralValues: PluralValues,
): JSX.Element =>
  nodes.map((node) => {
    if (node.type === 'text') {
      return node.value;
    }
    if (node.type === 'pound') {
      return formatNumberForLocale(locale, currentPluralValue(pluralValues));
    }
    if (node.type === 'argument') {
      const value = formatArgument(node, params, locale, true);
      return value;
    }
    if (node.type === 'tag') {
      const children = renderRichNodes(node.children, params, locale, pluralValues);
      const handler = Object.hasOwn(params, node.name) ? params[node.name] : undefined;
      if (typeof handler === 'function') {
        return handler(children);
      }
      return node.children.length > 0 ? children : '';
    }

    if (node.mode === 'select') {
      const selector = String(plainArgumentValue(node.name, params));
      return renderRichNodes(choiceBranch(node.branches, selector), params, locale, pluralValues);
    }

    const value = Number(plainArgumentValue(node.name, params));
    const exactBranch = node.branches[`=${String(value)}`];
    const category = Number.isFinite(value) ? new Intl.PluralRules(locale).select(value) : 'other';
    return renderRichNodes(choiceBranch(node.branches, exactBranch ? `=${String(value)}` : category), params, locale, [
      ...pluralValues,
      value,
    ]);
  });

const parsedTemplates = new Map<string, ReturnType<typeof parseMessage>>();

const getParsedTemplate = (template: string, rich: boolean): ReturnType<typeof parseMessage> | undefined => {
  const cacheKey = `${rich ? 'rich' : 'plain'}:${template}`;
  const cached = parsedTemplates.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const parsed = parseMessage(template, rich);
    parsedTemplates.set(cacheKey, parsed);
    return parsed;
  } catch {
    warnOnce(`invalid-template:${template}`, 'An invalid i18n message template was returned unchanged.');
    return undefined;
  }
};

export const formatMessage = (template: string, params: MessageParams, locale: string): string => {
  if (!template.includes('{') && !template.includes('}') && !template.includes("''") && !/'[{}<>#]/u.test(template)) {
    return template;
  }

  const parsed = getParsedTemplate(template, false);
  return parsed ? renderStringNodes(parsed.nodes, params, locale, []) : template;
};

export const formatRichMessage = (template: string, params: RichMessageParams, locale: string): JSX.Element => {
  if (
    !template.includes('{') &&
    !template.includes('}') &&
    !template.includes('<') &&
    !template.includes("''") &&
    !/'[{}<>#]/u.test(template)
  ) {
    return <>{template}</>;
  }

  const parsed = getParsedTemplate(template, true);
  return <>{parsed ? renderRichNodes(parsed.nodes, params, locale, []) : template}</>;
};
