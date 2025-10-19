#!/bin/bash

# Deployment script for fietsersbond app
# Usage: DEPLOYMENT_TARGET=user@host:/path/to/deploy ./deploy.sh

set -e

. ./.env

if [ -z "$DEPLOYMENT_TARGET" ]; then
  echo "DEPLOYMENT_TARGET environment variable is not set."
  exit 1
fi


npm run build

# Update package.json on remote
rsync -avz package.json "$DEPLOYMENT_TARGET/package.json"


# Update .output contents on remote (server/, public/, nitro.json), excluding server/node_modules
rsync -avz --exclude='node_modules' .output/server/ "$DEPLOYMENT_TARGET/server/"
rsync -avz .output/public/ "$DEPLOYMENT_TARGET/public/"
rsync -avz .output/nitro.json "$DEPLOYMENT_TARGET/nitro.json"

echo "Restarting PM2 on remote..."
ssh "${DEPLOYMENT_TARGET%%:*}" "/home/fietsersbond/.nvm/versions/node/v22.20.0/bin/pm2 restart fietsersbond"

echo "Deployment and restart complete."
