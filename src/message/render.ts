import type { JSX } from 'solid-js';

import type { Locale } from '../locale/locales';
import { compileMessage, hasMessageSyntax } from './compile';
import { evaluateMessage, type RenderedNode, type RenderedTag } from './evaluate';
import type { MessageParams, RichMessageParams } from './params';
import { createParamReader, createValueParamReader, readParam } from './readParam';

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
  if (!hasMessageSyntax(template, 'plain')) {
    return template;
  }
  const compiled = compileMessage(template, 'plain');
  return compiled === null ? template : toPlainText(evaluateMessage(compiled, locale, createParamReader(params)));
};

export const formatRichMessage = (template: string, locale: Locale, params: RichMessageParams): JSX.Element => {
  if (!hasMessageSyntax(template, 'rich')) {
    return template;
  }
  const compiled = compileMessage(template, 'rich');
  return compiled === null
    ? template
    : renderNodes(evaluateMessage(compiled, locale, createValueParamReader(params)), params);
};
