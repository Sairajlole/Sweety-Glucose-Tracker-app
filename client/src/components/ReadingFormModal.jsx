import Modal from './Modal';
import ReadingForm from './ReadingForm';

/** Modal wrapper around the reading form, used for both create and edit. */
export default function ReadingFormModal({ open, mode = 'create', initialValues, onClose, onSaved }) {
  const isEdit = mode === 'edit';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit reading' : 'Add a reading'}
      description={
        isEdit
          ? 'Update the details of this glucose reading.'
          : 'Record a new blood glucose measurement.'
      }
    >
      <ReadingForm
        initialValues={initialValues}
        onSubmit={onSaved}
        onCancel={onClose}
        submitLabel={isEdit ? 'Update reading' : 'Save reading'}
      />
    </Modal>
  );
}
