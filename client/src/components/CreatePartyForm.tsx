import { useState, FormEvent } from 'react';
import { createParty } from '../api/client';
import type { Party } from '../api/types';
import styles from './CreatePartyForm.module.css';

interface CreatePartyFormProps {
  hostPin: string;
  onSuccess: (party: Party) => void;
  onCancel: () => void;
}

export function CreatePartyForm({ hostPin, onSuccess, onCancel }: CreatePartyFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(() => {
    // Default to today at 6 PM
    const now = new Date();
    now.setHours(18, 0, 0, 0);
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  });
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Party name is required';
    } else if (name.length > 100) {
      newErrors.name = 'Party name must be 100 characters or less';
    }

    if (!date) {
      newErrors.date = 'Date is required';
    }

    if (description && description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Convert datetime-local to ISO string
      const isoDate = new Date(date).toISOString();

      const party = await createParty({
        name: name.trim(),
        date: isoDate,
        description: description.trim() || undefined,
        hostPin
      });

      onSuccess(party);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create party'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create New Party</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Party Name */}
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Party Name *
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={e => setName(e.target.value)}
              className={styles.input}
              placeholder="e.g., Super Bowl Party 2026"
              autoFocus
            />
            {errors.name && <span className={styles.error}>{errors.name}</span>}
          </div>

          {/* Date & Time */}
          <div className={styles.field}>
            <label htmlFor="date" className={styles.label}>
              Date & Time *
            </label>
            <input
              type="datetime-local"
              id="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={styles.input}
            />
            {errors.date && <span className={styles.error}>{errors.date}</span>}
          </div>

          {/* Description */}
          <div className={styles.field}>
            <label htmlFor="description" className={styles.label}>
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className={styles.textarea}
              placeholder="Add details about the party..."
              rows={3}
            />
            {errors.description && <span className={styles.error}>{errors.description}</span>}
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className={styles.submitError}>{errors.submit}</div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              onClick={onCancel}
              className={`${styles.button} ${styles.buttonSecondary}`}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Party'}
            </button>
          </div>
        </form>

        <p className={styles.note}>
          Note: Creating a new party will archive the current active party.
        </p>
      </div>
    </div>
  );
}
