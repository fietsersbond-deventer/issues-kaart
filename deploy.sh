#!/bin/bash -x

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
rsync -avz --delete --exclude='node_modules' .output/server/ "$DEPLOYMENT_TARGET/server/"
rsync -avz .output/public/ "$DEPLOYMENT_TARGET/public/"
rsync -avz .output/nitro.json "$DEPLOYMENT_TARGET/nitro.json"

# Sync migration files and script to remote
rsync -avz server/database/ "$DEPLOYMENT_TARGET/server/database/"

# echo "Running database migrations on remote..."
# ssh "${DEPLOYMENT_TARGET%%:*}" "cd ${DEPLOYMENT_TARGET##*:} && node --import tsx/esm server/database/runMigrations.ts"

# ssh runs a non-interactive shell, which skips ~/.bashrc (and thus nvm) by default, so source nvm explicitly
NVM_INIT='export NVM_DIR="$HOME/.nvm"; [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"'

echo "Installing production server dependencies on remote..."
ssh "${DEPLOYMENT_TARGET%%:*}" "$NVM_INIT; cd ${DEPLOYMENT_TARGET##*:}/server && pnpm install --prod"

echo "Restarting PM2 on remote..."
ssh "${DEPLOYMENT_TARGET%%:*}" "$NVM_INIT; pm2 restart all"

echo "Deployment and restart complete."
