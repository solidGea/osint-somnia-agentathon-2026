const asyncStorageShim = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => null,
  removeItem: async (_key: string) => null,
  clear: async () => null,
  getAllKeys: async () => [],
  multiGet: async (_keys: string[]) => [],
  multiSet: async (_pairs: [string, string][]) => null,
  multiRemove: async (_keys: string[]) => null
};

export default asyncStorageShim;
