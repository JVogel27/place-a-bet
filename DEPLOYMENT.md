# Place-A-Bet - Deployment Guide

This guide provides step-by-step instructions for deploying Place-A-Bet to a Raspberry Pi for production use.

**Deployment Strategy**: Build on your Mac (fast), transfer to Raspberry Pi (simple).

---

## Quick Overview

The deployment process is split into two parts:

1. **Build on your Mac** (Steps 1-3)
   - Install dependencies
   - Generate database migrations
   - Build production bundle
   - Transfer files to Pi

2. **Deploy on Raspberry Pi** (Steps 4-14)
   - Setup Raspberry Pi OS and Node.js
   - Install production dependencies
   - Configure environment
   - Run migrations
   - Start application with PM2

**Benefits of this approach**:
- ✅ Much faster builds (Mac is faster than Pi)
- ✅ Simpler Pi setup (no build tools needed)
- ✅ Smaller installation on Pi
- ✅ Same workflow for updates

---

## Prerequisites

### Development Machine (Mac)
- **Node.js v18+** (for building the application)
- **npm v9+**
- **SSH access** to Raspberry Pi (optional but recommended)

### Raspberry Pi Requirements
- **Raspberry Pi 3+ or newer** (Pi 4/5 recommended for better performance)
- **MicroSD card** (16GB or larger)
- **Power supply** for Raspberry Pi
- **Network connection** (Ethernet or WiFi)
- **Raspberry Pi OS** (Bullseye or newer)
- **Node.js v20 LTS** (runtime only - no build tools needed)

---

## Part 1: Build on Your Mac

### Step 1: Install Dependencies

```bash
# Navigate to your project directory
cd /Users/jesse/code/pi-projects/place-a-bet

# Install all dependencies (including dev dependencies for building)
npm install
```

### Step 2: Generate Database Migrations

```bash
# Generate migrations from your database schema
npm run db:generate --workspace=server
```

This creates migration files in `server/drizzle/` based on your schema.

### Step 3: Build for Production

```bash
# Build the entire application for production
npm run build:prod
```

This command:
1. Builds the React frontend → `client/dist/`
2. Compiles TypeScript server → `server/dist/`
3. Compiles migration script → `server/dist/db/migrate.js`
4. Copies client build to `server/dist/public/`

**Verify the build**:
```bash
ls -la server/dist/public/        # Should see index.html, assets/, etc.
ls -la server/dist/index.js       # Server entry point
ls -la server/dist/db/migrate.js  # Migration script for production
```

---

## Part 2: Transfer Built Application to Raspberry Pi

### Step 7: Transfer Files Using rsync

**From your Mac**, transfer the built application to your Raspberry Pi:

```bash
# Replace <pi-ip> with your Pi's IP address (find it with: hostname -I on the Pi)
# Replace <pi-user> with your Pi username (usually 'pi' or 'jesse')
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'client/node_modules' \
  --exclude 'server/node_modules' \
  --exclude 'client/dist' \
  --exclude 'drizzle.backup' \
  --exclude '*.md' \
  --exclude 'setup.sh' \
  --exclude 'e2e' \
  /Users/jesse/code/pi-projects/place-a-bet/ \
  pi@<ip>:~/code/place-a-bet/
```

**What gets transferred**:
- ✅ `server/dist/` - Compiled server code
- ✅ `server/dist/public/` - Built React frontend
- ✅ `server/drizzle/` - Database migrations
- ✅ `server/package.json` - Production dependencies list
- ✅ `package.json` - Root package.json
- ✅ `.env` files (if you have them)
- ✅ All source code (for reference)
- ❌ `node_modules` - Will install on Pi
- ❌ `client/dist` - Already copied to `server/dist/public/`

---

## Part 3: Setup and Run on Raspberry Pi

### Step 8: Install Dependencies

**On the Raspberry Pi**, install the dependencies needed to run the app:

```bash
# SSH into your Pi (replace with your username and IP)
ssh pi@<pi-ip>

# Navigate to project directory
cd ~/code/place-a-bet

# Ensure Node.js v20 is active
nvm use 20

# Install production dependencies
npm install --omit=dev
```

**What gets installed**:
- Runtime dependencies: express, socket.io, drizzle-orm, better-sqlite3, etc.
- Skips dev dependencies: typescript, vite, tsx, etc. (already used during build)

**Note**: If you get module not found errors, run `npm install` (without --omit=dev) to install all dependencies.

### Step 9: Configure Environment Variables

```bash
# On the Raspberry Pi
cd ~/code/place-a-bet

# Copy the example .env file
cp .env.example .env

# Edit the .env file
nano .env
```

Set these production values:
```env
# Server Configuration
PORT=3001
NODE_ENV=production

# Database (optional - defaults to server/data/place-a-bet.db)
# Only set this if you want to use a custom location
# DATABASE_URL=/custom/path/to/database.db

# CORS Configuration
CORS_ORIGIN=*

# Host Authentication (CHANGE THIS!)
HOST_PIN=1234
```

**Important**:
- Change the `HOST_PIN` to a secure 4-digit number!
- `DATABASE_URL` is optional - it defaults to `server/data/place-a-bet.db`
- The `.env` file must be in the **root directory** (`~/code/place-a-bet/`), not in `server/`

### Step 10: Run Database Migrations

```bash
# On the Raspberry Pi
cd ~/code/place-a-bet

# Run migrations to create database tables (uses compiled migration script)
npm run db:migrate:prod --workspace=server
```

**What this does**:
- Automatically creates the `server/data/` directory if it doesn't exist
- Runs the compiled migration script (`server/dist/db/migrate.js`)
- Creates the SQLite database at `server/data/place-a-bet.db`
- Sets up all database tables

**Expected output**:
```
Database path: /home/jesse/code/place-a-bet/server/dist/../../data/place-a-bet.db
Migrations folder: /home/jesse/code/place-a-bet/server/dist/../../drizzle
Created database directory: /home/jesse/code/place-a-bet/server/data
Running migrations...
✅ Migrations completed successfully!
```

---

## Part 4: Start the Application

### Step 11: Install and Configure PM2

PM2 is a process manager that keeps your app running and restarts it on crashes or reboots.

```bash
# On the Raspberry Pi
# Install PM2 globally (if not already installed)
npm install -g pm2

# Check for any existing place-a-bet processes
pm2 status

# If you see duplicate "place-a-bet" processes, delete them:
# pm2 delete <id>  # Replace <id> with the process ID from pm2 status

# Start the app
cd ~/code/place-a-bet
pm2 start npm --name "place-a-bet" -- run start:prod

# View logs (watch for startup messages)
pm2 logs place-a-bet --lines 30

# Should see:
# 🎲 Place-A-Bet server running on http://localhost:3001
# 🔌 WebSocket server ready

# Check status
pm2 status
```

**Troubleshooting**: If the app keeps restarting:
- Check logs: `pm2 logs place-a-bet --lines 50`
- Make sure migrations ran successfully
- Verify `server/data/place-a-bet.db` exists
- Check that all dependencies are installed

### Step 12: Configure Auto-Start on Boot

```bash
# On the Raspberry Pi
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions shown (you'll need to run a command with sudo)
# It will look something like:
# sudo env PATH=$PATH:/home/pi/.nvm/versions/node/v20.x.x/bin pm2 startup systemd -u pi --hp /home/pi
```

---

## Part 5: Access and Test

### Step 13: Access the Application

**Find your Pi's IP address**:
```bash
# On the Raspberry Pi
hostname -I
# Example output: 192.168.1.100
```

**Access from any browser** on the same network:
```
http://<pi-ip-address>:3001
```

Example: `http://192.168.1.100:3001`

### Step 14: Test the Application

1. Open the URL in your browser
2. You should see the Place-A-Bet interface
3. Enter host mode (default PIN: 1234 unless you changed it)
4. Create a test party
5. Create a test bet
6. Place a wager from another device
7. Verify real-time updates work

---

## Part 6: Optional Configuration

### Optional - Use Port 80 (No Port Number in URL)

If you want to access the app as `http://<pi-ip>` instead of `http://<pi-ip>:3001`:

### Option A: Port Forwarding with iptables
```bash
# Redirect port 80 to 3001
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3001

# Make it persistent across reboots
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

### Option B: Change PORT in .env
```bash
# Edit .env
nano .env

# Change PORT to 80
PORT=80

# Restart app with PM2
pm2 restart place-a-bet
```

**Note**: Running on port 80 requires root privileges. Option A (port forwarding) is recommended.

---

## Part 7: Managing and Updating

### PM2 Commands

**On the Raspberry Pi**:
```bash
# View logs
pm2 logs place-a-bet

# Restart app
pm2 restart place-a-bet

# Stop app
pm2 stop place-a-bet

# Start app
pm2 start place-a-bet

# Remove from PM2
pm2 delete place-a-bet

# View status
pm2 status

# Monitor CPU/memory
pm2 monit
```

### Updating the Application

When you make changes to your code, **rebuild on your Mac** and transfer the new build to the Pi:

#### On Your Mac:

```bash
# Navigate to project directory
cd /Users/jesse/code/pi-projects/place-a-bet

# Pull latest changes (if using git)
git pull

# Install new dependencies (if package.json changed)
npm install

# Regenerate migrations (if schema changed)
npm run db:generate --workspace=server

# Rebuild for production
npm run build:prod

# Transfer to Raspberry Pi (replace <pi-user> and <pi-ip>)
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude '.git' \
  --exclude 'client/node_modules' \
  --exclude 'server/node_modules' \
  --exclude 'client/dist' \
  --exclude 'drizzle.backup' \
  /Users/jesse/code/pi-projects/place-a-bet/ \
  <pi-user>@<pi-ip>:~/code/place-a-bet/
```

#### On the Raspberry Pi:

```bash
# SSH into Pi (replace with your username and IP)
ssh jesse@<pi-ip>

# Navigate to project
cd ~/code/place-a-bet

# Install new dependencies (if package.json changed)
npm install --omit=dev

# Run new migrations (if schema changed)
npm run db:migrate:prod --workspace=server

# Restart with PM2
pm2 restart place-a-bet

# Check logs to verify
pm2 logs place-a-bet
```

### Database Backup
```bash
# Backup database
cp server/data/place-a-bet.db server/data/place-a-bet.db.backup

# Restore from backup
cp server/data/place-a-bet.db.backup server/data/place-a-bet.db
pm2 restart place-a-bet
```

---

## Troubleshooting

### Application Won't Start
```bash
# Check PM2 logs
pm2 logs place-a-bet

# Check if port 3001 is already in use
sudo lsof -i :3001

# Verify Node.js version
node --version  # Should be v20.x.x

# Verify build exists
ls -la server/dist/index.js
ls -la server/dist/public/index.html
ls -la server/dist/public/assets/*.mp3  # Verify audio file included
```

### Can't Connect from Other Devices
```bash
# Check if server is running
pm2 status

# Check firewall (if enabled)
sudo ufw status
sudo ufw allow 3001

# Verify Pi's IP address
hostname -I

# Test from Pi itself
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}
```

### Database Issues
```bash
# Check database file exists
ls -la server/data/place-a-bet.db

# Check database permissions
chmod 644 server/data/place-a-bet.db
chmod 755 server/data/

# Re-run migrations
npm run db:migrate --workspace=server
pm2 restart place-a-bet
```

### WebSocket Connection Issues
- Make sure `CORS_ORIGIN` in `.env` is set to `*` or includes the client's origin
- Check browser console for WebSocket connection errors
- Verify Socket.IO is working: Check server logs for "WebSocket server ready"

### Sound/Confetti Not Working
- Sound effects require user interaction (browser security)
- Test on actual mobile devices (iOS Safari, Chrome Android)
- Check browser console for errors
- Verify `client/dist/public/` contains all built assets

---

## Performance Monitoring

### Monitor Resource Usage
```bash
# PM2 monitoring
pm2 monit

# System resources
htop  # Install with: sudo apt install htop

# Check disk space
df -h
```

### Expected Resource Usage
- **RAM**: 150-300 MB (depends on active users)
- **CPU**: <10% idle, 20-40% during active betting
- **Disk**: ~100 MB for app + database (includes 56KB cash register sound effect)

### Recommended Limits
- **Concurrent users**: 15-20 on Raspberry Pi 3+
- **Concurrent users**: 30-50 on Raspberry Pi 4/5
- **Active bets**: No hard limit (database handles it well)

---

## Security Considerations

### Change Default PIN
```bash
# Edit .env
nano .env

# Change HOST_PIN to a unique 4-digit number
HOST_PIN=9876

# Restart app
pm2 restart place-a-bet
```

### Network Security
- App is designed for **local network use only** (parties/events)
- Do **NOT** expose to the public internet without proper security measures
- If you must expose externally:
  - Set up HTTPS with Let's Encrypt
  - Use a reverse proxy (nginx)
  - Implement proper authentication

### Regular Backups
```bash
# Create a backup script
nano ~/backup-place-a-bet.sh
```

```bash
#!/bin/bash
# Backup script
BACKUP_DIR=~/place-a-bet-backups
mkdir -p $BACKUP_DIR
DATE=$(date +%Y%m%d_%H%M%S)
cp ~/place-a-bet/server/data/place-a-bet.db $BACKUP_DIR/place-a-bet_$DATE.db
echo "Backup created: $BACKUP_DIR/place-a-bet_$DATE.db"

# Keep only last 7 backups
cd $BACKUP_DIR
ls -t | tail -n +8 | xargs rm -f
```

```bash
# Make executable
chmod +x ~/backup-place-a-bet.sh

# Run manually
~/backup-place-a-bet.sh

# Or schedule with cron (daily at 3 AM)
crontab -e
# Add line: 0 3 * * * /home/pi/backup-place-a-bet.sh
```

---

## Testing Checklist

Before your first party, test these features:

- [ ] App loads on Pi (`http://<pi-ip>:3001`)
- [ ] App loads on mobile devices on same network
- [ ] Enter host mode with PIN
- [ ] Create a new party
- [ ] Create a bet (yes/no and multi-option)
- [ ] Place wagers from multiple devices
- [ ] Verify real-time updates appear on all devices
- [ ] Close betting on an open bet
- [ ] Settle a bet and verify payout calculations
- [ ] View settlement summary
- [ ] Sound effect plays when placing wager
- [ ] Confetti shows for winners
- [ ] Refresh page - state persists
- [ ] Reboot Pi - app auto-starts with PM2

---

## Need Help?

### Check Logs
```bash
# PM2 logs
pm2 logs place-a-bet --lines 100

# System logs
journalctl -u pm2-pi
```

### Common Issues

#### 1. Module Not Found Errors
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module './websocket/events'
```
**Solution**: The built files are missing `.js` extensions. Rebuild on Mac with latest code and transfer again.

#### 2. Cannot Find Package 'drizzle-orm'
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'drizzle-orm'
```
**Solution**: Run `npm install --omit=dev` on the Pi. If still failing, run `npm install` (without --omit=dev).

#### 3. Database Directory Does Not Exist
```
TypeError: Cannot open database because the directory does not exist
```
**Solution**: Make sure `.env` file exists in the root directory. The migration script will auto-create the directory.
```bash
cd ~/code/place-a-bet
cp .env.example .env
nano .env  # Set your HOST_PIN
npm run db:migrate:prod --workspace=server
pm2 restart place-a-bet
```

#### 4. Duplicate PM2 Processes
Multiple "place-a-bet" entries showing in `pm2 status`.

**Solution**:
```bash
pm2 delete 1  # Delete by ID
pm2 delete 2
pm2 start npm --name "place-a-bet" -- run start:prod
pm2 save
```

#### 5. Port 3001 Already in Use
**Solution**: Change `PORT` in `.env` to 3002, or stop the other process

#### 6. Database Locked
**Solution**: Make sure only one instance is running (`pm2 status`), delete duplicates

#### 7. Node Version Wrong
**Solution**: Run `nvm use 20` on the Pi

---

## Summary

**Quick Deployment Checklist**:

### On Your Mac:
1. ✅ Install dependencies: `npm install`
2. ✅ Generate migrations: `npm run db:generate --workspace=server`
3. ✅ Build for production: `npm run build:prod`
4. ✅ Transfer to Pi: `rsync -avz --exclude 'node_modules' ... jesse@<pi-ip>:~/code/place-a-bet/`

### On Raspberry Pi:
5. ✅ Install Raspberry Pi OS + Node.js v20
6. ✅ Install production dependencies: `npm install --omit=dev`
7. ✅ Configure `.env` in root: `cp .env.example .env` (set `HOST_PIN`)
8. ✅ Run migrations: `npm run db:migrate:prod --workspace=server`
9. ✅ Start with PM2: `pm2 start npm --name "place-a-bet" -- run start:prod`
10. ✅ Configure auto-start: `pm2 startup` + `pm2 save`
11. ✅ Access from network: `http://<pi-ip>:3001`

**The app is now running and ready for your party!** 🎲

**Common Deployment Paths**:
- Project on Pi: `~/code/place-a-bet/`
- Database: `~/code/place-a-bet/server/data/place-a-bet.db`
- Migrations: `~/code/place-a-bet/server/drizzle/`
- Config: `~/code/place-a-bet/server/.env`

---

**Document Version**: 2.2
**Last Updated**: 2026-02-07
**Tested On**: Raspberry Pi 4 with Node.js v20.20.0
**Build Strategy**: Build on Mac, deploy to Pi

**Recent Updates (v2.2)**:
- **MAJOR FIX**: Environment variables now load before database connection
- Added `dotenv.config()` to `db/index.ts` to fix loading order issues
- Migration script now uses absolute paths and auto-creates directories
- Simplified `.env` configuration - `DATABASE_URL` is now optional
- Default database path is `server/data/place-a-bet.db` (relative to compiled code)
- `.env` file must be in project root, not in `server/` subdirectory
- Updated `.env.example` with clearer instructions
- Removed manual `mkdir` step (migration handles it automatically)
