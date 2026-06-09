type ViteEnv = { readonly DEV?: boolean; readonly MODE?: string };

export const isDevEnvironment = (): boolean => {
  try {
    const env = (import.meta as unknown as { env?: ViteEnv }).env;
    if (env) {
      if (typeof env.DEV === 'boolean') return env.DEV;
      if (typeof env.MODE === 'string') return env.MODE !== 'production';
    }
  } catch {
    void 0;
  }
  try {
    const proc = (globalThis as { process?: { env?: { NODE_ENV?: string } } }).process;
    if (proc?.env && typeof proc.env.NODE_ENV === 'string') {
      return proc.env.NODE_ENV !== 'production';
    }
  } catch {
    void 0;
  }
  return false;
};

const warned = new Set<string>();

export const warnOnce = (uniqueKey: string, message: string): void => {
  if (!isDevEnvironment()) return;
  if (warned.has(uniqueKey)) return;
  warned.add(uniqueKey);
  console.warn(message);
};
