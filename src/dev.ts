interface ImportMetaEnvLike {
  DEV?: boolean;
  MODE?: string;
}

const warnedMessages = new Set<string>();

export const isDev = (): boolean => {
  const env = (import.meta as { env?: ImportMetaEnvLike }).env;
  if (!env) return false;
  if (env.DEV !== undefined) return env.DEV;
  if (env.MODE !== undefined) return env.MODE !== 'production';
  return false;
};

export const warnDevOnce = (message: string): void => {
  if (!isDev()) return;
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  console.warn(message);
};
