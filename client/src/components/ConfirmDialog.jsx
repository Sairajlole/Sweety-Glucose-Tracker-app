import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Spinner from './Spinner';

/** Confirmation dialog used before deleting a reading. */
export default function ConfirmDialog({
  open,
  title = 'Delete reading?',
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  busy = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn-danger"
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? <Spinner className="h-4 w-4 text-white" /> : null}
            {busy ? 'Deleting...' : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50">
          <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden="true" />
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          {message || 'This action cannot be undone.'}
        </p>
      </div>
    </Modal>
  );
}
