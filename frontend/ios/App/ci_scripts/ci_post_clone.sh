#!/bin/sh
set -e

# Install Homebrew if not available
if ! command -v brew &> /dev/null; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Install Node.js via Homebrew
brew install node

# Navigate to frontend
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"

# Install dependencies
npm install

# Sync Capacitor
npx cap sync ios
