/**
 * Payout Calculator for Place-A-Bet
 *
 * Calculates payouts for a settled bet using the house bank model with proportional distribution.
 *
 * Formula:
 * - Total Pool = Sum of all wagers across all options
 * - Winning Pool = Sum of wagers on winning option
 * - For each user:
 *   - Total Wagered = Sum of their wagers across all options
 *   - Wager on Winning = Sum of their wagers on winning option only
 *   - Payout = (Wager on Winning / Winning Pool) × Total Pool
 *   - Net Win/Loss = Payout - Total Wagered
 */

export interface UserWager {
  userName: string;
  optionId: number;
  amount: number;
}

export interface PayoutResult {
  userName: string;
  totalWagered: number;
  payout: number;
  netWinLoss: number;
}

/**
 * Calculate payouts for a settled bet
 *
 * @param wagers - Array of all wagers placed on the bet
 * @param winningOptionId - The ID of the option that won
 * @returns Array of payout results for each unique user, sorted by net win/loss (winners first)
 */
export function calculatePayouts(
  wagers: UserWager[],
  winningOptionId: number
): PayoutResult[] {
  // Edge case: No wagers
  if (wagers.length === 0) {
    return [];
  }

  // Calculate total pool size
  const totalPool = wagers.reduce((sum, wager) => sum + wager.amount, 0);

  // Calculate winning pool size
  const winningPool = wagers
    .filter(wager => wager.optionId === winningOptionId)
    .reduce((sum, wager) => sum + wager.amount, 0);

  // Edge case: No one bet on the winning option (everyone loses)
  if (winningPool === 0) {
    // Group users and calculate their total losses
    const userMap = new Map<string, number>();
    wagers.forEach(wager => {
      const current = userMap.get(wager.userName) || 0;
      userMap.set(wager.userName, current + wager.amount);
    });

    const results: PayoutResult[] = [];
    userMap.forEach((totalWagered, userName) => {
      results.push({
        userName,
        totalWagered,
        payout: 0,
        netWinLoss: -totalWagered
      });
    });

    return results.sort((a, b) => b.netWinLoss - a.netWinLoss);
  }

  // Group wagers by user
  const userWagersMap = new Map<string, {
    total: number;
    onWinning: number;
  }>();

  wagers.forEach(wager => {
    if (!userWagersMap.has(wager.userName)) {
      userWagersMap.set(wager.userName, { total: 0, onWinning: 0 });
    }

    const userWagers = userWagersMap.get(wager.userName)!;
    userWagers.total += wager.amount;

    if (wager.optionId === winningOptionId) {
      userWagers.onWinning += wager.amount;
    }
  });

  // Calculate payouts for each user
  const results: PayoutResult[] = [];

  userWagersMap.forEach(({ total, onWinning }, userName) => {
    // Calculate proportional payout
    const payout = (onWinning / winningPool) * totalPool;
    const netWinLoss = payout - total;

    results.push({
      userName,
      totalWagered: total,
      payout: Math.round(payout * 100) / 100, // Round to 2 decimal places
      netWinLoss: Math.round(netWinLoss * 100) / 100 // Round to 2 decimal places
    });
  });

  // Sort by net win/loss (winners first, then losers)
  return results.sort((a, b) => b.netWinLoss - a.netWinLoss);
}
