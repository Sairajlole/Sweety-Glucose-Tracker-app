import { useState } from 'react';
import { AlertCircle, CalendarDays, Clock, Droplets } from 'lucide-react';
import { getErrorMessage, getFieldErrors } from '../api/client';
import { SLOT_OPTIONS, todayISO } from '../utils/dates';
import Spinner from './Spinner';

export const MESSAGES = {
  glucoseRequired: 'Please enter a glucose value.',
  glucoseRange: 'Value must be between 40 and 600 mg/dl.',
  dateRequired: 'Please select a date.',
  dateFuture: 'Date cannot be in the future.',
  slotRequired: 'Please select a time slot.',
};

/**
 * Client-side validation that mirrors the server rules and messages exactly.
 * The server remains the authority; this exists to give instant feedback.
 */
export function validateReading({ readingDate, timeSlot, glucoseValue }) {
  const errors = {};

  if (!readingDate) {
    errors.readingDate = MESSAGES.dateRequired;
  } else if (readingDate > todayISO()) {
    errors.readingDate = MESSAGES.dateFuture;
  }

  if (!timeSlot) {
    errors.timeSlot = MESSAGES.slotRequired;
  }

  const raw = String(glucoseValue ?? '').trim();
  if (!raw) {
    errors.glucoseValue = MESSAGES.glucoseRequired;
  } else if (!/^\d+$/.test(raw)) {
    // Rejects decimals such as 97.5 as well as non-numeric input.
    errors.glucoseValue = MESSAGES.glucoseRange;
  } else {
    const parsed = Number(raw);
    if (parsed < 40 || parsed > 600) {
      errors.glucoseValue = MESSAGES.glucoseRange;
    }
  }

  return errors;
}

function FieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} className="field-error" role="alert">
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </p>
  );
}

export default function ReadingForm({
  initialValues,
  onSubmit,
  onCancel,
  submitLabel = 'Save reading',
}) {
  const [values, setValues] = useState({
    readingDate: initialValues?.readingDate || todayISO(),
    timeSlot: initialValues?.timeSlot || 'MORNING',
    glucoseValue: initialValues?.glucoseValue ?? '',
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = todayISO();

  const updateField = (field) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const nextErrors = validateReading(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    setFormError('');

    try {
      await onSubmit({
        readingDate: values.readingDate,
        timeSlot: values.timeSlot,
        glucoseValue: Number(values.glucoseValue),
      });
    } catch (error) {
      // Map anything the server rejected back onto the matching field.
      const fieldErrors = getFieldErrors(error);
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }
      setFormError(getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {formError ? (
        <div
          className="mb-5 flex items-start gap-2.5 rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
          <p className="text-sm font-medium text-rose-700">{formError}</p>
        </div>
      ) : null}

      <div className="space-y-5">
        {/* Date */}
        <div>
          <label htmlFor="reading-date" className="label">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Date
              <span className="text-rose-500" aria-hidden="true">*</span>
            </span>
          </label>
          <input
            id="reading-date"
            name="readingDate"
            type="date"
            className={`input ${errors.readingDate ? 'input-error' : ''}`}
            value={values.readingDate}
            max={today}
            onChange={updateField('readingDate')}
            aria-invalid={errors.readingDate ? 'true' : 'false'}
            aria-describedby={errors.readingDate ? 'reading-date-error' : undefined}
            required
          />
          <FieldError id="reading-date-error" message={errors.readingDate} />
        </div>

        {/* Time slot */}
        <div>
          <label htmlFor="time-slot" className="label">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Time slot
              <span className="text-rose-500" aria-hidden="true">*</span>
            </span>
          </label>
          <select
            id="time-slot"
            name="timeSlot"
            className={`input ${errors.timeSlot ? 'input-error' : ''}`}
            value={values.timeSlot}
            onChange={updateField('timeSlot')}
            aria-invalid={errors.timeSlot ? 'true' : 'false'}
            aria-describedby={errors.timeSlot ? 'time-slot-error' : undefined}
            required
          >
            {SLOT_OPTIONS.map((slot) => (
              <option key={slot.value} value={slot.value}>
                {slot.label}
              </option>
            ))}
          </select>
          <FieldError id="time-slot-error" message={errors.timeSlot} />
        </div>

        {/* Glucose value */}
        <div>
          <label htmlFor="glucose-value" className="label">
            <span className="inline-flex items-center gap-1.5">
              <Droplets className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Glucose value
              <span className="text-rose-500" aria-hidden="true">*</span>
            </span>
          </label>
          <div className="relative">
            <input
              id="glucose-value"
              name="glucoseValue"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="e.g. 110"
              className={`input pr-20 ${errors.glucoseValue ? 'input-error' : ''}`}
              value={values.glucoseValue}
              onChange={updateField('glucoseValue')}
              aria-invalid={errors.glucoseValue ? 'true' : 'false'}
              aria-describedby={errors.glucoseValue ? 'glucose-value-error' : undefined}
              required
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-medium text-slate-400">
              mg/dL
            </span>
          </div>
          <FieldError id="glucose-value-error" message={errors.glucoseValue} />
          <p className="mt-1.5 text-xs text-slate-400">Whole numbers between 40 and 600.</p>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {onCancel ? (
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <Spinner className="h-4 w-4 text-white" /> : null}
          {submitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
