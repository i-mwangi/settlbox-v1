type StorageReader = Pick<Storage, "length" | "key" | "getItem" | "setItem">;

export function readWorkspaceStorage(storage: StorageReader, name: string, previousSuffix: string): string | null {
  const current = storage.getItem(name);
  if (current !== null) return current;
  const candidates: string[] = [];
  for (let index = 0; index < storage.length; index++) {
    const key = storage.key(index);
    if (key && key !== name && key.endsWith(previousSuffix)) candidates.push(key);
  }
  if (candidates.length !== 1) return null;
  const previous = storage.getItem(candidates[0]);
  if (previous !== null) storage.setItem(name, previous);
  return previous;
}

export function getBatchStorage() {
  return {
    getItem: (name: string) => readWorkspaceStorage(window.localStorage, name, "-batch-transactions"),
    setItem: (name: string, value: string) => window.localStorage.setItem(name, value),
    removeItem: (name: string) => window.localStorage.removeItem(name),
  };
}
