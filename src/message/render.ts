import type { JSX } from 'solid-js';

import type { Locale } from '../locale/locales';
import { compileMessage } from './compile';
import { evaluateMessage, type RenderedNode, type RenderedTag } from './evaluate';
import type { MessageParams, RichMessageParams } from './params';
import { readParam } from './readParam';

const toPlainText = (nodes: readonly RenderedNode[]): string =>
  nodes.map((node) => (typeof node === 'string' ? node : toPlainText(node.children))).join('');

const renderTag = (tag: RenderedTag, params: RichMessageParams): JSX.Element[] => {
  const children = renderNodes(tag.children, params);
  const handler = readParam(params, tag.tag);
  return typeof handler === 'function' ? [handler(children)] : children;
};

const renderNodes = (nodes: readonly RenderedNode[], params: RichMessageParams): JSX.Element[] =>
  nodes.flatMap<JSX.Element>((node) => (typeof node === 'string' ? [node] : renderTag(node, params)));

export const formatMessage = (template: string, locale: Locale, params: MessageParams): string => {
  const compiled = compileMessage(template, 'plain');
  return compiled === null ? template : toPlainText(evaluateMessage(compiled, locale, params));
};

export const formatRichMessage = (template: string, locale: Locale, params: RichMessageParams): JSX.Element => {
  const compiled = compileMessage(template, 'rich');
  return compiled === null ? template : renderNodes(evaluateMessage(compiled, locale, params), params);
};
