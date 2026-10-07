import type { RichMessageParams } from './params';

export const readParam = (params: RichMessageParams, name: string): RichMessageParams[string] =>
  Object.hasOwn(params, name) ? params[name] : undefined;
