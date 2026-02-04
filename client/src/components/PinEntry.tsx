import { useState, useRef, KeyboardEvent } from 'react';
import styles from './PinEntry.module.css';

interface PinEntryProps {
  onSuccess: (pin: string) => void;
  onCancel?: () => void;
  title?: string;
  showCancel?: boolean;
}

export function PinEntry({
  onSuccess,
  onCancel,
  title = 'Enter Host PIN',
  showCancel = true
}: PinEntryProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null)
  ];

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError(null);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (index === 3 && value) {
      const fullPin = newPin.join('');
      handleSubmit(fullPin);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Backspace: clear current and move to previous
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();

    // Only process if it's exactly 4 digits
    if (/^\d{4}$/.test(pastedData)) {
      const newPin = pastedData.split('');
      setPin(newPin);
      inputRefs[3].current?.focus();
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (pinToVerify: string) => {
    setIsVerifying(true);
    setError(null);

    try {
      // Just pass the PIN to parent - they'll verify it
      onSuccess(pinToVerify);
    } catch (err) {
      setError('Invalid PIN. Please try again.');
      setPin(['', '', '', '']);
      inputRefs[0].current?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleManualSubmit = () => {
    const fullPin = pin.join('');
    if (fullPin.length === 4) {
      handleSubmit(fullPin);
    } else {
      setError('Please enter all 4 digits');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{title}</h2>

        <div className={styles.pinContainer}>
          {pin.map((digit, index) => (
            <input
              key={index}
              ref={inputRefs[index]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              className={styles.pinInput}
              autoFocus={index === 0}
              disabled={isVerifying}
            />
          ))}
        </div>

        {error && (
          <div className={styles.error}>{error}</div>
        )}

        <div className={styles.actions}>
          {showCancel && onCancel && (
            <button
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={onCancel}
              disabled={isVerifying}
            >
              Cancel
            </button>
          )}
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={handleManualSubmit}
            disabled={isVerifying || pin.join('').length !== 4}
          >
            {isVerifying ? 'Verifying...' : 'Submit'}
          </button>
        </div>

        <p className={styles.hint}>
          The 4-digit PIN is set in the server configuration
        </p>
      </div>
    </div>
  );
}
