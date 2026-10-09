#!/usr/bin/env bash
# Fetch the prebuilt ONNX Runtime that Linux builds link against dynamically.
#
# ort-sys would otherwise download its own runtime at compile time, which makes
# the build depend on network access and on whatever pyke publishes that day.
# Pinning one tarball here keeps the build reproducible and lets the deb ship
# exactly the library the binary was linked against. .cargo/config.toml points
# ORT_LIB_LOCATION at the unpacked lib/ dir; tauri.conf.json maps the .so into
# /usr/lib/Handy in the deb.
#
# Idempotent: re-running with the right version already unpacked is a no-op.
set -euo pipefail

ORT_VERSION="1.24.2"
ORT_SHA256="7e8062d5cda514fe3e31d805f9aabd50bed42d331994f66753d2dd697294b976"
ORT_URL="https://blob.handy.computer/onnxruntime-linux-x86_64-${ORT_VERSION}.tgz"

dest="$(cd "$(dirname "$0")/.." && pwd)/src-tauri/onnxruntime"
marker="$dest/.version"

if [ -f "$marker" ] && [ "$(cat "$marker")" = "$ORT_VERSION" ]; then
  echo "ONNX Runtime $ORT_VERSION already present in $dest"
  exit 0
fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Fetching ONNX Runtime $ORT_VERSION"
curl -sSL --fail -o "$tmp/ort.tgz" "$ORT_URL"
echo "$ORT_SHA256  $tmp/ort.tgz" | sha256sum --check --quiet

rm -rf "$dest"
mkdir -p "$dest"
# The tarball is produced on macOS: drop its AppleDouble "._*" sidecar files.
tar xzf "$tmp/ort.tgz" --strip-components=1 -C "$dest" --exclude='._*' 2>/dev/null

# The deb bundler copies files, not symlinks: make every alias a real file so
# libonnxruntime.so.1 (the SONAME the binary needs) is a complete library.
for f in "$dest"/lib/libonnxruntime.so*; do
  if [ -L "$f" ]; then
    cp -L "$f" "$f.real" && mv "$f.real" "$f"
  fi
done

echo "$ORT_VERSION" > "$marker"
echo "ONNX Runtime $ORT_VERSION unpacked into $dest"
