import { useState } from 'react';
import { settleBet, closeBet } from '../api/client';
import type { BetWithDetails } from '../api/types';
import { PinEntry } from './PinEntry';
import styles from './SettleBetModal.module.css';

interface SettleBetModalProps {
  bet: BetWithDetails;
  action: 'close' | 'settle';
  onSuccess: () => void;
  onCancel: () => void;
}

export function SettleBetModal({ bet, action, onSuccess, onCancel }: SettleBetModalProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePinSuccess = async (pin: string) => {
    setIsProcessing(true);
    setError(null);

    try {
      if (action === 'close') {
        await closeBet(bet.id, { hostPin: pin });
      } else {
        if (!selectedOptionId) {
          setError('Please select a winning option');
          setIsProcessing(false);
          return;
        }
        await settleBet(bet.id, {
          winningOptionId: selectedOptionId,
          hostPin: pin
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action} bet`);
      setShowPinEntry(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = () => {
    if (action === 'settle' && !selectedOptionId) {
      setError('Please select a winning option');
      return;
    }
    setShowPinEntry(true);
  };

  if (showPinEntry) {
    return (
      <PinEntry
        title={action === 'close' ? 'Enter PIN to Close Bet' : 'Enter PIN to Settle Bet'}
        onSuccess={handlePinSuccess}
        onCancel={() => setShowPinEntry(false)}
      />
    );
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {action === 'close' ? 'Close Betting' : 'Settle Bet'}
          </h2>
          <button className={styles.closeButton} onClick={onCancel}>
            ×
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.betInfo}>
            <p className={styles.question}>{bet.question}</p>
            <p className={styles.pool}>Total Pool: ${bet.totalPool.toFixed(0)}</p>
          </div>

          {action === 'close' ? (
            <div className={styles.confirmSection}>
              <p className={styles.confirmText}>
                Are you sure you want to close betting? No more wagers can be placed after this.
              </p>
            </div>
          ) : (
            <div className={styles.optionsSection}>
              <label className={styles.label}>Select Winning Option:</label>
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
                        name="winner"
                        value={option.id}
                        checked={selectedOptionId === option.id}
                        onChange={() => setSelectedOptionId(option.id)}
                        className={styles.radio}
                      />
                      <div className={styles.optionContent}>
                        <span className={styles.optionText}>{option.label}</span>
                        <span className={styles.optionInfo}>
                          ${optionTotal.toFixed(0)} ({optionWagers.length} wagers)
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {error && (
            <div className={styles.error}>{error}</div>
          )}

          <div className={styles.actions}>
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              onClick={handleSubmit}
              disabled={isProcessing || (action === 'settle' && !selectedOptionId)}
            >
              {isProcessing ? 'Processing...' : action === 'close' ? 'Close Betting' : 'Settle Bet'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
