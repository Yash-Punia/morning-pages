import { expect, test } from 'vitest';
import { reminderDue } from '../../src/backup/reminder.ts';

const DAY = 86_400_000;
const now = 100 * DAY;
const base = { lastBackupAt: null, firstMorning: now - 30 * DAY, days: 7, snoozedOn: null, today: '2026-11-15', now };

test('due once the last backup is older than the chosen days (BAK-2)', () => {
  expect(reminderDue({ ...base, lastBackupAt: now - 6 * DAY })).toBe(false);
  expect(reminderDue({ ...base, lastBackupAt: now - 8 * DAY })).toBe(true);
  expect(reminderDue({ ...base, lastBackupAt: now - 2 * DAY, days: 1 })).toBe(true);
});

test('never backed up counts from the first morning; an empty journal is never reminded', () => {
  expect(reminderDue({ ...base, firstMorning: now - 3 * DAY })).toBe(false);
  expect(reminderDue({ ...base, firstMorning: now - 8 * DAY })).toBe(true);
  expect(reminderDue({ ...base, firstMorning: undefined })).toBe(false);
});

test('"Not now" hides it until tomorrow', () => {
  expect(reminderDue({ ...base, snoozedOn: '2026-11-15' })).toBe(false);
  expect(reminderDue({ ...base, snoozedOn: '2026-11-14' })).toBe(true);
});
