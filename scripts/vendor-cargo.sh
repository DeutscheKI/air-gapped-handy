#!/usr/bin/env bash
# Regenerate vendor/cargo from Cargo.lock so the Rust build runs offline.
#
# .cargo/config.toml replaces crates.io and every git dependency with the
# vendor/cargo directory and sets net.offline, so this is the only step that
# is allowed to reach the network. Run it after any change to
# src-tauri/Cargo.toml or Cargo.lock, then commit vendor/cargo together with
# the lockfile. `cargo vendor` also prints the [source] table that must match
# the one in .cargo/config.toml; diff it if the git dependencies changed.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

# net.offline in .cargo/config.toml would block the registry fetches that
# vendoring itself needs, so override it for this one command.
CARGO_NET_OFFLINE=false cargo vendor \
  --manifest-path src-tauri/Cargo.toml \
  --locked \
  --versioned-dirs \
  vendor/cargo

echo
echo "Vendored $(ls vendor/cargo | wc -l) crates into vendor/cargo ($(du -sh vendor/cargo | cut -f1))."
