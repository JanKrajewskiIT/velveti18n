import type { JSX } from 'solid-js';

export type MessageParamValue = string | number | boolean | Date | null | undefined;

export type MessageParams = Readonly<Record<string, MessageParamValue>>;

export type TagHandler = (children: JSX.Element) => JSX.Element;

export type RichMessageParams = Readonly<Record<string, MessageParamValue | TagHandler>>;
