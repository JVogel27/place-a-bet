#!/bin/bash

# Setup script for Place-A-Bet project
# This ensures we use Node v20 LTS

echo "🎲 Setting up Place-A-Bet..."

# Load nvm if available
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  source "$HOME/.nvm/nvm.sh"
fi

# Check if Node v20 is installed
if ! nvm list | grep -q "v20"; then
  echo "📦 Installing Node v20..."
  nvm install 20
fi

# Use Node v20
echo "🔄 Switching to Node v20..."
nvm use 20

# Verify version
echo "✅ Using Node $(node --version)"

# Clean any existing installs
if [ -d "node_modules" ]; then
  echo "🧹 Cleaning old node_modules..."
  rm -rf node_modules package-lock.json
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
  echo "✅ Dependencies installed successfully!"
  echo ""
  echo "Next steps:"
  echo "1. Copy .env.example to .env"
  echo "2. Run 'npm run db:generate' in the server directory"
  echo "3. Run 'npm run db:migrate' in the server directory"
  echo "4. Run 'npm run dev' to start development"
else
  echo "❌ Failed to install dependencies"
  exit 1
fi
