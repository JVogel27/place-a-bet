# Place-A-Bet - Technical Architecture

## Overview
This document outlines the technical architecture decisions and implementation details for Place-A-Bet based on product requirements and clarifications.

---

## Architecture Decisions

### 1. Real-time Communication: WebSockets (Socket.IO)

**Decision**: Use Socket.IO for real-time updates instead of polling.

**Rationale**:
- More efficient for 15-20 concurrent users at a party
- Automatic reconnection handling (critical for mobile devices that sleep/wake)
- Fallback to polling if WebSocket connection fails
- Better user experience with instant updates

**Implementation Notes**:
- Server broadcasts events: `bet:created`, `wager:placed`, `bet:closed`, `bet:settled`
- Clients subscribe to party-specific rooms for targeted updates
- Reconnection logic handles mobile device sleep/wake cycles

**Dependencies**:
- Add `socket.io` (server)
- Add `socket.io-client` (client)

---

### 2. Settlement System: Single Calculation Storage

**Decision**: Store calculated payouts in a `settlements` table when bet is settled.

**Database Schema**:
```typescript
settlements {
  id: integer (primary key)
  betId: integer (foreign key to bets)
  userName: text (guest name)
  totalWagered: real (total amount user bet on all options)
  payout: real (amount won, 0 if lost)
  netWinLoss: real (payout - totalWagered, negative if lost)
  createdAt: timestamp
}
```

**Rationale**:
- Calculate payouts once when host settles bet
- Avoid recalculation every time results are viewed
- Provides permanent audit trail
- Simplifies queries for user net winnings/losses

**Payout Calculation Formula**:
```javascript
// For each unique user in the bet:
const totalWagered = sum(user's wagers across all options)
const wagerOnWinningOption = sum(user's wagers on winning option only)
const totalPoolSize = sum(all wagers from all users)
const winningPoolSize = sum(all wagers on winning option)

const payout = (wagerOnWinningOption / winningPoolSize) × totalPoolSize
const netWinLoss = payout - totalWagered

// Store in settlements table
```

**Example**:
```
Bet: "Which team wins?"
- Alice: $10 on Chiefs, $5 on Eagles (total wagered: $15)
- Bob: $20 on Chiefs
- Carol: $15 on Eagles

Total pool: $50
Chiefs pool: $30 (Alice $10 + Bob $20)
Eagles pool: $20 (Alice $5 + Carol $15)

Chiefs win:
- Alice: payout = ($10/$30) × $50 = $16.67, net = $16.67 - $15 = +$1.67
- Bob: payout = ($20/$30) × $50 = $33.33, net = $33.33 - $20 = +$13.33
- Carol: payout = $0, net = $0 - $15 = -$15.00
```

---

### 3. House Bank Model: Net Settlement

**Decision**: App tracks IOUs with the house, users settle net amounts at end of party.

**User Flow**:
1. **Betting Phase**: Users place bets in app, no immediate payment required
2. **Settlement Phase**: When host settles a bet, payouts are calculated and stored
3. **End of Party**: App shows net totals per user across all bets:
   - "You owe the house $45" (if net negative)
   - "The house owes you $60" (if net positive)

**Implementation**:
- Query `settlements` table to calculate net winnings per user per party
- Display "Settlement Summary" page showing:
  - List of all users with net amounts
  - Who owes the house (negative net)
  - Who the house owes (positive net)

**API Endpoint**:
```
GET /api/parties/:partyId/settlement-summary
Response: {
  users: [
    { userName: "Alice", netAmount: 25.50 },
    { userName: "Bob", netAmount: -15.00 },
    { userName: "Carol", netAmount: -10.50 }
  ]
}
```

---

### 4. Host Authentication: Environment Variable PIN

**Decision**: Store host PIN in `.env` file, not in database.

**Configuration**:
```env
HOST_PIN=1234  # 4-digit PIN
```

**Rationale**:
- Simpler implementation (no bcrypt hashing, no database storage)
- Easy to change (edit `.env` and restart app)
- Suitable for local network party app (not high-security application)
- Host has physical access to Pi, can change PIN easily

**Implementation Notes**:
- Validate PIN length (exactly 4 digits) on app startup
- Compare user-entered PIN directly with `process.env.HOST_PIN`
- No password hashing needed for this use case
- API endpoints check PIN for host-only actions

**Removed from Schema**: `hostSettings` table is no longer needed.

---

### 5. User Experience: Full Transparency

**Decision**: All bets and wagers are publicly visible in real-time.

**What Users Can See**:
- **Active Bets**:
  - All open bets with question and options
  - Individual wagers: "Alice bet $10 on Chiefs"
  - Pool totals per option: "Chiefs: $30 total (3 bets)"
  - Who created the bet

- **Settled Bets**:
  - All settled bets with winning outcome
  - Each user's payouts and net win/loss
  - Full transparency on who won/lost what

**Rationale**:
- Adds to social and fun aspect of party betting
- Encourages friendly competition and banter
- No privacy concerns in a party setting
- Simpler UI (no "hide until closed" logic)

---

### 6. Hedging: Multiple Bets Per User Per Question

**Decision**: Allow users to bet on multiple outcomes in the same bet.

**Example**:
```
Bet: "Which team wins?"
- Alice can bet: $10 on Chiefs AND $5 on Eagles
```

**Rationale**:
- Adds strategic element (hedge against losses)
- Allows users to change opinion without canceling original bet
- Math works correctly (each wager treated independently)

**Implementation Notes**:
- No unique constraint on `(betId, userName)` in wagers table
- UI shows all user's wagers on a bet: "Your bets: $10 on Chiefs, $5 on Eagles"
- Settlement calculation sums all user's wagers for `totalWagered`

---

### 7. Sound Effects & Confetti

**Sound Effect**:
- **Trigger**: When user successfully places a wager
- **Sound**: Cash register "ca-ching" sound
- **Implementation**: Play audio on client after successful `POST /api/bets/:id/wagers` response

**Confetti Animation**:
- **Trigger**: When user views "Settled Bets" page and has winning bets
- **Library**: Use `canvas-confetti` npm package
- **Logic**:
  - Check if user has any settlements with `netWinLoss > 0`
  - Show confetti animation on page load
  - Optional: Mark as "seen" to avoid showing confetti every time

**Dependencies**:
- Add `canvas-confetti` to client package
- Include cash register audio file in `client/public/sounds/`

---

### 8. Currency: Whole Dollars Only

**Decision**: All bet amounts must be whole dollar amounts (no cents).

**Implementation**:
- Frontend validation: Only allow integer input for wager amounts
- Backend validation: Reject wagers with decimal values
- Display: Always show as `$10`, `$25`, etc. (no `$10.00`)

**Data Type**: Use `real` (floating point) in SQLite, but enforce integer values via validation.

**Zod Validation Schema**:
```typescript
const wagerAmountSchema = z.number()
  .int("Amount must be whole dollars")
  .positive("Amount must be greater than 0")
  .max(10000, "Amount cannot exceed $10,000");
```

---

### 9. Production Deployment: Single Server

**Decision**: Express serves built React files as static assets.

**Build Process**:
1. Build React app: `npm run build:client` → outputs to `client/dist/`
2. Build Express server: `npm run build:server` → outputs to `server/dist/`
3. Copy client build to server: `cp -r client/dist server/dist/public`
4. Express serves static files from `dist/public/`

**Express Configuration** (production):
```javascript
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}
```

**PM2 Startup**:
```bash
pm2 start server/dist/index.js --name place-a-bet
pm2 save
pm2 startup
```

**Reference**: See `pick-a-date` project for similar production setup pattern.

---

## Database Schema Summary

### Tables

1. **parties**
   - id, name, date, description, status (active/archived), createdAt, updatedAt

2. **bets**
   - id, partyId, type (yes_no/multi_option), question, createdBy, status (open/closed/settled), winningOptionId, createdAt, updatedAt

3. **bet_options**
   - id, betId, label, createdAt

4. **wagers**
   - id, betId, optionId, userName, amount (whole dollars), createdAt

5. **settlements** *(new)*
   - id, betId, userName, totalWagered, payout, netWinLoss, createdAt

### Removed
- **hostSettings** table (replaced with `HOST_PIN` environment variable)

---

## API Design

### Core Endpoints

#### Parties
- `GET /api/parties` - List all parties
- `POST /api/parties` - Create party (host only, requires PIN)
- `PATCH /api/parties/:id/status` - Archive party (host only)
- `GET /api/parties/:id/settlement-summary` - Get net amounts per user

#### Bets
- `GET /api/bets` - List bets for active party
- `GET /api/bets/:id` - Get bet details with all wagers
- `POST /api/bets` - Create bet (anyone)
- `POST /api/bets/:id/close` - Close betting (host or creator)
- `POST /api/bets/:id/settle` - Declare winner and calculate payouts (host or creator)

#### Wagers
- `POST /api/bets/:id/wagers` - Place wager (anyone)
- `GET /api/users/:userName/wagers` - Get user's wagers for active party

#### Host
- `POST /api/host/verify-pin` - Verify host PIN

### WebSocket Events

**Server → Client**:
- `party:created` - New party created
- `party:updated` - Party status changed
- `bet:created` - New bet created
- `bet:updated` - Bet status changed (closed/settled)
- `wager:placed` - New wager placed
- `settlement:complete` - Bet settled, payouts calculated

**Client → Server**:
- `join:party` - Subscribe to party-specific updates

---

## Technology Stack Updates

### Backend Additions
- **Socket.IO** (`socket.io`) - WebSocket server

### Frontend Additions
- **Socket.IO Client** (`socket.io-client`) - WebSocket client
- **Canvas Confetti** (`canvas-confetti`) - Confetti animations

### Removed
- **bcrypt** - No longer needed (PIN in environment variable)

---

## Testing Strategy Updates

### Backend Tests
- Payout calculation unit tests (100% coverage required)
- Settlement creation integration tests
- WebSocket event emission tests
- PIN authentication tests (environment variable validation)

### Frontend Tests
- WebSocket connection and reconnection handling
- Confetti trigger logic
- Sound effect playback
- Whole dollar validation on wager input

### E2E Tests
- Place wagers, close bet, settle bet, verify payouts
- Test WebSocket real-time updates across multiple clients
- Verify confetti shows for winners
- Test hedging (multiple bets on same question)

---

## Security Considerations

### Host PIN
- Validate 4-digit format on startup
- Rate limit PIN verification endpoint (3 attempts per 15 minutes)
- Log failed PIN attempts

### Input Validation
- All amounts validated as positive whole numbers
- User names sanitized (no SQL injection via Drizzle ORM)
- Bet questions limited to 500 characters

### WebSocket Security
- Origin validation for WebSocket connections
- Rate limiting on event emissions
- Validate all incoming data with Zod schemas

### CORS
- Development: `*` (allow all)
- Production: Restrict to local network CIDR (e.g., `192.168.1.0/24`)

---

## Development Workflow

### Setup Steps
1. Copy `.env.example` to `.env`
2. Set `HOST_PIN` in `.env`
3. Generate migrations: `npm run db:generate --workspace=server`
4. Run migrations: `npm run db:migrate --workspace=server`
5. Start dev servers: `npm run dev`

### Pre-Production Checklist
1. Run full test suite: `npm run test:ci`
2. Run E2E tests: `npm run test:e2e`
3. Build production bundle: `npm run build`
4. Test on actual Raspberry Pi with multiple devices
5. Verify WebSocket connections work on local network
6. Test sound and confetti on mobile devices

---

## Future Considerations

### Potential Enhancements (Out of Scope for V1)
- User accounts with password protection
- Push notifications for bet settlements
- Historical statistics (biggest wins, most bets placed)
- Party templates (pre-configured bets for common events)
- QR code for easy party joining
- Dark mode theme
- Multiple simultaneous active parties

### Scalability
- Current design targets 15-20 users on a Raspberry Pi 3+
- SQLite with WAL mode handles concurrent reads/writes well
- For larger events (50+ users), consider:
  - Upgrading to Raspberry Pi 4/5
  - PostgreSQL instead of SQLite
  - Redis for WebSocket pub/sub
  - Load balancing with multiple Pi devices

---

**Document Version**: 1.0
**Last Updated**: 2026-02-03
**Status**: Architecture finalized, ready for implementation
