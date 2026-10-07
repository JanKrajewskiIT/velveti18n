import type { JSX } from 'solid-js';

type MessageParamValue = string | number | boolean | Date | null | undefined;

export type TagHandler = (children: JSX.Element) => JSX.Element;

export type MessageParams = Readonly<Record<string, MessageParamValue>>;

export type RichMessageParams = Readonly<Record<string, MessageParamValue | TagHandler>>;
