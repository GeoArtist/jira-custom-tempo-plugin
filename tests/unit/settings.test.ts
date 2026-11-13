import { describe, expect, it } from 'vite-plus/test';
import {
  DEFAULT_SETTINGS,
  readSettings,
  SETTINGS_KEY,
  validateInterval,
  writeSettings,
  type SettingsStorage,
} from '../../src/domain/settings';

function memoryStorage(initial?: string): SettingsStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  if (initial !== undefined) data.set(SETTINGS_KEY, initial);
  return { data, getItem: (key) => data.get(key) ?? null, setItem: (key, value) => void data.set(key, value) };
}

const throwing: SettingsStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  },
};

describe('readSettings', () => {
  it('defaults to 5 minutes and dark', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      refreshMinutes: 5,
      theme: 'dark',
      panelHeight: null,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
    expect(readSettings(memoryStorage())).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
  });

  it('reads stored values, including 0 for "off"', () => {
    const stored = memoryStorage(
      JSON.stringify({ refreshMinutes: 0, theme: 'light', panelHeight: 600, panelWidth: null, launcher: null }),
    );
    expect(readSettings(stored)).toEqual({
      refreshMinutes: 0,
      theme: 'light',
      panelHeight: 600,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
  });

  it('falls back to defaults on unparsable data or a blocked storage', () => {
    expect(readSettings(memoryStorage('{not json'))).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(memoryStorage('"text"'))).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(throwing)).toEqual(DEFAULT_SETTINGS);
  });

  it('replaces only the invalid field', () => {
    expect(readSettings(memoryStorage(JSON.stringify({ refreshMinutes: 2000, theme: 'light' })))).toEqual({
      refreshMinutes: 5,
      theme: 'light',
      panelHeight: null,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
    expect(readSettings(memoryStorage(JSON.stringify({ refreshMinutes: 10, theme: 'blue', extra: 1 })))).toEqual({
      refreshMinutes: 10,
      theme: 'dark',
      panelHeight: null,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
    // A height that is too low, too high, or not a whole number of pixels is not used.
    for (const panelHeight of [100, 5000, 500.5, '500']) {
      expect(readSettings(memoryStorage(JSON.stringify({ theme: 'light', panelHeight })))).toEqual({
        refreshMinutes: 5,
        theme: 'light',
        panelHeight: null,
        panelWidth: null,
        launcher: null,
        lastPerson: null,
      });
    }
    expect(readSettings(memoryStorage(JSON.stringify({ refreshMinutes: 2.5 }))).refreshMinutes).toBe(5);
  });
});

describe('writeSettings', () => {
  it('stores all fields under the versioned key', () => {
    const storage = memoryStorage();
    const settings = {
      refreshMinutes: 10,
      theme: 'light',
      panelHeight: 600,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    } as const;
    expect(writeSettings(storage, settings)).toBe(true);
    expect(JSON.parse(storage.data.get('worktime.settings.v1') ?? '')).toEqual(settings);
  });

  it('reports a storage that refuses to write', () => {
    expect(writeSettings(throwing, DEFAULT_SETTINGS)).toBe(false);
    expect(writeSettings(null, DEFAULT_SETTINGS)).toBe(false);
  });
});

describe('validateInterval', () => {
  it('accepts whole numbers from 0 to 1440', () => {
    expect(validateInterval('0')).toBe(0);
    expect(validateInterval(' 5 ')).toBe(5);
    expect(validateInterval('1440')).toBe(1440);
  });

  it('rejects empty, negative, fractional, non-numeric, and too large values', () => {
    for (const text of ['', '  ', '-1', '2.5', '2,5', 'abc', '5min', '1441', '1e2']) {
      expect(validateInterval(text)).toBeNull();
    }
  });
});

describe('panel width and launcher position', () => {
  const read = (value: object) => readSettings(memoryStorage(JSON.stringify(value)));

  it('reads a saved width and a saved launcher position', () => {
    const settings = read({ panelWidth: 900, launcher: { right: 300, bottom: 200, extra: 1 } });
    expect(settings.panelWidth).toBe(900);
    expect(settings.launcher).toEqual({ right: 300, bottom: 200 });
  });

  it('falls back to the default for a width outside the limits', () => {
    for (const panelWidth of [639, 4001, 700.5, '700', null]) {
      expect(read({ panelWidth }).panelWidth).toBeNull();
    }
    expect(read({ panelWidth: 640 }).panelWidth).toBe(640);
  });

  it('falls back to the default corner for a broken launcher position', () => {
    for (const launcher of [{ right: -1, bottom: 0 }, { right: 10 }, { right: 1.5, bottom: 2 }, 'left', [1, 2], null]) {
      expect(read({ launcher }).launcher).toBeNull();
    }
  });
});

describe('the remembered person', () => {
  const read = (stored: object) => readSettings(memoryStorage(JSON.stringify(stored)));
  const anna = { accountId: '712020:0f3c9a1e-7b2d-4c55-9a10-2f6d8e4b1c77', displayName: 'Anna Nowak' };

  it('is nobody by default and in settings stored by the previous version', () => {
    expect(DEFAULT_SETTINGS.lastPerson).toBeNull();
    expect(read({ refreshMinutes: 10, theme: 'light', panelHeight: null, panelWidth: null, launcher: null })).toEqual({
      refreshMinutes: 10,
      theme: 'light',
      panelHeight: null,
      panelWidth: null,
      launcher: null,
      lastPerson: null,
    });
  });

  it('is read with its two fields only', () => {
    expect(read({ lastPerson: { ...anna, emailAddress: 'anna@example.com' } }).lastPerson).toEqual(anna);
  });

  it.each([
    ['a missing account ID', { displayName: 'Anna Nowak' }],
    ['an account ID that is not one', { accountId: 'a" OR "b', displayName: 'Anna Nowak' }],
    ['an account ID of 129 characters', { accountId: 'x'.repeat(129), displayName: 'Anna Nowak' }],
    ['a missing name', { accountId: 'abc' }],
    ['an empty name', { accountId: 'abc', displayName: '' }],
    ['a name of 256 characters', { accountId: 'abc', displayName: 'x'.repeat(256) }],
    ['a text', 'Anna Nowak'],
    ['a list', [anna]],
  ])('counts as nobody with %s, and the other fields keep their values', (_what, lastPerson) => {
    const settings = read({ refreshMinutes: 15, theme: 'light', lastPerson });
    expect(settings.lastPerson).toBeNull();
    expect([settings.refreshMinutes, settings.theme]).toEqual([15, 'light']);
  });

  it('accepts a name of 255 characters', () => {
    const long = { accountId: 'abc', displayName: 'x'.repeat(255) };
    expect(read({ lastPerson: long }).lastPerson).toEqual(long);
  });

  it('is stored with the other settings under the same key', () => {
    const storage = memoryStorage();
    const settings = { ...DEFAULT_SETTINGS, lastPerson: anna };
    expect(writeSettings(storage, settings)).toBe(true);
    expect([...storage.data.keys()]).toEqual([SETTINGS_KEY]);
    expect(SETTINGS_KEY).toBe('worktime.settings.v1');
    expect(readSettings(storage)).toEqual(settings);
  });
});
