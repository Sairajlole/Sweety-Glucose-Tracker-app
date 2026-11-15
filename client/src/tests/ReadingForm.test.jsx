import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadingForm, { validateReading, MESSAGES } from '../components/ReadingForm';
import { todayISO } from '../utils/dates';

/** Local 'YYYY-MM-DD' offset from today, for date-boundary tests. */
function isoOffset(days) {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function renderForm(overrides = {}) {
  const onSubmit = overrides.onSubmit || vi.fn().mockResolvedValue(undefined);
  const onCancel = overrides.onCancel || vi.fn();

  render(
    <ReadingForm
      initialValues={overrides.initialValues}
      onSubmit={onSubmit}
      onCancel={onCancel}
      submitLabel={overrides.submitLabel}
    />
  );

  return { onSubmit, onCancel, user: userEvent.setup() };
}

describe('ReadingForm - rendering', () => {
  it('renders the date, time slot and glucose fields', () => {
    renderForm();

    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/time slot/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/glucose value/i)).toBeInTheDocument();
  });

  it('shows the mg/dL unit indicator', () => {
    renderForm();
    expect(screen.getByText('mg/dL')).toBeInTheDocument();
  });

  it('offers exactly the four permitted time slots', () => {
    renderForm();
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(4);
    expect(options.map((option) => option.textContent)).toEqual([
      'Morning (Fasting)',
      'After Breakfast',
      'After Lunch',
      'After Dinner',
    ]);
  });

  it('defaults the date to today and blocks future dates via max', () => {
    renderForm();
    const dateInput = screen.getByLabelText(/date/i);
    expect(dateInput).toHaveValue(todayISO());
    expect(dateInput).toHaveAttribute('max', todayISO());
  });

  it('pre-fills values when editing', () => {
    renderForm({
      initialValues: {
        readingDate: '2026-11-10',
        timeSlot: 'AFTER_LUNCH',
        glucoseValue: 145,
      },
      submitLabel: 'Update reading',
    });

    expect(screen.getByLabelText(/date/i)).toHaveValue('2026-11-10');
    expect(screen.getByLabelText(/time slot/i)).toHaveValue('AFTER_LUNCH');
    expect(screen.getByLabelText(/glucose value/i)).toHaveValue('145');
    expect(screen.getByRole('button', { name: /update reading/i })).toBeInTheDocument();
  });
});

describe('ReadingForm - validation', () => {
  it('requires a glucose value', async () => {
    const { onSubmit, user } = renderForm();

    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText(MESSAGES.glucoseRequired)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a value below 40', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText(/glucose value/i), '39');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText(MESSAGES.glucoseRange)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a value above 600', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText(/glucose value/i), '601');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText(MESSAGES.glucoseRange)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a decimal value', async () => {
    const { onSubmit, user } = renderForm();

    await user.type(screen.getByLabelText(/glucose value/i), '97.5');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText(MESSAGES.glucoseRange)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rejects a future date', async () => {
    const { onSubmit, user } = renderForm();

    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: isoOffset(1) } });
    await user.type(screen.getByLabelText(/glucose value/i), '120');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(await screen.findByText(MESSAGES.dateFuture)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears a field error once the user starts typing', async () => {
    const { user } = renderForm();

    await user.click(screen.getByRole('button', { name: /save reading/i }));
    expect(await screen.findByText(MESSAGES.glucoseRequired)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/glucose value/i), '1');
    await waitFor(() => {
      expect(screen.queryByText(MESSAGES.glucoseRequired)).not.toBeInTheDocument();
    });
  });
});

describe('ReadingForm - submission', () => {
  it('submits a valid reading with numeric glucose', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const { user } = renderForm({ onSubmit: onSaved });

    await user.type(screen.getByLabelText(/glucose value/i), '118');
    await user.selectOptions(screen.getByLabelText(/time slot/i), 'AFTER_BREAKFAST');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onSaved).toHaveBeenCalledWith({
      readingDate: todayISO(),
      timeSlot: 'AFTER_BREAKFAST',
      glucoseValue: 118,
    });
  });

  it('accepts the boundary value 40', async () => {
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const { user } = renderForm({ onSubmit: onSaved });

    await user.type(screen.getByLabelText(/glucose value/i), '40');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(onSaved.mock.calls[0][0].glucoseValue).toBe(40);
  });

  it('shows the server message when the API rejects the reading', async () => {
    const onSaved = vi.fn().mockRejectedValue({
      response: {
        status: 409,
        data: { message: 'You already have a Morning (Fasting) reading for this date.' },
      },
    });
    const { user } = renderForm({ onSubmit: onSaved });

    await user.type(screen.getByLabelText(/glucose value/i), '120');
    await user.click(screen.getByRole('button', { name: /save reading/i }));

    expect(
      await screen.findByText('You already have a Morning (Fasting) reading for this date.')
    ).toBeInTheDocument();
  });

  it('calls onCancel when cancel is clicked', async () => {
    const { onCancel, onSubmit, user } = renderForm();

    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('validateReading', () => {
  it('returns no errors for a valid reading', () => {
    expect(
      validateReading({ readingDate: todayISO(), timeSlot: 'MORNING', glucoseValue: '110' })
    ).toEqual({});
  });

  it('flags every empty field at once', () => {
    const errors = validateReading({ readingDate: '', timeSlot: '', glucoseValue: '' });
    expect(errors).toEqual({
      readingDate: MESSAGES.dateRequired,
      timeSlot: MESSAGES.slotRequired,
      glucoseValue: MESSAGES.glucoseRequired,
    });
  });

  it('treats a whitespace-only value as missing', () => {
    const errors = validateReading({
      readingDate: todayISO(),
      timeSlot: 'MORNING',
      glucoseValue: '   ',
    });
    expect(errors.glucoseValue).toBe(MESSAGES.glucoseRequired);
  });
});
