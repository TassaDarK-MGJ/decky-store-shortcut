#!/usr/bin/env bash
# Build the release zip: one top-level folder with the same files deploy.sh installs
# (template README, "Distribution"). Output: out/<Name>-v<version>.zip
set -euo pipefail

cd "$(dirname "$0")/.."
export PATH="/home/linuxbrew/.linuxbrew/opt/node@24/bin:$PATH"

NAME=$(node -p 'require("./plugin.json").name.replace(/ /g, "-")')
VERSION=$(node -p 'require("./package.json").version')

pnpm run build

FILES=(dist main.py plugin.json package.json LICENSE README.md)
[ -d py_modules ] && FILES+=(py_modules)

STAGE=$(mktemp -d)
trap 'rm -rf "$STAGE"' EXIT
mkdir "$STAGE/$NAME"
cp -r "${FILES[@]}" "$STAGE/$NAME/"

mkdir -p out
ZIP="$PWD/out/$NAME-v$VERSION.zip"
rm -f "$ZIP"
(cd "$STAGE" && zip -qr "$ZIP" "$NAME")
echo "$ZIP"
