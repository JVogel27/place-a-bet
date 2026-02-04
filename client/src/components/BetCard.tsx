import { useMemo } from 'react';
import type { BetWithDetails, WagersByOption } from '../api/types';
import styles from './BetCard.module.css';

interface BetCardProps {
  bet: BetWithDetails;
  currentUser: string | null;
  onPlaceWager?: (betId: number) => void;
  onCloseBet?: (betId: number) => void;
  onSettleBet?: (betId: number) => void;
  showHostActions?: boolean;
}

export function BetCard({
  bet,
  currentUser,
  onPlaceWager,
  onCloseBet,
  onSettleBet,
  showHostActions = false
}: BetCardProps) {
  // Group wagers by option
  const wagersByOption = useMemo<WagersByOption[]>(() => {
    const grouped = bet.options.map(option => {
      const optionWagers = bet.wagers.filter(w => w.optionId === option.id);
      const total = optionWagers.reduce((sum, w) => sum + w.amount, 0);

      return {
        optionId: option.id,
        optionLabel: option.label,
        wagers: optionWagers,
        total
      };
    });

    return grouped.sort((a, b) => b.total - a.total);
  }, [bet.options, bet.wagers]);

  // Get user's wagers for this bet
  const userWagers = useMemo(() => {
    if (!currentUser) return [];
    return bet.wagers.filter(w => w.userName === currentUser);
  }, [bet.wagers, currentUser]);

  // Calculate total user wagered
  const userTotalWagered = useMemo(() => {
    return userWagers.reduce((sum, w) => sum + w.amount, 0);
  }, [userWagers]);

  const getStatusBadge = () => {
    switch (bet.status) {
      case 'open':
        return <span className={`${styles.badge} ${styles.badgeOpen}`}>Open</span>;
      case 'closed':
        return <span className={`${styles.badge} ${styles.badgeClosed}`}>Closed</span>;
      case 'settled':
        return <span className={`${styles.badge} ${styles.badgeSettled}`}>Settled</span>;
      default:
        return null;
    }
  };

  const getWinningOption = () => {
    if (bet.status !== 'settled' || !bet.winningOptionId) return null;
    return bet.options.find(opt => opt.id === bet.winningOptionId);
  };

  const winningOption = getWinningOption();

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.question}>{bet.question}</h3>
        {getStatusBadge()}
      </div>

      <div className={styles.meta}>
        <span className={styles.creator}>Created by {bet.createdBy}</span>
        <span className={styles.pool}>Pool: ${bet.totalPool.toFixed(0)}</span>
      </div>

      {/* Winning Option (if settled) */}
      {winningOption && (
        <div className={styles.winner}>
          <strong>Winner:</strong> {winningOption.label}
        </div>
      )}

      {/* Options and Wagers */}
      <div className={styles.options}>
        {wagersByOption.map(({ optionId, optionLabel, wagers, total }) => {
          const isWinner = bet.status === 'settled' && optionId === bet.winningOptionId;

          return (
            <div
              key={optionId}
              className={`${styles.option} ${isWinner ? styles.optionWinner : ''}`}
            >
              <div className={styles.optionHeader}>
                <span className={styles.optionLabel}>
                  {isWinner && '🏆 '}
                  {optionLabel}
                </span>
                <span className={styles.optionTotal}>${total.toFixed(0)}</span>
              </div>

              {wagers.length > 0 && (
                <div className={styles.wagerList}>
                  {wagers.map(wager => (
                    <div
                      key={wager.id}
                      className={`${styles.wager} ${
                        wager.userName === currentUser ? styles.wagerCurrentUser : ''
                      }`}
                    >
                      <span className={styles.wagerUser}>{wager.userName}</span>
                      <span className={styles.wagerAmount}>${wager.amount.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User's Wagers Summary */}
      {userWagers.length > 0 && (
        <div className={styles.userSummary}>
          <strong>Your total:</strong> ${userTotalWagered.toFixed(0)} across{' '}
          {userWagers.length} wager{userWagers.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Actions */}
      <div className={styles.actions}>
        {bet.status === 'open' && onPlaceWager && (
          <button
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => onPlaceWager(bet.id)}
          >
            Place Wager
          </button>
        )}

        {showHostActions && bet.status === 'open' && onCloseBet && (
          <button
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => onCloseBet(bet.id)}
          >
            Close Betting
          </button>
        )}

        {showHostActions && bet.status === 'closed' && onSettleBet && (
          <button
            className={`${styles.button} ${styles.buttonSuccess}`}
            onClick={() => onSettleBet(bet.id)}
          >
            Settle Bet
          </button>
        )}
      </div>
    </div>
  );
}
