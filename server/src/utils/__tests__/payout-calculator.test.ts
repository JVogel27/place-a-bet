import { describe, it, expect } from 'vitest';
import { calculatePayouts, type UserWager } from '../payout-calculator';

describe('calculatePayouts', () => {
  describe('Basic functionality', () => {
    it('should return empty array when no wagers', () => {
      const result = calculatePayouts([], 1);
      expect(result).toEqual([]);
    });

    it('should handle single wager - winner takes all', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 }
      ];

      const result = calculatePayouts(wagers, 1);

      expect(result).toEqual([
        {
          userName: 'Alice',
          totalWagered: 10,
          payout: 10,
          netWinLoss: 0
        }
      ]);
    });

    it('should handle single wager - loser', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 }
      ];

      const result = calculatePayouts(wagers, 2);

      expect(result).toEqual([
        {
          userName: 'Alice',
          totalWagered: 10,
          payout: 0,
          netWinLoss: -10
        }
      ]);
    });
  });

  describe('Simple winner/loser scenarios', () => {
    it('should calculate payouts for simple 2-option bet with clear winner and loser', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 },
        { userName: 'Bob', optionId: 2, amount: 20 }
      ];

      const result = calculatePayouts(wagers, 1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userName: 'Alice',
        totalWagered: 10,
        payout: 30,
        netWinLoss: 20
      });
      expect(result[1]).toEqual({
        userName: 'Bob',
        totalWagered: 20,
        payout: 0,
        netWinLoss: -20
      });
    });

    it('should calculate payouts when option 2 wins', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 },
        { userName: 'Bob', optionId: 2, amount: 20 }
      ];

      const result = calculatePayouts(wagers, 2);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userName: 'Bob',
        totalWagered: 20,
        payout: 30,
        netWinLoss: 10
      });
      expect(result[1]).toEqual({
        userName: 'Alice',
        totalWagered: 10,
        payout: 0,
        netWinLoss: -10
      });
    });
  });

  describe('Multiple winners', () => {
    it('should split pot proportionally among multiple winners', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 },
        { userName: 'Bob', optionId: 1, amount: 20 },
        { userName: 'Carol', optionId: 2, amount: 30 }
      ];

      const result = calculatePayouts(wagers, 1);

      expect(result).toHaveLength(3);

      // Alice: (10/30) × 60 = 20, net = 20 - 10 = 10
      expect(result[0]).toEqual({
        userName: 'Bob',
        totalWagered: 20,
        payout: 40,
        netWinLoss: 20
      });

      // Bob: (20/30) × 60 = 40, net = 40 - 20 = 20
      expect(result[1]).toEqual({
        userName: 'Alice',
        totalWagered: 10,
        payout: 20,
        netWinLoss: 10
      });

      // Carol: 0 payout, net = -30
      expect(result[2]).toEqual({
        userName: 'Carol',
        totalWagered: 30,
        payout: 0,
        netWinLoss: -30
      });
    });

    it('should handle 3-option bet with 2 winners', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 25 },
        { userName: 'Bob', optionId: 1, amount: 25 },
        { userName: 'Carol', optionId: 2, amount: 25 },
        { userName: 'Dave', optionId: 3, amount: 25 }
      ];

      const result = calculatePayouts(wagers, 1);

      expect(result).toHaveLength(4);

      // Alice & Bob each get (25/50) × 100 = 50
      expect(result[0]).toMatchObject({
        userName: expect.stringMatching(/Alice|Bob/),
        totalWagered: 25,
        payout: 50,
        netWinLoss: 25
      });

      expect(result[1]).toMatchObject({
        userName: expect.stringMatching(/Alice|Bob/),
        totalWagered: 25,
        payout: 50,
        netWinLoss: 25
      });

      // Carol & Dave each lose 25
      expect(result[2]).toMatchObject({
        userName: expect.stringMatching(/Carol|Dave/),
        totalWagered: 25,
        payout: 0,
        netWinLoss: -25
      });
    });
  });

  describe('Hedging - same user bets on multiple options', () => {
    it('should calculate correctly when user hedges and wins', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 },
        { userName: 'Alice', optionId: 2, amount: 5 },
        { userName: 'Bob', optionId: 2, amount: 15 }
      ];

      const result = calculatePayouts(wagers, 2);

      expect(result).toHaveLength(2);

      // Alice wagered 15 total, 5 on winning option
      // Winning pool: 20 (Alice 5 + Bob 15)
      // Total pool: 30
      // Alice payout: (5/20) × 30 = 7.5
      // Alice net: 7.5 - 15 = -7.5
      expect(result[0]).toEqual({
        userName: 'Bob',
        totalWagered: 15,
        payout: 22.5,
        netWinLoss: 7.5
      });

      expect(result[1]).toEqual({
        userName: 'Alice',
        totalWagered: 15,
        payout: 7.5,
        netWinLoss: -7.5
      });
    });

    it('should calculate correctly when user hedges heavily and wins', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 30 },
        { userName: 'Alice', optionId: 2, amount: 10 },
        { userName: 'Bob', optionId: 2, amount: 10 }
      ];

      const result = calculatePayouts(wagers, 2);

      // Alice total: 40
      // Alice on winning: 10
      // Bob total: 10
      // Bob on winning: 10
      // Winning pool: 20
      // Total pool: 50

      // Alice payout: (10/20) × 50 = 25
      // Alice net: 25 - 40 = -15
      expect(result[0]).toEqual({
        userName: 'Bob',
        totalWagered: 10,
        payout: 25,
        netWinLoss: 15
      });

      expect(result[1]).toEqual({
        userName: 'Alice',
        totalWagered: 40,
        payout: 25,
        netWinLoss: -15
      });
    });

    it('should handle user betting on all options', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 },
        { userName: 'Alice', optionId: 2, amount: 10 },
        { userName: 'Alice', optionId: 3, amount: 10 },
        { userName: 'Bob', optionId: 1, amount: 30 }
      ];

      const result = calculatePayouts(wagers, 1);

      // Alice total: 30, on winning: 10
      // Bob total: 30, on winning: 30
      // Winning pool: 40
      // Total pool: 60

      // Alice payout: (10/40) × 60 = 15
      // Alice net: 15 - 30 = -15
      expect(result[0]).toEqual({
        userName: 'Bob',
        totalWagered: 30,
        payout: 45,
        netWinLoss: 15
      });

      expect(result[1]).toEqual({
        userName: 'Alice',
        totalWagered: 30,
        payout: 15,
        netWinLoss: -15
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle all users betting on same winning option - everyone gets money back', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 },
        { userName: 'Bob', optionId: 1, amount: 20 },
        { userName: 'Carol', optionId: 1, amount: 30 }
      ];

      const result = calculatePayouts(wagers, 1);

      expect(result).toHaveLength(3);

      // Total pool: 60, winning pool: 60
      // Alice: (10/60) × 60 = 10, net = 0
      // Bob: (20/60) × 60 = 20, net = 0
      // Carol: (30/60) × 60 = 30, net = 0
      expect(result[0]).toEqual({
        userName: 'Alice',
        totalWagered: 10,
        payout: 10,
        netWinLoss: 0
      });

      expect(result[1]).toEqual({
        userName: 'Bob',
        totalWagered: 20,
        payout: 20,
        netWinLoss: 0
      });

      expect(result[2]).toEqual({
        userName: 'Carol',
        totalWagered: 30,
        payout: 30,
        netWinLoss: 0
      });
    });

    it('should handle no one betting on winning option - everyone loses', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 },
        { userName: 'Bob', optionId: 2, amount: 20 }
      ];

      const result = calculatePayouts(wagers, 3);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userName: 'Alice',
        totalWagered: 10,
        payout: 0,
        netWinLoss: -10
      });

      expect(result[1]).toEqual({
        userName: 'Bob',
        totalWagered: 20,
        payout: 0,
        netWinLoss: -20
      });
    });

    it('should handle decimal amounts correctly', () => {
      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 33.33 },
        { userName: 'Bob', optionId: 1, amount: 33.33 },
        { userName: 'Carol', optionId: 2, amount: 33.34 }
      ];

      const result = calculatePayouts(wagers, 1);

      // Total pool: 100, winning pool: 66.66
      // Alice: (33.33/66.66) × 100 = 50
      // Bob: (33.33/66.66) × 100 = 50
      expect(result[0]).toMatchObject({
        userName: expect.stringMatching(/Alice|Bob/),
        totalWagered: 33.33,
        payout: 50,
        netWinLoss: 16.67
      });

      expect(result[1]).toMatchObject({
        userName: expect.stringMatching(/Alice|Bob/),
        totalWagered: 33.33,
        payout: 50,
        netWinLoss: 16.67
      });

      expect(result[2]).toEqual({
        userName: 'Carol',
        totalWagered: 33.34,
        payout: 0,
        netWinLoss: -33.34
      });
    });
  });

  describe('Sorting', () => {
    it('should sort results with winners first, losers last', () => {
      const wagers: UserWager[] = [
        { userName: 'Winner1', optionId: 1, amount: 10 },
        { userName: 'Winner2', optionId: 1, amount: 20 },
        { userName: 'Loser1', optionId: 2, amount: 30 },
        { userName: 'Loser2', optionId: 2, amount: 40 }
      ];

      const result = calculatePayouts(wagers, 1);

      expect(result).toHaveLength(4);
      // First two should be winners (positive net)
      expect(result[0].netWinLoss).toBeGreaterThan(0);
      expect(result[1].netWinLoss).toBeGreaterThan(0);
      // Last two should be losers (negative net)
      expect(result[2].netWinLoss).toBeLessThan(0);
      expect(result[3].netWinLoss).toBeLessThan(0);

      // Winners should be sorted by net win (highest first)
      expect(result[0].netWinLoss).toBeGreaterThanOrEqual(result[1].netWinLoss);
      // Losers should be sorted by net loss (smallest loss first)
      expect(result[2].netWinLoss).toBeGreaterThanOrEqual(result[3].netWinLoss);
    });
  });

  describe('Real-world example from ARCHITECTURE.md', () => {
    it('should match the example calculation', () => {
      // Example from docs:
      // Bet: "Which team wins?"
      // - Alice: $10 on Chiefs, $5 on Eagles (total wagered: $15)
      // - Bob: $20 on Chiefs
      // - Carol: $15 on Eagles
      //
      // Total pool: $50
      // Chiefs pool: $30 (Alice $10 + Bob $20)
      // Eagles pool: $20 (Alice $5 + Carol $15)
      //
      // Chiefs win:
      // - Alice: payout = ($10/$30) × $50 = $16.67, net = $16.67 - $15 = +$1.67
      // - Bob: payout = ($20/$30) × $50 = $33.33, net = $33.33 - $20 = +$13.33
      // - Carol: payout = $0, net = $0 - $15 = -$15.00

      const wagers: UserWager[] = [
        { userName: 'Alice', optionId: 1, amount: 10 }, // Chiefs
        { userName: 'Alice', optionId: 2, amount: 5 },  // Eagles
        { userName: 'Bob', optionId: 1, amount: 20 },   // Chiefs
        { userName: 'Carol', optionId: 2, amount: 15 }  // Eagles
      ];

      const result = calculatePayouts(wagers, 1); // Chiefs win

      expect(result).toHaveLength(3);

      // Bob has highest net win
      expect(result[0]).toEqual({
        userName: 'Bob',
        totalWagered: 20,
        payout: 33.33,
        netWinLoss: 13.33
      });

      // Alice has small net win
      expect(result[1]).toEqual({
        userName: 'Alice',
        totalWagered: 15,
        payout: 16.67,
        netWinLoss: 1.67
      });

      // Carol loses
      expect(result[2]).toEqual({
        userName: 'Carol',
        totalWagered: 15,
        payout: 0,
        netWinLoss: -15
      });
    });
  });
});
