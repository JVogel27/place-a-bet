import { useState, FormEvent } from 'react';
import type { BetWithDetails } from '../api/types';
import { playCashRegisterSound } from '../utils/audio';
import styles from './WagerForm.module.css';

interface WagerFormProps {
  bet: BetWithDetails;
  currentUser: string;
  onSubmit: (data: { userName: string; optionId: number; amount: number }) => Promise<void>;
  onCancel: () => void;
}

export function WagerForm({ bet, currentUser, onSubmit, onCancel }: WagerFormProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validate option selection
    if (selectedOptionId === null) {
      newErrors.option = 'Please select an option';
    }

    // Validate amount
    const amountNum = parseInt(amount, 10);
    if (!amount) {
      newErrors.amount = 'Please enter an amount';
    } else if (isNaN(amountNum)) {
      newErrors.amount = 'Amount must be a number';
    } else if (!Number.isInteger(amountNum)) {
      newErrors.amount = 'Amount must be whole dollars (no cents)';
    } else if (amountNum <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    } else if (amountNum > 10000) {
      newErrors.amount = 'Amount cannot exceed $10,000';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) return;
    if (selectedOptionId === null) return;

    setIsSubmitting(true);

    try {
      await onSubmit({
        userName: currentUser,
        optionId: selectedOptionId,
        amount: parseInt(amount, 10)
      });

      // Play success sound
      playCashRegisterSound();

      // Reset form on success
      setSelectedOptionId(null);
      setAmount('');
      setErrors({});
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Failed to place wager'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAmountChange = (value: string) => {
    // Only allow integers (no decimal points)
    const cleaned = value.replace(/[^\d]/g, '');
    setAmount(cleaned);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Place a Wager</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <div className={styles.betInfo}>
          <p className={styles.question}>{bet.question}</p>
          <p className={styles.pool}>Current Pool: ${bet.totalPool.toFixed(0)}</p>
          <p className={styles.userInfo}>Placing wager as: <strong>{currentUser}</strong></p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Option Selection */}
          <div className={styles.field}>
            <label className={styles.label}>Select Your Prediction</label>
            <div className={styles.options}>
              {bet.options.map(option => {
                const optionWagers = bet.wagers.filter(w => w.optionId === option.id);
                const optionTotal = optionWagers.reduce((sum, w) => sum + w.amount, 0);

                return (
                  <label
                    key={option.id}
                    className={`${styles.optionLabel} ${
                      selectedOptionId === option.id ? styles.optionLabelSelected : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="option"
                      value={option.id}
                      checked={selectedOptionId === option.id}
                      onChange={() => setSelectedOptionId(option.id)}
                      className={styles.radio}
                    />
                    <div className={styles.optionContent}>
                      <span className={styles.optionText}>{option.label}</span>
                      <span className={styles.optionTotal}>${optionTotal.toFixed(0)}</span>
                    </div>
                  </label>
                );
              })}
            </div>
            {errors.option && <span className={styles.error}>{errors.option}</span>}
          </div>

          {/* Amount Input */}
          <div className={styles.field}>
            <label htmlFor="amount" className={styles.label}>
              Wager Amount (Whole Dollars)
            </label>
            <div className={styles.amountWrapper}>
              <span className={styles.dollarSign}>$</span>
              <input
                type="text"
                id="amount"
                inputMode="numeric"
                value={amount}
                onChange={e => handleAmountChange(e.target.value)}
                className={styles.amountInput}
                placeholder="0"
              />
            </div>
            {errors.amount && <span className={styles.error}>{errors.amount}</span>}
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
              {isSubmitting ? 'Placing Wager...' : 'Place Wager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
