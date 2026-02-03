# 🎲 Place-A-Bet

A simple, fun web-based betting app for parties and events. Designed to run on a Raspberry Pi 3+ and be accessible to guests on the local network.

## Prerequisites

- **Node.js v20.x LTS** (required for better-sqlite3 compatibility)
- npm v9.0.0+

⚠️ **Important**: This project requires Node v20 LTS. Node v25 is not yet supported by `better-sqlite3`.

## Setup

### 1. Switch to Node v20 (if using nvm)

```bash
nvm install 20
nvm use 20
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for all workspaces (root, server, client, e2e).

### 3. Setup Environment Variables

```bash
cp .env.example .env
```

Edit `.env` if you need to change default values.

### 4. Generate Database Migrations

```bash
cd server
npm run db:generate
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

## Development

### Start Both Server and Client

```bash
npm run dev
```

This starts:
- Backend server on http://localhost:3000
- Frontend dev server on http://localhost:5173

### Start Individually

```bash
# Server only
npm run dev:server

# Client only
npm run dev:client
```

## Testing

### Run All Tests

```bash
npm run test
```

### Run Specific Test Suites

```bash
# Backend tests
npm run test:server
npm run test:server:watch    # Watch mode
npm run test:server:coverage # With coverage

# Frontend tests
npm run test:client
npm run test:client:watch    # Watch mode
npm run test:client:coverage # With coverage

# E2E tests
npm run test:e2e
npm run test:e2e:ui         # With Playwright UI
npm run test:e2e:debug      # Debug mode
```

### CI Mode (All Tests + Coverage)

```bash
npm run test:ci
```

## Building

```bash
npm run build
```

Builds both server and client for production.

## Project Structure

```
place-a-bet/
├── server/           # Express backend
│   ├── src/
│   │   ├── db/      # Database schema & migrations
│   │   ├── __tests__/ # Backend tests
│   │   └── index.ts
│   └── drizzle/     # Generated migrations
├── client/          # React frontend
│   └── src/
├── e2e/             # Playwright E2E tests
└── package.json     # Root workspace config
```

## Database

The app uses SQLite with WAL (Write-Ahead Logging) mode for better concurrent access. The database file is stored at `./data/place-a-bet.db` by default.

### Database Commands

```bash
# Generate migration after schema changes
npm run db:generate --workspace=server

# Run migrations
npm run db:migrate --workspace=server

# Open Drizzle Studio (database GUI)
npm run db:studio --workspace=server
```

## Deployment to Raspberry Pi

### Using PM2 (Recommended)

1. Install PM2 globally on the Pi:
```bash
npm install -g pm2
```

2. Build the project:
```bash
npm run build
```

3. Start with PM2:
```bash
pm2 start server/dist/index.js --name place-a-bet
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

4. Manage the app:
```bash
pm2 status
pm2 logs place-a-bet
pm2 restart place-a-bet
pm2 stop place-a-bet
```

## Troubleshooting

### "better-sqlite3" Build Errors

If you encounter build errors with `better-sqlite3`:
1. Make sure you're using Node v20 LTS (not v22, v25, etc.)
2. Clean and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

### Port Already in Use

If port 3000 or 5173 is already in use:
- Change `PORT` in `.env`
- Or kill the process using the port

## Tech Stack

- **Backend**: Node.js, Express, TypeScript, SQLite, Drizzle ORM
- **Frontend**: React 18, Vite, TypeScript, CSS Modules
- **Testing**: Vitest, React Testing Library, Supertest, Playwright
- **Process Manager**: PM2

## Documentation

See `REQUIREMENTS.md` for detailed feature specifications and technical requirements.

## License

Private - For personal use only
