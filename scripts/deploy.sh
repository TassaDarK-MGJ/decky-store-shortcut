#!/usr/bin/env bash
# Build and install the plugin into the local Decky Loader (design doc, section 13.4).
# Copies (never symlinks): the loader may chown/chmod the plugin folder.
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/home/linuxbrew/.linuxbrew/opt/node@24/bin:$PATH"

NAME=$(node -p 'require("./plugin.json").name.replace(/ /g, "-")')
DEST="$HOME/homebrew/plugins/$NAME"

pnpm run build

FILES=(dist main.py plugin.json package.json LICENSE README.md)
[ -d py_modules ] && FILES+=(py_modules)

sudo mkdir -p "$DEST"
sudo rsync -a --delete "${FILES[@]}" "$DEST/"
echo "Installed to $DEST"

if [ "${1:-}" != "--no-restart" ]; then
  # Reloads every plugin, not only ours.
  sudo systemctl restart plugin_loader
  echo "plugin_loader restarted"
fi
