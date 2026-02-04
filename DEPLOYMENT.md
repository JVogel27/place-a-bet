# Place-A-Bet - Deployment Guide

This guide provides step-by-step instructions for deploying Place-A-Bet to a Raspberry Pi for production use.

---

## Prerequisites

### Hardware Requirements
- **Raspberry Pi 3+ or newer** (Pi 4/5 recommended for better performance)
- **MicroSD card** (16GB or larger)
- **Power supply** for Raspberry Pi
- **Network connection** (Ethernet or WiFi)

### Software Requirements
- **Raspberry Pi OS** (Bullseye or newer)
- **Node.js v20 LTS** (will be installed below)
- **Git** (for cloning the repository)

---

## Step 1: Prepare the Raspberry Pi

### 1.1 Install Raspberry Pi OS
1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Flash Raspberry Pi OS (64-bit recommended) to your SD card
3. Boot up the Pi and complete initial setup
4. Enable SSH if you want remote access:
   ```bash
   sudo raspi-config
   # Navigate to Interface Options > SSH > Enable
   ```

### 1.2 Update System Packages
```bash
sudo apt update
sudo apt upgrade -y
```

### 1.3 Install Node.js v20
```bash
# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell configuration
source ~/.bashrc

# Install Node.js v20 LTS
nvm install 20
nvm use 20
nvm alias default 20

# Verify installation
node --version  # Should output: v20.x.x
npm --version   # Should output: v10.x.x or higher
```

---

## Step 2: Transfer the Application to Raspberry Pi

### Option A: Clone from Git Repository
```bash
# If your code is in a git repository
cd ~
git clone <your-repository-url> place-a-bet
cd place-a-bet
```

### Option B: Transfer via rsync (from your development machine)
```bash
# From your development machine (replace <pi-ip> with Pi's IP address)
rsync -avz --exclude 'node_modules' --exclude '.git' \
  /Users/jesse/code/pi-projects/place-a-bet/ \
  pi@<pi-ip>:~/place-a-bet/
```

### Option C: Transfer via SCP
```bash
# From your development machine
scp -r /Users/jesse/code/pi-projects/place-a-bet pi@<pi-ip>:~/
```

---

## Step 3: Install Dependencies

```bash
# Navigate to project directory
cd ~/place-a-bet

# Ensure Node.js v20 is active
nvm use 20

# Install dependencies for all workspaces
npm install
```

---

## Step 4: Configure Environment Variables

### 4.1 Create Production .env File
```bash
# Copy example env file
cp .env.example .env

# Edit the file
nano .env
```

### 4.2 Set Production Values
```env
# Server Configuration
NODE_ENV=production
PORT=3000

# Host Authentication
HOST_PIN=1234  # Change this to your desired 4-digit PIN

# CORS Configuration (optional - restrict to your local network)
CORS_ORIGIN=*

# Database (SQLite - file will be created automatically)
# Database will be stored at: ./server/data/place-a-bet.db
```

**Important**: Change the `HOST_PIN` to a secure 4-digit number. This protects host-only actions like creating parties and settling bets.

---

## Step 5: Run Database Migrations

```bash
# Generate migrations (if not already done)
npm run db:generate --workspace=server

# Run migrations to create database tables
npm run db:migrate --workspace=server
```

This will create the SQLite database at `./server/data/place-a-bet.db`.

---

## Step 6: Build for Production

```bash
# Build client and server, then copy client files to server/dist/public
npm run build:prod
```

This command:
1. Builds the React frontend (`client/dist/`)
2. Compiles TypeScript server code (`server/dist/`)
3. Copies client build to `server/dist/public/`

**Verify the build**:
```bash
ls -la server/dist/public/  # Should see index.html, assets/, etc.
ls -la server/dist/         # Should see index.js and other compiled files
```

---

## Step 7: Install and Configure PM2

PM2 is a process manager that keeps your app running and restarts it on crashes or reboots.

### 7.1 Install PM2 Globally
```bash
npm install -g pm2
```

### 7.2 Start the Application with PM2
```bash
# Start the app
cd ~/place-a-bet
pm2 start npm --name "place-a-bet" -- run start:prod

# View logs
pm2 logs place-a-bet

# Check status
pm2 status
```

### 7.3 Configure Auto-Start on Boot
```bash
# Save current PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions shown (you'll need to run a command with sudo)
# It will look something like:
# sudo env PATH=$PATH:/home/pi/.nvm/versions/node/v20.x.x/bin pm2 startup systemd -u pi --hp /home/pi
```

---

## Step 8: Access the Application

### 8.1 Find Your Pi's IP Address
```bash
hostname -I
# Example output: 192.168.1.100
```

### 8.2 Access from Browser
On any device connected to the same network:
```
http://<pi-ip-address>:3000
```

Example: `http://192.168.1.100:3000`

### 8.3 Test the Application
1. Open the URL in your browser
2. You should see the Place-A-Bet interface
3. Enter host mode (default PIN: 1234 unless you changed it)
4. Create a test party
5. Create a test bet
6. Place a wager from another device
7. Verify real-time updates work

---

## Step 9: Optional - Use Port 80 (No Port Number in URL)

If you want to access the app as `http://<pi-ip>` instead of `http://<pi-ip>:3000`:

### Option A: Port Forwarding with iptables
```bash
# Redirect port 80 to 3000
sudo iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-port 3000

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

## Managing the Application

### PM2 Commands
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

### Update Application Code
```bash
# Pull latest changes (if using git)
cd ~/place-a-bet
git pull

# Or transfer new files via rsync/scp

# Install new dependencies (if package.json changed)
npm install

# Rebuild
npm run build:prod

# Restart with PM2
pm2 restart place-a-bet
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

# Check if port 3000 is already in use
sudo lsof -i :3000

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
sudo ufw allow 3000

# Verify Pi's IP address
hostname -I

# Test from Pi itself
curl http://localhost:3000/health
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

- [ ] App loads on Pi (`http://<pi-ip>:3000`)
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
1. **Port 3000 in use**: Change `PORT` in `.env` to 3001
2. **Database locked**: Make sure only one instance is running (`pm2 status`)
3. **Build files missing**: Re-run `npm run build:prod`
4. **Node version wrong**: Run `nvm use 20`

---

## Summary

**Deployment Steps**:
1. ✅ Prepare Raspberry Pi (OS + Node.js v20)
2. ✅ Transfer application files
3. ✅ Install dependencies (`npm install`)
4. ✅ Configure `.env` (set `HOST_PIN`)
5. ✅ Run migrations (`npm run db:migrate`)
6. ✅ Build production bundle (`npm run build:prod`)
7. ✅ Start with PM2 (`pm2 start npm --name "place-a-bet" -- run start:prod`)
8. ✅ Configure auto-start (`pm2 startup` + `pm2 save`)
9. ✅ Access from network (`http://<pi-ip>:3000`)

**The app is now running and ready for your party!** 🎲

---

**Document Version**: 1.0
**Last Updated**: 2026-02-04
**Tested On**: Raspberry Pi 4 with Node.js v20.20.0
