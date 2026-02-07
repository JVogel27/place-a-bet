# Place-A-Bet - Requirements Document

## Project Overview
A simple, fun web-based betting app for hosting parties and events. Designed to run on a Raspberry Pi 3+ and be accessible to guests on the local network.

**Target Use Case:** Super Bowl parties, game nights, and social gatherings where guests want to make friendly wagers without complicated betting terminology or rules.

## Core Philosophy
- **Simplicity First:** No complicated odds, spreads, or betting jargon
- **Social & Fun:** Easy enough for people who've never bet before
- **Real Stakes, Simple Tracking:** Track real money IOUs, but keep the UX casual and straightforward

---

## User Features

### 1. Party Management

**Parties are the top-level organization for all bets.**

**Creating a Party:**
- Host creates a new party with:
  - Party name (e.g., "Super Bowl 2026", "Game Night", "March Madness")
  - Date (defaults to today)
  - Optional description
- Only one party can be "active" at a time
- All bets are associated with the currently active party

**Party States:**
- **Active** - Current party, all new bets go here, visible to guests
- **Archived** - Past parties, view-only for history

**Party Management (Host Only):**
- View list of all parties (active + archived)
- Switch active party
- Archive a party (moves it to history, can't add new bets)
- View party summary:
  - Total bets created
  - Total money wagered
  - Participants
  - Biggest winner/loser
  - All bets within that party

**Guest View:**
- Guests see the active party name at the top of the page
- Can view archived parties to see past results
- Cannot create/manage parties

### 2. User Identity
- **No accounts or passwords required**
- Users simply enter a name/nickname when placing a bet
- Same person can re-enter their name for subsequent bets (honor system)
- App remembers names from current party session for quick selection

### 3. Host vs Guest

**Host Identification:**
- First time app is opened, prompt to set a host PIN (4 digits)
- Host features require entering this PIN
- PIN can be reset (requires access to the Pi directly)

**Host Powers:**
- Create/manage parties
- Archive parties
- Close betting on any bet
- Declare winning outcomes
- Access admin panel

**Guest Access:**
- No PIN required
- Can create bets (within active party)
- Can place wagers
- Can view all bets and results
- Cannot manage parties or force-settle bets they didn't create

### 4. Bet Creation

**All bets are created within the currently active party.**

#### Two Types of Bets:

**A. Yes/No Bets**
- Simple binary prediction (e.g., "Will there be more than 3 interceptions?")
- Anyone can create these
- Fields:
  - Bet description/question
  - Created by (name)
  - Automatically associated with active party

**B. Multi-Option Bets**
- Multiple mutually exclusive outcomes (e.g., "Which team wins the Super Bowl?")
- Anyone can create these
- Fields:
  - Bet title/question
  - List of possible outcomes (2-6 options recommended)
  - Created by (name)
  - Automatically associated with active party

### 5. Placing Wagers

**Pool-Style Wagering:**
- Each bet has a single pool that collects all wagers
- When joining a bet:
  1. Enter your name
  2. Choose your predicted outcome
  3. Enter your wager amount (USD)
  4. Confirm

**Rules:**
- Can bet on multiple different outcomes in the same bet (hedging allowed)
- Cannot change or cancel wager after placing (keeps it simple)
- Can see total pool size and how much is on each outcome
- Betting closes when creator/host marks it closed

### 6. Bet Status & Visibility

**Active Bets Page:**
- Shows all open bets in the current active party that can still be joined
- For each bet display:
  - Bet question/title
  - Total pool size
  - Number of participants
  - Breakdown of how much $ is on each outcome
  - "Place Wager" button

**Closed Bets Page:**
- Bets that are closed for new wagers but outcome not determined yet
- Shows same info as active bets but no "Place Wager" button

**Settled Bets Page:**
- Historical bets with outcomes determined for the active party
- Shows winners, losers, and payout amounts
- Can switch to view settled bets from archived parties

### 7. Settling Bets

**Bet Settlement Powers:**
- Host can close betting and declare outcome on any bet
- Bet creator can close their own bet and declare outcome
- System automatically calculates payouts

**Payout Calculation:**
- **Proportional to wager amount**
- Formula:
  ```
  Total Pool = All wagers across all outcomes
  Winner Pool = All wagers on winning outcome

  For each winner:
    Payout = (Their Wager / Winner Pool) × Total Pool
    Net Win = Payout - Their Original Wager
  ```

**Example:**
```
Bet: "Which team wins?"
- Chiefs: Alice ($10), Bob ($5) = $15 total
- Eagles: Carol ($20), Dave ($5) = $25 total
- Total Pool: $40

Chiefs win!
- Alice: ($10 / $15) × $40 = $26.67 → Net win: $16.67
- Bob: ($5 / $15) × $40 = $13.33 → Net win: $8.33
- Carol: Lost $20
- Dave: Lost $5
```

### 8. Settlement Summary
When bet is settled, show:
- Winning outcome
- List of winners with their net winnings
- List of losers with their losses
- Clear "Who owes who" breakdown (simplified debt resolution)

### 9. Debt Resolution
**Simple IOU Tracking:**
- After bet settles, show simplified payment instructions
- Minimize number of transactions (A owes B $10, B owes C $15 → A owes C $5, B owes C $5)
- Mark payments as complete (honor system)

---

## Non-Functional Requirements

### Technical
- Web-based interface (mobile-friendly, accessed via browser)
- Runs on Raspberry Pi 3+ (Debian Bookworm)
- Accessible on local network (192.168.1.x)
- Lightweight - should handle 10-20 concurrent users
- Data persistence (survive Pi reboots)

### User Experience
- Works well on phones (main device at parties)
- No login/registration friction
- Minimal clicks to place a bet
- Clear, large text and buttons
- Real-time updates (see new bets and wagers as they come in)
- Sound effects when bets are placed
- Confetti animation when you win
- Bet history across multiple parties/sessions

---

## Out of Scope (V1)
- ❌ User accounts with passwords
- ❌ Traditional betting odds/spreads
- ❌ Live betting (changing odds during event)
- ❌ Integration with real payment systems
- ❌ Betting on outcomes outside the local event
- ❌ Complex bet types (parlays, teasers, etc.)
- ❌ Mobile apps (web-only for now)
- ❌ Multi-language support

---

## Success Criteria
1. Any guest can create and understand a bet in < 30 seconds
2. Placing a wager takes < 3 taps/clicks
3. Everyone can clearly see who won and who owes whom after settling
4. App stays responsive with 15+ people using it simultaneously
5. Guests have fun and want to use it again next party!

---

## Technical Stack

### Backend
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Language:** TypeScript
- **Database:** SQLite with WAL (Write-Ahead Logging) mode for concurrent access
- **ORM:** Drizzle ORM (type-safe queries, built-in migrations)
- **Validation:** Zod (runtime validation + type inference)

### Frontend
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** CSS Modules
- **State Management:** React Context / Zustand (if needed)
- **HTTP Client:** Fetch API (native)
- **Real-time Updates:** Polling (every 2-3 seconds when on active pages)

### Deployment
- **Process Manager:** PM2
  - Auto-restart on crashes
  - Auto-start on Pi boot
  - Easy log management (`pm2 logs`)
- **Access:** Local network only (192.168.1.x)
- **Port:** 3001 (configurable via .env)

### Development
- **Monorepo Structure:**
  ```
  place-a-bet/
  ├── server/           # Express backend
  │   ├── src/
  │   ├── drizzle/      # Database migrations
  │   └── package.json
  ├── client/           # React frontend
  │   ├── src/
  │   └── package.json
  └── package.json      # Root for shared scripts
  ```
- **Dev Experience:**
  - Hot reload for both frontend and backend
  - Shared TypeScript types between client/server
  - ESLint + Prettier for code consistency

### Database Schema (High-Level)
- **parties** - Party events with name, date, status
- **bets** - Individual bets with type, question, party_id
- **bet_options** - Possible outcomes for each bet
- **wagers** - Individual wagers linking user, bet, option, amount
- **settlements** - Resolved bet outcomes and calculated payouts

### API Design
RESTful JSON API:
- `GET /api/parties` - List all parties
- `POST /api/parties` - Create party (host only)
- `GET /api/parties/:id/bets` - Get bets for a party
- `POST /api/bets` - Create a bet
- `POST /api/bets/:id/wagers` - Place a wager
- `POST /api/bets/:id/close` - Close betting (host/creator)
- `POST /api/bets/:id/settle` - Declare outcome (host/creator)
- `GET /api/bets/:id/results` - Get settlement results

### Security Considerations
- Host PIN stored as bcrypt hash
- Rate limiting on API endpoints
- Input validation with Zod on all endpoints
- SQL injection protection via Drizzle ORM
- CORS restricted to local network
- No user authentication = no password security concerns
- Amount validation to prevent negative/huge bets

---

## Testing Strategy

### Testing Approach
**Comprehensive test coverage** across all layers to ensure money calculations are accurate and the app is reliable for real-world use at parties.

### Backend Testing (Vitest + Supertest)

**Unit Tests:**
- Payout calculation logic (critical - involves real money!)
- Debt resolution algorithm (minimize transactions)
- Validation helpers and utilities
- Date/time handling functions

**Integration Tests:**
- All API endpoints with real database (SQLite in-memory for tests)
- Test scenarios:
  - Creating parties and switching active party
  - Creating bets (yes/no and multi-option)
  - Placing multiple wagers on same bet
  - Closing bets and settling outcomes
  - Calculating payouts correctly
  - Handling edge cases (ties, no wagers, single winner, etc.)
- Host PIN authentication
- Rate limiting behavior
- Input validation and error responses

**Test Database:**
- Use in-memory SQLite for speed
- Run migrations before each test suite
- Clean slate for each test

### Frontend Testing (React Testing Library + Vitest)

**Component Tests:**
- Party selector/switcher
- Bet creation forms (both types)
- Wager placement form
- Bet list displays (active/closed/settled)
- Settlement results display
- Debt resolution summary

**Integration Tests:**
- User flows with mocked API:
  - Browse bets and place a wager
  - Create a new bet
  - View settlement results
  - Host PIN entry and party management
- Polling behavior (updates appear after polling interval)
- Error handling and loading states

**What to Test:**
- User interactions (clicks, form inputs)
- Conditional rendering (show/hide based on state)
- Data formatting (currency, dates)
- Accessibility (labels, ARIA attributes)

### E2E Testing (Playwright)

**Critical User Flows:**
1. **Host Setup Flow:**
   - First-time setup: create host PIN
   - Create a new party
   - Verify party becomes active

2. **Guest Betting Flow:**
   - Guest opens app and sees active party
   - Create a new bet (multi-option)
   - Multiple guests place wagers on different outcomes
   - View bet details showing pool breakdown

3. **Settlement Flow:**
   - Host closes a bet
   - Host declares winning outcome
   - Verify payout calculations are correct
   - Verify debt resolution shows correct IOUs

4. **Multi-Party Flow:**
   - Create and settle bets in Party A
   - Archive Party A
   - Create Party B and verify it's active
   - Verify Party A bets are archived and view-only

**E2E Test Environment:**
- Run against actual built frontend + backend
- Use test SQLite database (cleared between runs)
- Test on mobile viewport (primary device)
- Test on desktop viewport (secondary)

### Test Commands
```bash
# Backend tests
npm run test:server           # Run all backend tests
npm run test:server:watch     # Watch mode for development
npm run test:server:coverage  # Generate coverage report

# Frontend tests
npm run test:client           # Run all frontend tests
npm run test:client:watch     # Watch mode for development
npm run test:client:coverage  # Generate coverage report

# E2E tests
npm run test:e2e              # Run Playwright tests headless
npm run test:e2e:ui           # Run with Playwright UI
npm run test:e2e:debug        # Debug mode with browser

# Run all tests
npm run test                  # Run all test suites
npm run test:ci               # CI mode (no watch, with coverage)
```

### Coverage Goals
- **Backend:** 80%+ coverage
  - 100% coverage on payout calculation functions
  - 100% coverage on debt resolution logic
- **Frontend:** 70%+ coverage
  - Focus on interactive components and business logic
  - Skip coverage for purely presentational components
- **E2E:** Critical user paths covered (4 main flows above)

### Pre-Deployment Testing
Before deploying to the Pi:
1. Run full test suite (`npm run test:ci`)
2. Run E2E tests in production mode build
3. Manual smoke test on actual Pi hardware
4. Test with 3-5 devices simultaneously on local network
5. Verify polling works across multiple clients

### Continuous Testing
- Run tests on every commit (pre-commit hook)
- GitHub Actions workflow (if using git) to run tests on push
- Keep tests fast (<30s for unit/integration, <2min for E2E)
