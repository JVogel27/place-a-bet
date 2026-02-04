import { useState, useEffect } from 'react';
import { getSettlementSummary, getBets } from '../api/client';
import type { SettlementSummary, BetWithDetails } from '../api/types';
import { showWinnerConfetti } from '../utils/confetti';
import styles from './SettlementDisplay.module.css';

interface SettlementDisplayProps {
  partyId: number;
  currentUser: string | null;
}

export function SettlementDisplay({ partyId, currentUser }: SettlementDisplayProps) {
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [settledBets, setSettledBets] = useState<BetWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confettiShown, setConfettiShown] = useState(false);
  const [expandedBets, setExpandedBets] = useState<Set<number>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [summaryData, betsData] = await Promise.all([
          getSettlementSummary(partyId),
          getBets('settled')
        ]);
        setSummary(summaryData);
        setSettledBets(betsData);
      } catch (err) {
        console.error('Error fetching settlement data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load settlement data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [partyId]);

  // Show confetti if current user is a winner
  useEffect(() => {
    if (!summary || !currentUser || confettiShown) return;

    const userSummary = summary.users.find(u => u.userName === currentUser);

    // If user won money, show confetti once
    if (userSummary && userSummary.netAmount > 0) {
      // Check localStorage to avoid showing confetti every time
      const confettiKey = `confetti_shown_${partyId}_${currentUser}`;
      const alreadyShown = localStorage.getItem(confettiKey);

      if (!alreadyShown) {
        setTimeout(() => {
          showWinnerConfetti();
          setConfettiShown(true);
          localStorage.setItem(confettiKey, 'true');
        }, 500); // Delay slightly for better UX
      }
    }
  }, [summary, currentUser, partyId, confettiShown]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading settlement summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!summary || summary.users.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>No settlements yet. Bets need to be settled first!</p>
        </div>
      </div>
    );
  }

  const winners = summary.users.filter(u => u.netAmount > 0);
  const losers = summary.users.filter(u => u.netAmount < 0);
  const breakEven = summary.users.filter(u => u.netAmount === 0);

  const currentUserSummary = summary.users.find(u => u.userName === currentUser);

  // Helper function to toggle bet expansion
  const toggleBetExpansion = (betId: number) => {
    setExpandedBets(prev => {
      const next = new Set(prev);
      if (next.has(betId)) {
        next.delete(betId);
      } else {
        next.add(betId);
      }
      return next;
    });
  };

  // Calculate bet breakdown for a specific bet
  const calculateBetBreakdown = (bet: BetWithDetails) => {
    const totalPool = bet.totalPool;
    const winningOption = bet.options.find(opt => opt.id === bet.winningOptionId);

    if (!winningOption) return null;

    // Calculate winning pool
    const winningWagers = bet.wagers.filter(w => w.optionId === bet.winningOptionId);
    const winningPool = winningWagers.reduce((sum, w) => sum + w.amount, 0);

    // Group wagers by user
    const userMap = new Map<string, {
      totalWagered: number;
      onWinning: number;
      wagers: typeof bet.wagers;
    }>();

    bet.wagers.forEach(wager => {
      if (!userMap.has(wager.userName)) {
        userMap.set(wager.userName, {
          totalWagered: 0,
          onWinning: 0,
          wagers: []
        });
      }
      const user = userMap.get(wager.userName)!;
      user.totalWagered += wager.amount;
      user.wagers.push(wager);
      if (wager.optionId === bet.winningOptionId) {
        user.onWinning += wager.amount;
      }
    });

    // Calculate payouts
    const userPayouts = Array.from(userMap.entries()).map(([userName, data]) => {
      const payout = winningPool > 0 ? (data.onWinning / winningPool) * totalPool : 0;
      const netWinLoss = payout - data.totalWagered;

      return {
        userName,
        totalWagered: data.totalWagered,
        onWinning: data.onWinning,
        payout: Math.round(payout * 100) / 100,
        netWinLoss: Math.round(netWinLoss * 100) / 100,
        wagers: data.wagers
      };
    });

    // Sort by net win/loss
    userPayouts.sort((a, b) => b.netWinLoss - a.netWinLoss);

    return {
      totalPool,
      winningPool,
      winningOption,
      userPayouts
    };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Settlement Summary</h2>
        <p className={styles.partyName}>{summary.partyName}</p>
        <p className={styles.totalPot}>Total Pot: ${summary.totalPot.toFixed(0)}</p>
      </div>

      {/* Current User Summary */}
      {currentUser && currentUserSummary && (
        <div
          className={`${styles.currentUserCard} ${
            currentUserSummary.netAmount > 0
              ? styles.currentUserWinner
              : currentUserSummary.netAmount < 0
              ? styles.currentUserLoser
              : styles.currentUserBreakEven
          }`}
        >
          <p className={styles.currentUserLabel}>Your Result:</p>
          <p className={styles.currentUserAmount}>
            {currentUserSummary.netAmount > 0 && '+'}
            ${currentUserSummary.netAmount.toFixed(2)}
          </p>
          {currentUserSummary.netAmount > 0 && (
            <p className={styles.currentUserMessage}>The house owes you!</p>
          )}
          {currentUserSummary.netAmount < 0 && (
            <p className={styles.currentUserMessage}>You owe the house</p>
          )}
          {currentUserSummary.netAmount === 0 && (
            <p className={styles.currentUserMessage}>You broke even</p>
          )}
        </div>
      )}

      {/* Winners Section */}
      {winners.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.iconWinner}>🏆</span> Winners
          </h3>
          <div className={styles.userList}>
            {winners.map((user, index) => (
              <div
                key={user.userName}
                className={`${styles.userRow} ${styles.userRowWinner} ${
                  user.userName === currentUser ? styles.userRowCurrent : ''
                }`}
              >
                <div className={styles.userInfo}>
                  <span className={styles.rank}>#{index + 1}</span>
                  <span className={styles.userName}>
                    {user.userName}
                    {user.userName === currentUser && ' (You)'}
                  </span>
                </div>
                <span className={styles.amount}>+${user.netAmount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Break Even Section */}
      {breakEven.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.iconBreakEven}>➖</span> Break Even
          </h3>
          <div className={styles.userList}>
            {breakEven.map(user => (
              <div
                key={user.userName}
                className={`${styles.userRow} ${styles.userRowBreakEven} ${
                  user.userName === currentUser ? styles.userRowCurrent : ''
                }`}
              >
                <div className={styles.userInfo}>
                  <span className={styles.userName}>
                    {user.userName}
                    {user.userName === currentUser && ' (You)'}
                  </span>
                </div>
                <span className={styles.amount}>$0.00</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Losers Section */}
      {losers.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.iconLoser}>❌</span> Losers
          </h3>
          <div className={styles.userList}>
            {losers.map((user, index) => (
              <div
                key={user.userName}
                className={`${styles.userRow} ${styles.userRowLoser} ${
                  user.userName === currentUser ? styles.userRowCurrent : ''
                }`}
              >
                <div className={styles.userInfo}>
                  <span className={styles.rank}>#{index + 1}</span>
                  <span className={styles.userName}>
                    {user.userName}
                    {user.userName === currentUser && ' (You)'}
                  </span>
                </div>
                <span className={styles.amount}>${user.netAmount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bet-by-Bet Breakdown */}
      {settledBets.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>
            <span className={styles.iconBreakdown}>📊</span> Bet-by-Bet Breakdown
          </h3>
          <p className={styles.breakdownDescription}>
            Click on any bet to see detailed payout calculations
          </p>
          <div className={styles.betBreakdownList}>
            {settledBets.map(bet => {
              const breakdown = calculateBetBreakdown(bet);
              if (!breakdown) return null;

              const isExpanded = expandedBets.has(bet.id);

              return (
                <div key={bet.id} className={styles.betBreakdownCard}>
                  <button
                    className={styles.betBreakdownHeader}
                    onClick={() => toggleBetExpansion(bet.id)}
                  >
                    <div className={styles.betBreakdownTitle}>
                      <span className={styles.betQuestion}>{bet.question}</span>
                      <span className={styles.betPool}>Pool: ${bet.totalPool.toFixed(0)}</span>
                    </div>
                    <span className={styles.expandIcon}>
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className={styles.betBreakdownContent}>
                      {/* Summary */}
                      <div className={styles.breakdownSummary}>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>Winner:</span>
                          <span className={styles.summaryValue}>
                            🏆 {breakdown.winningOption.label}
                          </span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>Total Pool:</span>
                          <span className={styles.summaryValue}>
                            ${breakdown.totalPool.toFixed(2)}
                          </span>
                        </div>
                        <div className={styles.summaryItem}>
                          <span className={styles.summaryLabel}>Winning Pool:</span>
                          <span className={styles.summaryValue}>
                            ${breakdown.winningPool.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Formula Explanation */}
                      <div className={styles.formulaBox}>
                        <p className={styles.formulaTitle}>Payout Formula:</p>
                        <p className={styles.formula}>
                          Payout = (Wager on Winner ÷ Winning Pool) × Total Pool
                        </p>
                        <p className={styles.formula}>
                          Net Result = Payout - Total Wagered
                        </p>
                      </div>

                      {/* Per-User Breakdown */}
                      <div className={styles.userPayouts}>
                        <p className={styles.userPayoutsTitle}>User Payouts:</p>
                        {breakdown.userPayouts.map(userPayout => (
                          <div
                            key={userPayout.userName}
                            className={`${styles.userPayoutRow} ${
                              userPayout.userName === currentUser ? styles.userPayoutCurrent : ''
                            }`}
                          >
                            <div className={styles.userPayoutHeader}>
                              <span className={styles.userPayoutName}>
                                {userPayout.userName}
                                {userPayout.userName === currentUser && ' (You)'}
                              </span>
                              <span
                                className={`${styles.userPayoutNet} ${
                                  userPayout.netWinLoss > 0
                                    ? styles.userPayoutNetWin
                                    : userPayout.netWinLoss < 0
                                    ? styles.userPayoutNetLoss
                                    : ''
                                }`}
                              >
                                {userPayout.netWinLoss > 0 && '+'}
                                ${userPayout.netWinLoss.toFixed(2)}
                              </span>
                            </div>
                            <div className={styles.userPayoutDetails}>
                              <div className={styles.payoutLine}>
                                <span>Total Wagered:</span>
                                <span>${userPayout.totalWagered.toFixed(2)}</span>
                              </div>
                              <div className={styles.payoutLine}>
                                <span>On Winner ({breakdown.winningOption.label}):</span>
                                <span>${userPayout.onWinning.toFixed(2)}</span>
                              </div>
                              {userPayout.onWinning > 0 && (
                                <div className={styles.payoutLine}>
                                  <span>Share of Pool:</span>
                                  <span>
                                    {((userPayout.onWinning / breakdown.winningPool) * 100).toFixed(1)}%
                                  </span>
                                </div>
                              )}
                              <div className={`${styles.payoutLine} ${styles.payoutLineTotal}`}>
                                <span>Payout:</span>
                                <span>${userPayout.payout.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
