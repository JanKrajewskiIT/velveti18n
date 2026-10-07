export interface BoundedCache<Key, Value> {
  getOrCreate: (key: Key, create: () => Value) => Value;
}

export const createBoundedCache = <Key, Value extends object | null>(limit: number): BoundedCache<Key, Value> => {
  const entries = new Map<Key, Value>();

  return {
    getOrCreate: (key, create) => {
      const cached = entries.get(key);
      if (cached !== undefined) {
        entries.delete(key);
        entries.set(key, cached);
        return cached;
      }

      const created = create();
      entries.set(key, created);
      if (entries.size > limit) {
        const oldest = entries.keys().next();
        if (!oldest.done) {
          entries.delete(oldest.value);
        }
      }
      return created;
    },
  };
};
