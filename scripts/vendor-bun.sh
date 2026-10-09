#!/usr/bin/env bash
# Populate vendor/bun, the committed bun package cache, from bun.lock.
#
# The root bunfig.toml points bun's cache at vendor/bun and sets offline, so a
# normal `bun install` never touches the network. This script is the only
# step that may: it installs with the online config in scripts/bunfig-online.toml
# (bun has no way to override `offline` from the environment or the command
# line, only a whole replacement config) into that cache, then proves the
# result is self-sufficient by reinstalling with the normal config. Run after
# any change to package.json or bun.lock and commit vendor/bun with the lockfile.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

# node_modules must go too: bun skips an install whose node_modules already
# matches the lockfile, and a skipped install downloads nothing into the cache.
rm -rf vendor/bun node_modules
bun install --config=scripts/bunfig-online.toml --frozen-lockfile \
  --registry https://registry.npmjs.org/ --cache-dir vendor/bun

echo
echo "Verifying that node_modules can be rebuilt offline from vendor/bun"
rm -rf node_modules
bun install

echo
echo "Vendored $(find vendor/bun -maxdepth 1 -mindepth 1 | wc -l) cache entries into vendor/bun ($(du -sh vendor/bun | cut -f1))."
