#!/bin/sh
set -e

# Navigate to frontend root
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"

# Install npm dependencies
npm install

# Sync Capacitor
npx cap sync ios
