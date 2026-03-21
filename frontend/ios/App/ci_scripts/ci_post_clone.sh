#!/bin/sh
set -e

# Install Node.js directly via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install and use Node.js LTS
nvm install --lts
nvm use --lts

# Navigate to frontend
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"

# Install dependencies
npm install

# Sync Capacitor
npx cap sync ios
