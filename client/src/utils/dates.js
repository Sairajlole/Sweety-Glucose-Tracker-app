const pad = (n) => String(n).padStart(2, '0');

/** Local-time 'YYYY-MM-DD' (never UTC, so the calendar day never shifts). */
export function todayISO(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** e.g. "15 Nov 2026" */
export function formatDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** e.g. "Saturday, 15 November 2026" */
export function formatLongDate(iso) {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** e.g. "November 2026" */
export function formatMonth(iso) {
  if (!iso) return '';
  const [year, month] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Today" / "Yesterday" / formatted date, for friendly reading lists. */
export function relativeDate(iso) {
  const today = todayISO();
  const [y, m, d] = today.split('-').map(Number);
  const yesterday = todayISO(new Date(y, m - 1, d - 1));
  if (iso === today) return 'Today';
  if (iso === yesterday) return 'Yesterday';
  return formatDate(iso);
}

export const SLOT_OPTIONS = [
  { value: 'MORNING', label: 'Morning (Fasting)' },
  { value: 'AFTER_BREAKFAST', label: 'After Breakfast' },
  { value: 'AFTER_LUNCH', label: 'After Lunch' },
  { value: 'AFTER_DINNER', label: 'After Dinner' },
];

export const SLOT_LABELS = SLOT_OPTIONS.reduce((acc, slot) => {
  acc[slot.value] = slot.label;
  return acc;
}, {});
