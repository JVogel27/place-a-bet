import { useState, FormEvent } from 'react';
import { createBet } from '../api/client';
import type { BetWithDetails } from '../api/types';
import styles from './CreateBetForm.module.css';

interface CreateBetFormProps {
  createdBy: string;
  onSuccess: (bet: BetWithDetails) => void;
  onCancel: () => void;
}

export function CreateBetForm({ createdBy, onSuccess, onCancel }: CreateBetFormProps) {
  const [question, setQuestion] = useState('');
  const [type, setType] = useState<'yes_no' | 'multi_option'>('multi_option');
  const [options, setOptions] = useState(['', '']);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!question.trim()) {
      newErrors.question = 'Question is required';
    } else if (question.length > 500) {
      newErrors.question = 'Question must be 500 characters or less';
    }

    const filledOptions = options.filter(opt => opt.trim());
    if (filledOptions.length < 2) {
      newErrors.options = 'At least 2 options are required';
    }

    if (filledOptions.some(opt => opt.length > 100)) {
      newErrors.options = 'Each option must be 100 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);

    try {
      const filledOptions = options.filter(opt => opt.trim()).map(opt => opt.trim());

      const bet = await createBet({
        question: question.trim(),
        type,
        createdBy,
        options: filledOptions
      });

      onSuccess(bet);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to create bet'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleTypeChange = (newType: 'yes_no' | 'multi_option') => {
    setType(newType);
    if (newType === 'yes_no') {
      setOptions(['Yes', 'No']);
    } else if (options.length === 2 && options[0] === 'Yes' && options[1] === 'No') {
      setOptions(['', '']);
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Create New Bet</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Question */}
          <div className={styles.field}>
            <label htmlFor="question" className={styles.label}>
              Question *
            </label>
            <input
              type="text"
              id="question"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              className={styles.input}
              placeholder="e.g., Which team will win?"
              autoFocus
            />
            {errors.question && <span className={styles.error}>{errors.question}</span>}
          </div>

          {/* Bet Type */}
          <div className={styles.field}>
            <label className={styles.label}>Bet Type *</label>
            <div className={styles.typeButtons}>
              <button
                type="button"
                className={`${styles.typeButton} ${type === 'yes_no' ? styles.typeButtonActive : ''}`}
                onClick={() => handleTypeChange('yes_no')}
              >
                Yes/No
              </button>
              <button
                type="button"
                className={`${styles.typeButton} ${type === 'multi_option' ? styles.typeButtonActive : ''}`}
                onClick={() => handleTypeChange('multi_option')}
              >
                Multiple Options
              </button>
            </div>
          </div>

          {/* Options */}
          <div className={styles.field}>
            <label className={styles.label}>
              Options * ({options.filter(o => o.trim()).length} filled)
            </label>
            <div className={styles.options}>
              {options.map((option, index) => (
                <div key={index} className={styles.optionRow}>
                  <input
                    type="text"
                    value={option}
                    onChange={e => handleOptionChange(index, e.target.value)}
                    className={styles.optionInput}
                    placeholder={`Option ${index + 1}`}
                    disabled={type === 'yes_no'}
                  />
                  {type === 'multi_option' && options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className={styles.removeButton}
                      title="Remove option"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {type === 'multi_option' && options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                className={styles.addButton}
              >
                + Add Option
              </button>
            )}
            {errors.options && <span className={styles.error}>{errors.options}</span>}
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
              {isSubmitting ? 'Creating...' : 'Create Bet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
