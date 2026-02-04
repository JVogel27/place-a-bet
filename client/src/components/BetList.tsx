import { useState, useEffect, useCallback } from 'react';
import { getBets, createWager } from '../api/client';
import type { BetWithDetails } from '../api/types';
import { BetCard } from './BetCard';
import { WagerForm } from './WagerForm';
import { SettleBetModal } from './SettleBetModal';
import { useSocket } from '../hooks/useSocket';
import styles from './BetList.module.css';

interface BetListProps {
  partyId: number | null;
  status?: 'open' | 'closed' | 'settled';
  currentUser: string | null;
  showHostActions?: boolean;
  onUserWagerPlaced?: (userName: string) => void;
}

export function BetList({
  partyId,
  status,
  currentUser,
  showHostActions = false,
  onUserWagerPlaced
}: BetListProps) {
  const [bets, setBets] = useState<BetWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBet, setSelectedBet] = useState<BetWithDetails | null>(null);
  const [showWagerForm, setShowWagerForm] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAction, setSettleAction] = useState<'close' | 'settle'>('close');

  // Fetch bets
  const fetchBets = useCallback(async () => {
    if (!partyId) {
      setBets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getBets(status);
      setBets(data);
    } catch (err) {
      console.error('Error fetching bets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load bets');
    } finally {
      setLoading(false);
    }
  }, [partyId, status]);

  // Initial fetch
  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  // WebSocket real-time updates
  useSocket({
    partyId: partyId || undefined,
    handlers: {
      onBetCreated: (event) => {
        console.log('[BetList] New bet created:', event);
        fetchBets();
      },
      onBetUpdated: (event) => {
        console.log('[BetList] Bet updated:', event);
        fetchBets();
      },
      onWagerPlaced: (event) => {
        console.log('[BetList] Wager placed:', event);
        fetchBets();
      },
      onSettlementComplete: (event) => {
        console.log('[BetList] Settlement complete:', event);
        fetchBets();
      }
    }
  });

  const handlePlaceWager = (betId: number) => {
    const bet = bets.find(b => b.id === betId);
    if (bet) {
      setSelectedBet(bet);
      setShowWagerForm(true);
    }
  };

  const handleWagerSubmit = async (data: {
    userName: string;
    optionId: number;
    amount: number;
  }) => {
    if (!selectedBet) return;

    try {
      await createWager(selectedBet.id, data);

      // Update recent user names
      if (onUserWagerPlaced) {
        onUserWagerPlaced(data.userName);
      }

      // Close form and refresh bets
      setShowWagerForm(false);
      setSelectedBet(null);
      fetchBets();

      // Success feedback
      console.log('Wager placed successfully!');
    } catch (err) {
      // Error is handled in WagerForm component
      throw err;
    }
  };

  const handleCloseForm = () => {
    setShowWagerForm(false);
    setSelectedBet(null);
  };

  const handleCloseBet = (betId: number) => {
    const bet = bets.find(b => b.id === betId);
    if (bet) {
      setSelectedBet(bet);
      setSettleAction('close');
      setShowSettleModal(true);
    }
  };

  const handleSettleBet = (betId: number) => {
    const bet = bets.find(b => b.id === betId);
    if (bet) {
      setSelectedBet(bet);
      setSettleAction('settle');
      setShowSettleModal(true);
    }
  };

  const handleSettleSuccess = () => {
    setShowSettleModal(false);
    setSelectedBet(null);
    fetchBets();
  };

  const getEmptyMessage = () => {
    switch (status) {
      case 'open':
        return 'No open bets yet. Create one to get started!';
      case 'closed':
        return 'No closed bets waiting to be settled.';
      case 'settled':
        return 'No settled bets yet.';
      default:
        return 'No bets found.';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading bets...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={fetchBets}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (bets.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>{getEmptyMessage()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.list}>
        {bets.map(bet => (
          <BetCard
            key={bet.id}
            bet={bet}
            currentUser={currentUser}
            onPlaceWager={handlePlaceWager}
            onCloseBet={handleCloseBet}
            onSettleBet={handleSettleBet}
            showHostActions={showHostActions}
          />
        ))}
      </div>

      {showWagerForm && selectedBet && currentUser && (
        <WagerForm
          bet={selectedBet}
          currentUser={currentUser}
          onSubmit={handleWagerSubmit}
          onCancel={handleCloseForm}
        />
      )}

      {showSettleModal && selectedBet && (
        <SettleBetModal
          bet={selectedBet}
          action={settleAction}
          onSuccess={handleSettleSuccess}
          onCancel={() => setShowSettleModal(false)}
        />
      )}
    </div>
  );
}
