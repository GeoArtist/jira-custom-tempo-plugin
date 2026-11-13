import { describe, expect, it } from 'vite-plus/test';
import {
  isPerson,
  isValidAccountId,
  matchPeople,
  MAX_CANDIDATES,
  normaliseName,
  samePerson,
  type PersonCandidate,
} from '../../src/domain/person';

const person = (accountId: string, displayName: string, email?: string): PersonCandidate =>
  email === undefined ? { accountId, displayName } : { accountId, displayName, email };

describe('isValidAccountId', () => {
  it.each(['me', '5b10a2844c20165700ede21g', '712020:0f3c9a1e-7b2d-4c55-9a10-2f6d8e4b1c77', 'a_b', 'x'.repeat(128)])(
    'accepts %s',
    (value) => {
      expect(isValidAccountId(value)).toBe(true);
    },
  );

  it.each(['', 'x'.repeat(129), 'a"b', 'a b', "a'b", 'a)b', 42, null, undefined])('rejects %s', (value) => {
    expect(isValidAccountId(value)).toBe(false);
  });
});

describe('isPerson', () => {
  it('needs a valid account ID and a name of 1 to 255 characters', () => {
    expect(isPerson({ accountId: 'abc', displayName: 'Anna Nowak' })).toBe(true);
    expect(isPerson({ accountId: 'abc', displayName: 'x'.repeat(255) })).toBe(true);
    expect(isPerson({ accountId: 'abc', displayName: '' })).toBe(false);
    expect(isPerson({ accountId: 'abc', displayName: 'x'.repeat(256) })).toBe(false);
    expect(isPerson({ accountId: 'a b', displayName: 'Anna Nowak' })).toBe(false);
    expect(isPerson({ accountId: 'abc' })).toBe(false);
    expect(isPerson({ displayName: 'Anna Nowak' })).toBe(false);
    expect(isPerson(null)).toBe(false);
    expect(isPerson('Anna Nowak')).toBe(false);
  });

  it('tells people apart by their account ID, not by their name', () => {
    expect(samePerson(person('a', 'Anna Nowak'), person('a', 'Anna Kowalska'))).toBe(true);
    expect(samePerson(person('a', 'Anna Nowak'), person('b', 'Anna Nowak'))).toBe(false);
  });
});

describe('normaliseName', () => {
  it('trims, joins runs of white space, and lower-cases', () => {
    expect(normaliseName(' anna  NOWAK ')).toBe('anna nowak');
    expect(normaliseName('Anna\t\nNowak')).toBe('anna nowak');
    expect(normaliseName('   ')).toBe('');
  });

  it('removes Polish diacritical marks, as the search of Jira does', () => {
    expect(normaliseName('Żółć Łukasz')).toBe('zolc lukasz');
    expect(normaliseName('ąćęłńóśźż ĄĆĘŁŃÓŚŹŻ')).toBe('acelnoszz acelnoszz');
  });
});

describe('matchPeople', () => {
  const anna = person('a1', 'Anna Nowak', 'anna.nowak@example.com');
  const annaTwo = person('a2', 'Anna Nowak', 'a.nowak@example.com');
  const longer = person('a3', 'Anna Nowakowska');
  const piotr = person('p1', 'Piotr Nowakowski');
  const zelazny = person('z1', 'Żaneta Żelazna');

  it('asks for a name when the text holds only spaces', () => {
    expect(matchPeople([anna], '')).toEqual({ kind: 'empty' });
    expect(matchPeople([anna], '   ')).toEqual({ kind: 'empty' });
  });

  it('finds nobody when no name contains the text', () => {
    expect(matchPeople([anna, piotr], 'Jan Nieistniejący')).toEqual({ kind: 'notFound' });
    expect(matchPeople([], 'Anna')).toEqual({ kind: 'notFound' });
  });

  it('takes the one person whose whole name is the text, whatever the case and the spaces', () => {
    expect(matchPeople([anna, piotr], 'anna  nowak ')).toEqual({ kind: 'found', person: anna });
    expect(matchPeople([piotr], 'PIOTR NOWAKOWSKI')).toEqual({ kind: 'found', person: piotr });
  });

  it('matches with and without Polish letters, both ways', () => {
    expect(matchPeople([zelazny], 'zaneta zelazna')).toEqual({ kind: 'found', person: zelazny });
    expect(matchPeople([person('k1', 'Zaneta Zelazna')], 'Żaneta Żelazna')).toMatchObject({ kind: 'found' });
  });

  it('offers a list for a part of a name', () => {
    expect(matchPeople([anna, piotr, zelazny], 'Nowak')).toEqual({
      kind: 'several',
      people: [anna, piotr],
      more: false,
    });
    // One person, but only a part of the name: still for the user to confirm.
    expect(matchPeople([piotr], 'Piotr')).toEqual({ kind: 'several', people: [piotr], more: false });
  });

  it('offers a list for two people of the same name', () => {
    expect(matchPeople([annaTwo, anna], 'Anna Nowak')).toEqual({
      kind: 'several',
      people: [anna, annaTwo],
      more: false,
    });
  });

  it('does not take an exact name by itself when a longer name contains it', () => {
    expect(matchPeople([anna, longer], 'Anna Nowak')).toEqual({
      kind: 'several',
      people: [anna, longer],
      more: false,
    });
  });

  it('orders by name with Polish rules, then by account ID', () => {
    const people = [
      person('4', 'Żaneta Zając'),
      person('3', 'Łucja Zając'),
      person('2', 'Lena Zając'),
      person('1', 'Zofia Zając'),
      person('0', 'Lena Zając'),
    ];
    const result = matchPeople(people, 'zajac');
    expect(result.kind === 'several' && result.people.map((p) => `${p.displayName} ${p.accountId}`)).toEqual([
      'Lena Zając 0',
      'Lena Zając 2',
      'Łucja Zając 3',
      'Zofia Zając 1',
      'Żaneta Zając 4',
    ]);
  });

  it('shows at most 10 people and says when there were more', () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      person(`k${index}`, `Jan Kowalski ${String(index).padStart(2, '0')}`),
    );
    const result = matchPeople(many, 'kowalski');
    expect(result.kind).toBe('several');
    if (result.kind !== 'several') return;
    expect(result.people).toHaveLength(MAX_CANDIDATES);
    expect(result.people[0]?.displayName).toBe('Jan Kowalski 00');
    expect(result.more).toBe(true);

    const ten = matchPeople(many.slice(0, 10), 'kowalski');
    expect(ten.kind === 'several' && ten.more).toBe(false);
  });

  it('takes symbols in the text as written', () => {
    expect(matchPeople([anna], '"anna"')).toEqual({ kind: 'notFound' });
    expect(matchPeople([anna], 'a%')).toEqual({ kind: 'notFound' });
    expect(matchPeople([person('d1', 'Anna Nowak-Kowalska')], 'nowak-kowalska')).toMatchObject({ kind: 'several' });
  });
});
