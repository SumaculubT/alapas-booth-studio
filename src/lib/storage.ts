const CURRENT_PREFIX = 'alapas-';
const LEGACY_PREFIX = 'snapstrip-';

export const STORAGE_KEYS = {
  userTemplate: 'user-template',
  templateUrl: 'template-url',
  layout: 'layout',
  printSettings: 'print-settings',
} as const;

function currentKey(key: string) {
  return `${CURRENT_PREFIX}${key}`;
}

function legacyKey(key: string) {
  return `${LEGACY_PREFIX}${key}`;
}

export function getStorageItem(storage: Storage, key: string): string | null {
  return storage.getItem(currentKey(key)) ?? storage.getItem(legacyKey(key));
}

export function setStorageItem(storage: Storage, key: string, value: string) {
  storage.setItem(currentKey(key), value);
}

export function removeStorageItem(storage: Storage, key: string) {
  storage.removeItem(currentKey(key));
  storage.removeItem(legacyKey(key));
}
