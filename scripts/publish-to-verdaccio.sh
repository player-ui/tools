#!/bin/sh -e

# Define a function to log steps
log_step() {
  echo "\033[1;34m==>\033[0m \033[1m$1\033[0m"
}

# Define the root directory of the monorepo
ROOT_DIR=$(git rev-parse --show-toplevel)

# Define the directories
BAZEL_OUT_DIR="$ROOT_DIR/bazel-bin"

# Define Verdaccio storage directory
VERDACCIO_STORAGE_DIR="$HOME/.local/share/verdaccio/storage"

# Define Verdaccio registry and user credentials
VERDACCIO_REGISTRY="http://localhost:4873"
VERDACCIO_USER="test"
VERDACCIO_PASSWORD="test"
VERDACCIO_EMAIL="test@test.com"

log_step "Environment checks..."
# Define the required Node.js and pnpm versions
REQUIRED_NODE_VERSION=$(jq -r '.engines.node' "$ROOT_DIR/package.json")
REQUIRED_PNPM_VERSION=$(jq -r '.engines.pnpm' "$ROOT_DIR/package.json")

# Check the current Node.js and pnpm versions
CURRENT_NODE_VERSION=$(node -v)
CURRENT_PNPM_VERSION=$(pnpm -v)

# Install Node.js and pnpm if the versions don't match
if [ "$CURRENT_NODE_VERSION" != "$REQUIRED_NODE_VERSION" ]; then
  log_step "Installing Node.js $REQUIRED_NODE_VERSION..."
  volta install node@"$REQUIRED_NODE_VERSION"
fi

if [ "$CURRENT_PNPM_VERSION" != "$REQUIRED_PNPM_VERSION" ]; then
  log_step "Installing pnpm $REQUIRED_PNPM_VERSION..."
  volta install pnpm@"$REQUIRED_PNPM_VERSION"
fi

# Check if Verdaccio is installed
if ! command -v verdaccio &> /dev/null; then
  log_step "Verdaccio not found, installing..."
  pnpm install -g verdaccio
fi

# Go to the root directory and install dependencies
log_step "Installing root dependencies..."
cd "$ROOT_DIR" && pnpm i

# Build local packages
log_step "Bulding local packages..."
bazel build //...

# Check if Verdaccio is running
if pgrep -if "verdaccio" > /dev/null; then
  log_step "Verdaccio is already running, skipping start and clean up..."
else
  # Clean Verdaccio database
  if [ -d "$VERDACCIO_STORAGE_DIR" ]; then
    log_step "Cleaning Verdaccio database..."
    rm -rf "$VERDACCIO_STORAGE_DIR"
  fi

  # Start Verdaccio
  log_step "Starting Verdaccio..."
  nohup verdaccio > verdaccio.log 2>&1 &
  # Wait for Verdaccio to start
  sleep 10
fi

# Check if user is already registered
if ! curl -s -u $VERDACCIO_USER:$VERDACCIO_PASSWORD $VERDACCIO_REGISTRY/-/user/org.couchdb.user:$VERDACCIO_USER > /dev/null 2>&1; then
  # Add user to Verdaccio
  log_step "Adding user to Verdaccio..."
  expect -c "
  spawn pnpm adduser --registry $VERDACCIO_REGISTRY
  expect \"Username:\"
  send \"$VERDACCIO_USER\r\"
  expect \"Password:\"
  send \"$VERDACCIO_PASSWORD\r\"
  expect \"Email: (this IS public)\"
  send \"$VERDACCIO_EMAIL\r\"
  expect eof
  "
else
  # Log out and log back in to refresh the token
  log_step "Logging out and back in to refresh the token..."
  pnpm logout --registry $VERDACCIO_REGISTRY
  expect -c "
  spawn pnpm login --registry $VERDACCIO_REGISTRY
  expect \"Username:\"
  send \"$VERDACCIO_USER\r\"
  expect \"Password:\"
  send \"$VERDACCIO_PASSWORD\r\"
  expect eof
  "
fi

# Get the packages from pnpm-workspace.yaml
PACKAGES=$(sed -n -e 's/^.*- "\(.*\)".*$/\1/p' "$ROOT_DIR/pnpm-workspace.yaml")

# Convert the packages to the Bazel output directory format
PACKAGES=($(for pkg in $PACKAGES; do echo "$BAZEL_OUT_DIR/${pkg}/${pkg##*/}"; done))

# Publish the packages to Verdaccio
log_step "Publishing local packages to Verdaccio..."
for PACKAGE in "${PACKAGES[@]}"; do
  cd "$PACKAGE"
  npm publish --registry $VERDACCIO_REGISTRY --no-git-checks
done
