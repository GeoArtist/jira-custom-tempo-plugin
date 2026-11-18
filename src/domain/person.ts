// The people of the Jira site whose logged time can be shown, and how a typed name is
// matched against them (specs/002-other-user-worktime/data-model.md).

export interface Person {
  /** Jira's account ID: the identity. A name is not one, two people can share it. */
  accountId: string;
  /** The full name exactly as Jira has it (FR-008). */
  displayName: string;
}

/** A person offered in the list of the settings (FR-030). */
export interface PersonCandidate extends Person {
  /** Present only when Jira shows the address to the signed-in user. */
  email?: string;
}

export const MAX_NAME_LENGTH = 255;
/** The list never shows more people than this (FR-030). */
export const MAX_CANDIDATES = 10;

const ACCOUNT_ID = /^[A-Za-z0-9:_-]{1,128}$/;

/** Only such a value may be placed in a query or kept in the browser. */
export function isValidAccountId(value: unknown): value is string {
  return typeof value === 'string' && ACCOUNT_ID.test(value);
}

export function isPerson(value: unknown): value is Person {
  if (typeof value !== 'object' || value === null) return false;
  const { accountId, displayName } = value as Record<string, unknown>;
  return (
    isValidAccountId(accountId) &&
    typeof displayName === 'string' &&
    displayName.length >= 1 &&
    displayName.length <= MAX_NAME_LENGTH
  );
}

export const samePerson = (a: Person, b: Person): boolean => a.accountId === b.accountId;

const COMBINING_MARKS = /[\u0300-\u036f]/g;
/** The one Polish letter that does not split into a letter and a mark. */
const L_WITH_STROKE = /\u0142/g;

/**
 * Makes a typed text and a full name comparable (FR-017): no spaces at the ends, one space
 * between words, lower case, and no diacritical marks, because Jira's own search ignores
 * them too.
 */
export function normaliseName(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(L_WITH_STROKE, 'l');
}

/** What a typed text gives against the people Jira returned for it (FR-018, FR-026). */
export type NameMatch =
  | { kind: 'empty' }
  | { kind: 'notFound' }
  | { kind: 'found'; person: PersonCandidate }
  | { kind: 'several'; people: PersonCandidate[]; more: boolean };

const collator = new Intl.Collator('pl');

/**
 * A person matches when their name contains the text. One person whose whole name is the
 * text is certain; anything else with a match is for the user to pick from, so a second
 * person with a longer name is never hidden.
 */
export function matchPeople(candidates: readonly PersonCandidate[], text: string): NameMatch {
  const wanted = normaliseName(text);
  if (wanted === '') return { kind: 'empty' };

  const matching = candidates.filter((candidate) => normaliseName(candidate.displayName).includes(wanted));
  if (matching.length === 0) return { kind: 'notFound' };

  const only = matching[0];
  if (matching.length === 1 && only && normaliseName(only.displayName) === wanted) {
    return { kind: 'found', person: only };
  }

  // The same order every time, also for people who share a name.
  const ordered = matching.toSorted(
    (a, b) => collator.compare(a.displayName, b.displayName) || (a.accountId < b.accountId ? -1 : 1),
  );
  return { kind: 'several', people: ordered.slice(0, MAX_CANDIDATES), more: ordered.length > MAX_CANDIDATES };
}
