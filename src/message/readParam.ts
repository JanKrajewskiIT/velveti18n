import type { RichMessageParams } from './params';

export type ParamReader = (name: string) => unknown;

export const readParam = (params: RichMessageParams, name: string): RichMessageParams[string] =>
  Object.hasOwn(params, name) ? params[name] : undefined;

export const createParamReader =
  (params: RichMessageParams): ParamReader =>
  (name) =>
    readParam(params, name);

// Rich messages reserve function values for tag handlers, so placeholders see them as absent.
export const createValueParamReader =
  (params: RichMessageParams): ParamReader =>
  (name) => {
    const value = readParam(params, name);
    return typeof value === 'function' ? undefined : value;
  };
