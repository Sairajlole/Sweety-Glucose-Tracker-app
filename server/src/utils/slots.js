/**
 * The four permitted daily reading slots.
 *
 * The keys must stay in sync with the PostgreSQL `time_slot` enum in
 * src/db/schema.sql - the database rejects anything else.
 */
const TIME_SLOTS = [
  { value: 'MORNING', label: 'Morning (Fasting)', shortLabel: 'Morning' },
  { value: 'AFTER_BREAKFAST', label: 'After Breakfast', shortLabel: 'After Breakfast' },
  { value: 'AFTER_LUNCH', label: 'After Lunch', shortLabel: 'After Lunch' },
  { value: 'AFTER_DINNER', label: 'After Dinner', shortLabel: 'After Dinner' },
];

const SLOT_VALUES = TIME_SLOTS.map((slot) => slot.value);

const SLOT_LABELS = TIME_SLOTS.reduce((acc, slot) => {
  acc[slot.value] = slot.label;
  return acc;
}, {});

/** Display label for a slot, e.g. MORNING -> "Morning (Fasting)". */
const slotLabel = (value) => SLOT_LABELS[value] || value;

/**
 * Slot label with the grammatically correct indefinite article.
 *
 * The required message template is "You already have an [slot] reading for
 * this date." With the actual slot names, three of the four need "an" while
 * "Morning (Fasting)" needs "a", so the article is chosen from the label
 * rather than hardcoded, which keeps every message reading naturally:
 *   an After Breakfast reading / a Morning (Fasting) reading
 */
function slotWithArticle(value) {
  const label = slotLabel(value);
  const article = /^[aeiou]/i.test(label) ? 'an' : 'a';
  return `${article} ${label}`;
}

const isValidSlot = (value) => SLOT_VALUES.includes(value);

module.exports = {
  TIME_SLOTS,
  SLOT_VALUES,
  SLOT_LABELS,
  slotLabel,
  slotWithArticle,
  isValidSlot,
};
