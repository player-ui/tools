#!/bin/sh

# Define a function to log steps
log_step() {
  echo "\033[1;34m==>\033[0m \033[1m$1\033[0m"
}

# Define the directories
ROOT_DIR=$(git rev-parse --show-toplevel)
BAZEL_OUT_DIR="$ROOT_DIR/bazel-out/darwin-fastbuild/bin"
TEST_ENV_DIR="$ROOT_DIR/devtools/plugins/desktop/test-env"
DEST_DIR="$HOME/Desktop/browser-devtools"

# Define Verdaccio registry
VERDACCIO_REGISTRY="http://localhost:4873"

# Define Plugins to test
PLUGINS=("@player-tools/devtools-basic-web-plugin")

# Define browser-devtools depenedencies
BROWSER_DEVTOOLS_DEPS=("@player-ui/pubsub-plugin" "dequal" "@player-tools/devtools-client@0.0.0-PLACEHOLDER" "@player-tools/devtools-messenger@0.0.0-PLACEHOLDER" "@player-tools/devtools-types@0.0.0-PLACEHOLDER")

# Run publish-to-verdaccio.sh
log_step "Running publish-to-verdaccio.sh..."
sh "$ROOT_DIR/scripts/publish-to-verdaccio.sh"

# Go to the test environment directory and install dependencies
log_step "Installing test-env dependencies..."
cd "$TEST_ENV_DIR" && pnpm i --registry $VERDACCIO_REGISTRY --link-workspace-packages=false

# Install the plugins from Verdaccio
for PLUGIN in "${PLUGINS[@]}"; do
  pnpm add $PLUGIN --registry $VERDACCIO_REGISTRY --link-workspace-packages=false
done

# Change the owner of the old browser-devtools directory on the Desktop to the current user
if [ -d "$DEST_DIR" ]; then
  log_step "Changing owner of old browser-devtools directory on the Desktop to the current user..."
  chown -R $(whoami) "$DEST_DIR"
fi

# Remove old browser-devtools directory if it exists
if [ -d "$DEST_DIR" ]; then
  log_step "Removing old browser-devtools directory on the Desktop..."
  rm -rf "$DEST_DIR"
fi

# Clone the browser-devtools repository
log_step "Cloning browser-devtools repository..."
cd ~/Desktop && git clone git@github.com:player-ui/browser-devtools.git

# Install browser-devtools dependencies
log_step "Installing browser devtools extension dependencies..."
cd "$DEST_DIR" && pnpm i --registry $VERDACCIO_REGISTRY

# Install the plugins from Verdaccio
for DEPS in "${BROWSER_DEVTOOLS_DEPS[@]}"; do
  pnpm add $DEPS --registry $VERDACCIO_REGISTRY
done

# Run the commands concurrently
log_step "Running commands concurrently..."
concurrently --kill-others "cd $DEST_DIR && pnpm inject:chrome" "cd $TEST_ENV_DIR && pnpm dev --host"
