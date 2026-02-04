import { useState, FormEvent } from 'react';
import type { BetWithDetails } from '../api/types';
import { playCashRegisterSound } from '../utils/audio';
import styles from './WagerForm.module.css';

interface WagerFormProps {
  bet: BetWithDetails;
  recentUserNames: string[];
  onSubmit: (data: { userName: string; optionId: number; amount: number }) => Promise<void>;
  onCancel: () => void;
}

export function WagerForm({ bet, recentUserNames, onSubmit, onCancel }: WagerFormProps) {
  const [userName, setUserName] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [amount, setAmount] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Filter recent names based on input
  const filteredNames = recentUserNames.filter(name =>
    name.toLowerCase().includes(userName.toLowerCase())
  );

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // Validate user name
    if (!userName.trim()) {
      newErrors.userName = 'Please enter your name';
    } else if (userName.trim().length < 1 || userName.trim().length > 50) {
      newErrors.userName = 'Name must be between 1 and 50 characters';
    }

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
        userName: userName.trim(),
        optionId: selectedOptionId,
        amount: parseInt(amount, 10)
      });

      // Play success sound
      playCashRegisterSound();

      // Reset form on success
      setUserName('');
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

  const handleNameSelect = (name: string) => {
    setUserName(name);
    setShowSuggestions(false);
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
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* User Name Input */}
          <div className={styles.field}>
            <label htmlFor="userName" className={styles.label}>
              Your Name
            </label>
            <div className={styles.autocompleteWrapper}>
              <input
                type="text"
                id="userName"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                className={styles.input}
                placeholder="Enter your name"
                autoComplete="off"
              />
              {showSuggestions && filteredNames.length > 0 && userName.length > 0 && (
                <ul className={styles.suggestions}>
                  {filteredNames.slice(0, 5).map((name, index) => (
                    <li
                      key={index}
                      className={styles.suggestion}
                      onMouseDown={() => handleNameSelect(name)}
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {errors.userName && <span className={styles.error}>{errors.userName}</span>}
          </div>

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
