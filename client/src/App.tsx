import { useState, useEffect, useCallback } from 'react';
import { getParties } from './api/client';
import type { Party } from './api/types';
import { BetList } from './components/BetList';
import { SettlementDisplay } from './components/SettlementDisplay';
import { PinEntry } from './components/PinEntry';
import { CreatePartyForm } from './components/CreatePartyForm';
import { CreateBetForm } from './components/CreateBetForm';
import { useSocket } from './hooks/useSocket';
import styles from './App.module.css';

type TabView = 'open' | 'closed' | 'settled' | 'summary';

function App() {
  const [, setParties] = useState<Party[]>([]);
  const [activeParty, setActiveParty] = useState<Party | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    // Load from localStorage if available
    return localStorage.getItem('currentUser');
  });
  const [recentUserNames, setRecentUserNames] = useState<string[]>(() => {
    // Load from localStorage if available
    const stored = localStorage.getItem('recentUserNames');
    return stored ? JSON.parse(stored) : [];
  });
  const [activeTab, setActiveTab] = useState<TabView>('open');
  const [showUserInput, setShowUserInput] = useState(false);
  const [userNameInput, setUserNameInput] = useState('');

  // Host mode state
  const [isHostMode, setIsHostMode] = useState(false);
  const [hostPin, setHostPin] = useState<string | null>(null);
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [showCreateParty, setShowCreateParty] = useState(false);
  const [showCreateBet, setShowCreateBet] = useState(false);

  // Fetch parties
  const fetchParties = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getParties();
      setParties(data);

      // Set active party
      const active = data.find(p => p.status === 'active');
      setActiveParty(active || null);
    } catch (error) {
      console.error('Error fetching parties:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParties();
  }, [fetchParties]);

  // WebSocket connection for party updates
  useSocket({
    partyId: activeParty?.id,
    handlers: {
      onPartyCreated: () => {
        console.log('[App] New party created');
        fetchParties();
      }
    }
  });

  const handleUserWagerPlaced = (userName: string) => {
    // Add to recent names if not already there
    if (!recentUserNames.includes(userName)) {
      const updated = [userName, ...recentUserNames].slice(0, 10); // Keep last 10
      setRecentUserNames(updated);
      localStorage.setItem('recentUserNames', JSON.stringify(updated));
    }
  };

  const handleSetCurrentUser = () => {
    const trimmed = userNameInput.trim();
    if (trimmed) {
      setCurrentUser(trimmed);
      localStorage.setItem('currentUser', trimmed);
      setShowUserInput(false);
      setUserNameInput('');

      // Add to recent names
      handleUserWagerPlaced(trimmed);
    }
  };

  const handleClearCurrentUser = () => {
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setShowUserInput(true);
    setUserNameInput('');
  };

  // Host mode handlers
  const handleHostModeToggle = () => {
    if (isHostMode) {
      // Exit host mode
      setIsHostMode(false);
      setHostPin(null);
    } else {
      // Enter host mode - show PIN entry
      setShowPinEntry(true);
    }
  };

  const handlePinSuccess = (pin: string) => {
    setHostPin(pin);
    setIsHostMode(true);
    setShowPinEntry(false);
  };

  const handleCreatePartySuccess = (party: Party) => {
    setShowCreateParty(false);
    setActiveParty(party);
    fetchParties();
  };

  const handleCreateBetSuccess = () => {
    setShowCreateBet(false);
    // BetList will auto-refresh via WebSocket
  };

  if (loading) {
    return (
      <div className={styles.app}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!activeParty) {
    return (
      <div className={styles.app}>
        <div className={styles.header}>
          <h1 className={styles.title}>🎲 Place-A-Bet</h1>
        </div>
        <div className={styles.noParty}>
          <p>No active party found.</p>
          <p>Ask the host to create a party to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.title}>🎲 Place-A-Bet</h1>
          <button
            className={`${styles.hostButton} ${isHostMode ? styles.hostButtonActive : ''}`}
            onClick={handleHostModeToggle}
          >
            {isHostMode ? '👑 Host Mode' : '🔑 Host'}
          </button>
        </div>
        <div className={styles.partyInfo}>
          <span className={styles.partyName}>{activeParty.name}</span>
          <span className={styles.partyStats}>
            {activeParty.betCount || 0} bets · ${activeParty.totalWagered?.toFixed(0) || 0} total
          </span>
        </div>
      </div>

      {/* User Identity */}
      <div className={styles.userSection}>
        {currentUser ? (
          <div className={styles.currentUser}>
            <span>Playing as: <strong>{currentUser}</strong></span>
            <button className={styles.changeUserButton} onClick={handleClearCurrentUser}>
              Change
            </button>
          </div>
        ) : (
          <div className={styles.userPrompt}>
            {!showUserInput ? (
              <button className={styles.setUserButton} onClick={() => setShowUserInput(true)}>
                Set Your Name
              </button>
            ) : (
              <div className={styles.userInputForm}>
                <input
                  type="text"
                  value={userNameInput}
                  onChange={e => setUserNameInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSetCurrentUser()}
                  placeholder="Enter your name"
                  className={styles.userInput}
                  autoFocus
                />
                <button className={styles.confirmButton} onClick={handleSetCurrentUser}>
                  OK
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Host Actions */}
      {isHostMode && hostPin && (
        <div className={styles.hostActions}>
          <button
            className={`${styles.actionButton} ${styles.actionButtonPrimary}`}
            onClick={() => setShowCreateBet(true)}
          >
            + Create Bet
          </button>
          <button
            className={`${styles.actionButton} ${styles.actionButtonSecondary}`}
            onClick={() => setShowCreateParty(true)}
          >
            + New Party
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'open' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('open')}
        >
          Open Bets
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'closed' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('closed')}
        >
          Closed
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settled' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('settled')}
        >
          Settled
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'summary' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          Summary
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {activeTab === 'open' && (
          <BetList
            partyId={activeParty.id}
            status="open"
            currentUser={currentUser}
            recentUserNames={recentUserNames}
            onUserWagerPlaced={handleUserWagerPlaced}
            showHostActions={isHostMode}
          />
        )}

        {activeTab === 'closed' && (
          <BetList
            partyId={activeParty.id}
            status="closed"
            currentUser={currentUser}
            recentUserNames={recentUserNames}
            onUserWagerPlaced={handleUserWagerPlaced}
            showHostActions={isHostMode}
          />
        )}

        {activeTab === 'settled' && (
          <BetList
            partyId={activeParty.id}
            status="settled"
            currentUser={currentUser}
            recentUserNames={recentUserNames}
            onUserWagerPlaced={handleUserWagerPlaced}
            showHostActions={isHostMode}
          />
        )}

        {activeTab === 'summary' && (
          <SettlementDisplay partyId={activeParty.id} currentUser={currentUser} />
        )}
      </div>

      {/* Modals */}
      {showPinEntry && (
        <PinEntry
          title="Enter Host PIN"
          onSuccess={handlePinSuccess}
          onCancel={() => setShowPinEntry(false)}
        />
      )}

      {showCreateParty && hostPin && (
        <CreatePartyForm
          hostPin={hostPin}
          onSuccess={handleCreatePartySuccess}
          onCancel={() => setShowCreateParty(false)}
        />
      )}

      {showCreateBet && currentUser && (
        <CreateBetForm
          createdBy={currentUser}
          onSuccess={handleCreateBetSuccess}
          onCancel={() => setShowCreateBet(false)}
        />
      )}
    </div>
  );
}

export default App;
