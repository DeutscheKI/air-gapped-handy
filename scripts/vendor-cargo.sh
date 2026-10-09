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

# ferrous-opencc's build script runs cbindgen, which runs `cargo metadata` on
# the crate itself, and that obeys the Cargo.lock shipped inside the crate.
# The shipped lock pins versions that are not in vendor/cargo (for example an
# older anyhow), so offline builds fail to resolve. Re-lock the crate against
# the vendored tree and update its checksum manifest so cargo still accepts it.
#
# The same cbindgen run rewrites the crate's opencc.h on every build (a C
# header nothing here consumes), so that file is dropped from the checksum
# manifest and deleted; .gitignore hides the regenerated copy.
for crate in vendor/cargo/ferrous-opencc-*/; do
  rm -f "$crate/Cargo.lock" "$crate/opencc.h"
  cargo metadata --offline --format-version 1 \
    --manifest-path "$crate/Cargo.toml" > /dev/null
  python3 -I - "$crate" <<'PY'
import hashlib, json, sys
crate = sys.argv[1]
manifest = f"{crate}/.cargo-checksum.json"
data = json.load(open(manifest))
data["files"]["Cargo.lock"] = hashlib.sha256(open(f"{crate}/Cargo.lock", "rb").read()).hexdigest()
data["files"].pop("opencc.h", None)
json.dump(data, open(manifest, "w"), separators=(",", ":"))
PY
  echo "Re-locked $crate against vendor/cargo"
done

echo
echo "Vendored $(ls vendor/cargo | wc -l) crates into vendor/cargo ($(du -sh vendor/cargo | cut -f1))."
