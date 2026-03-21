#!/bin/sh
set -e

echo "Current directory: $(pwd)"
echo "CI_PRIMARY_REPOSITORY_PATH: $CI_PRIMARY_REPOSITORY_PATH"

# Navigate to frontend root
cd "$CI_PRIMARY_REPOSITORY_PATH/frontend"

echo "Now in: $(pwd)"
echo "Files here: $(ls)"

# Install npm dependencies
npm install

# Sync Capacitor iOS
npx cap sync ios
